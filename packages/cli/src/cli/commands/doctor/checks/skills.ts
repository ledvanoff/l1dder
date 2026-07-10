import type { FileSystemPort } from '@l1dder/core';
import type { ParsedSkill } from '@l1dder/core';
import { parseSkill, validateSkillRegistry } from '@l1dder/knowledge';
import type { State } from '@l1dder/schemas';
import { join } from 'node:path';
import type { DoctorCheck } from '../types.js';

/** Extra options for the `skills` section (Iteration 6, T-06/T-09). */
export interface CheckSkillsOptions {
  /** Current state.yml snapshot — enables E5 health aggregation from `skillRuns[]`. */
  readonly state?: State;
}

const SKILL_DIRS = [
  { path: 'skills/built-in', category: 'builtin' as const },
  { path: 'skills/custom', category: 'custom' as const },
];

/**
 * Full SK10 skill validation (Iteration 6, T-06) + E5 health aggregation (T-09).
 *
 * Parses each `.md` file under `skills/built-in/` and `skills/custom/`
 * individually (tolerating per-file parse failures as fixable warnings, like
 * the previous `hasValidFrontMatter()` check) and runs the successfully
 * parsed, *non-deduplicated* skills through `validateSkillRegistry()` — the
 * full SK10 checks: duplicate id, duplicate auto-trigger per phase, missing
 * keywords, format_version mismatch. Supersedes the simplified front-matter
 * check previously embedded in the `standards` section.
 *
 * With `options.state`, additionally aggregates `skillRuns[]` telemetry into
 * a per-skill health check (warn on any recorded failure).
 */
export async function checkSkills(
  fs: FileSystemPort,
  projectRoot: string,
  options: CheckSkillsOptions = {},
): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];
  const parsedSkills: ParsedSkill[] = [];
  let anyDirFound = false;

  for (const dir of SKILL_DIRS) {
    const dirPath = join(projectRoot, dir.path);

    let files: readonly string[];
    try {
      files = await fs.readDir(dirPath);
    } catch {
      continue;
    }
    anyDirFound = true;

    for (const file of files.filter((f) => f.endsWith('.md'))) {
      const filePath = join(dir.path, file);
      const content = await fs.readFile(join(projectRoot, filePath));
      const result = parseSkill(filePath, content, dir.category);

      if (result.ok) {
        parsedSkills.push(result.value);
      } else {
        checks.push({
          id: `skill-format-${file}`,
          level: 'warn',
          message: `${filePath}: ${result.error.message}`,
          fixable: true,
        });
      }
    }
  }

  if (!anyDirFound) {
    return [
      {
        id: 'skills-dir',
        level: 'warn',
        message: 'skills/built-in/ directory not found',
        hint: "Run 'l1dder init' to create skill files",
      },
    ];
  }

  if (parsedSkills.length === 0 && checks.length === 0) {
    checks.push({ id: 'skills-empty', level: 'warn', message: 'No skill files found in skills/built-in/ or skills/custom/' });
  }

  if (parsedSkills.length > 0) {
    const result = validateSkillRegistry(parsedSkills);

    for (const error of result.errors) {
      checks.push({ id: `skills-error-${slug(error.skillId)}`, level: 'fail', message: error.message });
    }

    for (const warning of result.warnings) {
      const isFormatVersion = warning.message.includes('format_version');
      checks.push({
        id: isFormatVersion ? `skill-format-version-${slug(warning.skillId)}` : `skills-warning-${slug(warning.skillId)}`,
        level: 'warn',
        message: warning.message,
        ...(isFormatVersion ? { fixable: true } : {}),
      });
    }

    if (result.errors.length === 0 && result.warnings.length === 0 && checks.length === 0) {
      checks.push({ id: 'skills-valid', level: 'pass', message: `All ${String(parsedSkills.length)} skill(s) valid (SK10)` });
    }
  }

  if (options.state) {
    checks.push(...checkSkillHealth(options.state));
  }

  return checks;
}

/**
 * E5 health aggregation (T-09): flags any skill with at least one recorded
 * `failure` outcome in `state.skillRuns[]`. Mechanical fact only — no
 * interpretation of *why* a skill failed (that's `hygiene-audit`'s job).
 */
function checkSkillHealth(state: State): DoctorCheck[] {
  const runs = state.skillRuns;
  if (runs.length === 0) return [];

  const bySkill = new Map<string, { success: number; failure: number }>();
  for (const run of runs) {
    const counts = bySkill.get(run.skillId) ?? { success: 0, failure: 0 };
    counts[run.outcome === 'failure' ? 'failure' : 'success']++;
    bySkill.set(run.skillId, counts);
  }

  const checks: DoctorCheck[] = [];
  for (const [skillId, counts] of bySkill) {
    if (counts.failure === 0) continue;
    const total = counts.success + counts.failure;
    checks.push({
      id: `skills-health-${slug(skillId)}`,
      level: 'warn',
      message: `${skillId}: ${String(counts.failure)}/${String(total)} recorded run(s) failed`,
      hint: 'Review recent skillRuns[] entries for this skill',
    });
  }

  return checks;
}

function slug(value: string): string {
  return value.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
}
