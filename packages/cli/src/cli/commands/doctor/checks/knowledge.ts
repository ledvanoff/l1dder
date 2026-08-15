import type { FileSystemPort, ShellPort } from '@l1dder/core';
import { detectStructuralDrift } from '@l1dder/core';
import { isSkeletonFile } from '@l1dder/state';
import type { ProjectStage } from '@l1dder/schemas';
import { join } from 'node:path';
import type { DoctorCheck } from '../types.js';

/** Knowledge document base names compared as-is↔to-be under `--deep` (T-04). */
const KNOWLEDGE_PAIRS = ['architecture', 'erd', 'usecases', 'integrations'] as const;

/** Extra options for `--deep` structural drift checks. */
export interface CheckKnowledgeOptions {
  readonly deep?: boolean;
  readonly shell?: ShellPort;
  /** Current Project Stage (DEC-6-5) — enables stage-aware drift interpretation. */
  readonly stage?: ProjectStage;
}

/**
 * Knowledge integrity checks: verifies knowledge files exist and are readable.
 *
 * With `options.deep`, additionally runs the structural as-is↔to-be drift
 * comparison (DEC-6-2) for each of `architecture`/`erd`/`usecases`/`integrations`
 * that exists on both sides — mechanical facts only (missing sections, stale
 * git timestamps, size gaps, broken `archive/design/*.md` cross-refs). Without `--deep`,
 * behavior is unchanged (back-compat).
 */
export async function checkKnowledge(
  fs: FileSystemPort,
  projectRoot: string,
  options: CheckKnowledgeOptions = {},
): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];

  const requiredKnowledge = [
    'knowledge/idea.md',
    'knowledge/roadmap.md',
  ];

  const optionalKnowledge = [
    'knowledge/to-be/architecture.md',
    'knowledge/to-be/erd.md',
    'knowledge/to-be/usecases.md',
    'knowledge/to-be/integrations.md',
    'knowledge/as-is/architecture.md',
    'knowledge/as-is/erd.md',
    'knowledge/as-is/usecases.md',
    'knowledge/as-is/integrations.md',
  ];

  for (const file of requiredKnowledge) {
    const exists = await fileExists(fs, join(projectRoot, file));
    if (exists) {
      checks.push({ id: `knowledge-${basename(file)}`, level: 'pass', message: `${file} exists` });
    } else {
      checks.push({
        id: `knowledge-${basename(file)}`,
        level: 'fail',
        message: `${file} missing (required)`,
        hint: `Create ${file} using the knowledge template`,
      });
    }
  }

  let optionalPresent = 0;
  for (const file of optionalKnowledge) {
    if (await fileExists(fs, join(projectRoot, file))) {
      optionalPresent++;
    }
  }

  if (optionalPresent === 0) {
    checks.push({
      id: 'knowledge-optional',
      level: 'warn',
      message: 'No to-be or as-is knowledge files found',
      hint: 'Consider populating knowledge/to-be/ during discovery',
    });
  } else {
    checks.push({
      id: 'knowledge-optional',
      level: 'pass',
      message: `${String(optionalPresent)}/${String(optionalKnowledge.length)} optional knowledge files present`,
    });
  }

  if (options.deep) {
    checks.push(...(await checkStructuralDrift(fs, projectRoot, options.shell, options.stage)));
  }

  return checks;
}

/**
 * `--deep` structural drift: compares each as-is/to-be knowledge pair that
 * exists on both sides via `@l1dder/core` `detectStructuralDrift`.
 *
 * Stage-aware interpretation (DEC-6-5): in the `discovery` stage, an as-is
 * document that is still a skeleton placeholder is expected — the pair is
 * skipped (reported as `pass`) instead of raising structural drift findings.
 */
async function checkStructuralDrift(
  fs: FileSystemPort,
  projectRoot: string,
  shell: ShellPort | undefined,
  stage: ProjectStage | undefined,
): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];
  const existingDesignFiles = await listDesignFiles(fs, projectRoot);

  for (const name of KNOWLEDGE_PAIRS) {
    const asIsRelPath = `knowledge/as-is/${name}.md`;
    const toBeRelPath = `knowledge/to-be/${name}.md`;

    const [asIsExists, toBeExists] = await Promise.all([
      fileExists(fs, join(projectRoot, asIsRelPath)),
      fileExists(fs, join(projectRoot, toBeRelPath)),
    ]);
    if (!asIsExists || !toBeExists) continue;

    const [asIsContent, toBeContent] = await Promise.all([
      fs.readFile(join(projectRoot, asIsRelPath)),
      fs.readFile(join(projectRoot, toBeRelPath)),
    ]);

    if (stage === 'discovery' && isSkeletonFile(asIsContent)) {
      checks.push({
        id: `knowledge-drift-${name}`,
        level: 'pass',
        message: `${name}: as-is is a discovery-stage placeholder — structural drift check skipped (expected)`,
      });
      continue;
    }

    const [asIsCommittedAt, toBeCommittedAt] = shell
      ? await Promise.all([
          gitLastCommitDate(shell, projectRoot, asIsRelPath),
          gitLastCommitDate(shell, projectRoot, toBeRelPath),
        ])
      : [undefined, undefined];

    const findings = detectStructuralDrift(
      {
        path: asIsRelPath,
        content: asIsContent,
        ...(asIsCommittedAt !== undefined ? { committedAt: asIsCommittedAt } : {}),
      },
      {
        path: toBeRelPath,
        content: toBeContent,
        ...(toBeCommittedAt !== undefined ? { committedAt: toBeCommittedAt } : {}),
      },
      { existingDesignFiles },
    );

    if (findings.length === 0) {
      checks.push({
        id: `knowledge-drift-${name}`,
        level: 'pass',
        message: `${name}: no structural drift between as-is and to-be`,
      });
      continue;
    }

    findings.forEach((finding, index) => {
      checks.push({
        id: `knowledge-drift-${name}-${String(index)}`,
        level: finding.level,
        message: `${name}: ${finding.reason}`,
        hint: `Review ${asIsRelPath} against ${toBeRelPath}`,
      });
    });
  }

  return checks;
}

async function listDesignFiles(fs: FileSystemPort, projectRoot: string): Promise<string[]> {
  try {
    // Tactical specs live in archive/design/. detectStructuralDrift extracts
    // `design/<name>.md` (also from `archive/design/<name>.md` paths), so the
    // list uses that form.
    const entries = await fs.readDir(join(projectRoot, 'archive/design'));
    return entries.filter((e) => e.endsWith('.md')).map((e) => `design/${e}`);
  } catch {
    return [];
  }
}

async function gitLastCommitDate(
  shell: ShellPort,
  projectRoot: string,
  relPath: string,
): Promise<string | undefined> {
  try {
    const result = await shell.exec(`git log -1 --format=%cI -- "${relPath}"`, {
      cwd: projectRoot,
      timeout: 10_000,
    });
    const date = result.stdout.trim();
    return date.length > 0 ? date : undefined;
  } catch {
    return undefined;
  }
}

async function fileExists(fs: FileSystemPort, path: string): Promise<boolean> {
  try {
    return await fs.exists(path);
  } catch {
    return false;
  }
}

function basename(path: string): string {
  return path.split('/').pop() ?? path;
}
