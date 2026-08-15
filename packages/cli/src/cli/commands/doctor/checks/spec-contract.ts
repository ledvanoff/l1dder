import { join } from 'node:path';

import type { FileSystemPort, SchemaIssueDetail } from '@l1dder/core';
import { parseSpecContract } from '@l1dder/knowledge';

import type { DoctorCheck } from '../types.js';

/** Stable doctor check / section id for feature-spec AI Contract validation. */
export const SPEC_CONTRACT_SECTION_ID = 'spec-contract' as const;

/**
 * Validate AI Contract blocks in project feature specs (`specs/<feature>/spec.md`).
 *
 * Behaviour:
 * - no `specs/` or no `spec.md` files → pass (missing specs are not an error
 *   outside delivery)
 * - legacy spec without `## AI Contract` → warn + migration hint
 * - present but malformed/incomplete contract → fail with structured `details`
 * - valid contract → pass
 *
 * @param fs - Filesystem port
 * @param projectRoot - Absolute project root
 */
export async function checkSpecContract(
  fs: FileSystemPort,
  projectRoot: string,
): Promise<DoctorCheck[]> {
  const specPaths = await listFeatureSpecPaths(fs, projectRoot);
  if (specPaths.length === 0) {
    return [
      {
        id: SPEC_CONTRACT_SECTION_ID,
        level: 'pass',
        message: 'No feature specs found (AI Contract check skipped)',
      },
    ];
  }

  const checks: DoctorCheck[] = [];
  for (const relPath of specPaths) {
    checks.push(await checkOneSpec(fs, projectRoot, relPath));
  }
  return checks;
}

/**
 * Validate a single relative `specs/<feature>/spec.md` path.
 */
async function checkOneSpec(
  fs: FileSystemPort,
  projectRoot: string,
  relPath: string,
): Promise<DoctorCheck> {
  const checkId = checkIdForPath(relPath);
  let content: string;
  try {
    content = await fs.readFile(join(projectRoot, relPath));
  } catch {
    return {
      id: checkId,
      level: 'pass',
      message: `${relPath}: unreadable (skipped)`,
    };
  }

  const parsed = parseSpecContract(content);
  if (parsed.ok) {
    return {
      id: checkId,
      level: 'pass',
      message: `${relPath}: AI Contract is valid (${parsed.value.features.join(', ')})`,
    };
  }

  if (parsed.error.code === 'SPEC_CONTRACT_MISSING') {
    return {
      id: checkId,
      level: 'warn',
      message: `${relPath}: legacy spec without AI Contract`,
      hint: migrationHint(relPath),
      details: [
        {
          path: relPath,
          code: parsed.error.code,
          message: parsed.error.message,
        },
      ],
    };
  }

  const details: SchemaIssueDetail[] =
    parsed.error.issues !== undefined && parsed.error.issues.length > 0
      ? parsed.error.issues.map((issue) => ({
          path: issue.path.length > 0 ? `${relPath}:${issue.path}` : relPath,
          message: issue.message,
          ...(issue.code !== undefined ? { code: issue.code } : {}),
        }))
      : [
          {
            path: relPath,
            code: parsed.error.code,
            message: parsed.error.message,
          },
        ];

  return {
    id: checkId,
    level: 'fail',
    message: `${relPath}: invalid AI Contract (${parsed.error.code})`,
    hint: 'Fix the ## AI Contract YAML block (feature, usecases, decisions, models, test_contracts)',
    details,
  };
}

/**
 * Discover `specs/<dir>/spec.md` files (non-recursive one level under `specs/`).
 */
async function listFeatureSpecPaths(
  fs: FileSystemPort,
  projectRoot: string,
): Promise<string[]> {
  const specsRoot = join(projectRoot, 'specs');
  let entries: readonly string[];
  try {
    if (!(await fs.exists(specsRoot))) {
      return [];
    }
    entries = await fs.readDir(specsRoot);
  } catch {
    return [];
  }

  const paths: string[] = [];
  for (const entry of entries) {
    if (entry.startsWith('.')) continue;
    const relPath = `specs/${entry}/spec.md`;
    try {
      if (await fs.exists(join(projectRoot, relPath))) {
        paths.push(relPath);
      }
    } catch {
      // ignore unreadable entries
    }
  }

  return paths.sort((a, b) => a.localeCompare(b));
}

/**
 * Stable check id derived from the feature directory name.
 */
function checkIdForPath(relPath: string): string {
  const match = /^specs\/([^/]+)\/spec\.md$/.exec(relPath);
  const dir = match?.[1] ?? 'unknown';
  return dir === 'current'
    ? SPEC_CONTRACT_SECTION_ID
    : `${SPEC_CONTRACT_SECTION_ID}-${dir}`;
}

/**
 * Actionable migration hint for legacy specs.
 */
function migrationHint(relPath: string): string {
  return (
    `Add a "## AI Contract" heading to ${relPath} with a fenced yaml block ` +
    'containing feature, usecases, decisions, models, and test_contracts ' +
    '(see packages/cli/assets/i18n/<lang>/templates/specs/spec-template.md). Pre-existing specs stay valid; ' +
    'there is no separate ai-spec.md file.'
  );
}
