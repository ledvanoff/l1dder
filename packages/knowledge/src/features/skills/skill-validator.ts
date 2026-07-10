import type { ParsedSkill } from '@l1dder/core';

/** A single validation issue found in the skill registry. */
export interface SkillValidationError {
  readonly skillId: string;
  readonly message: string;
}

/** A non-fatal validation warning. */
export interface SkillValidationWarning {
  readonly skillId: string;
  readonly message: string;
}

/** Result of skill registry validation (for `l1dder doctor`). */
export interface SkillValidationResult {
  readonly valid: boolean;
  readonly errors: readonly SkillValidationError[];
  readonly warnings: readonly SkillValidationWarning[];
}

/**
 * Validate a flat list of parsed skills for doctor-level checks (SK10).
 *
 * Takes a plain list (not a deduplicating `SkillRegistry`) so duplicate ids
 * across files can actually be detected — a `SkillRegistry` silently drops
 * duplicates on `register()` (last wins), which would hide the issue.
 *
 * Checks:
 * - Duplicate skill id across files (Iteration 6, T-06)
 * - Single auto-trigger per phase (using front-matter `phase` field)
 * - Keywords required for trigger: keyword
 * - format_version = 1
 * - All ids kebab-case
 */
export function validateSkillRegistry(
  skills: readonly ParsedSkill[],
): SkillValidationResult {
  const errors: SkillValidationError[] = [];
  const warnings: SkillValidationWarning[] = [];

  const byId = new Map<string, ParsedSkill[]>();
  for (const skill of skills) {
    const group = byId.get(skill.frontMatter.id) ?? [];
    group.push(skill);
    byId.set(skill.frontMatter.id, group);
  }
  for (const [id, group] of byId) {
    if (group.length > 1) {
      errors.push({
        skillId: id,
        message: `Duplicate skill id: "${id}" (${String(group.length)} files: ${group.map((s) => s.filePath).join(', ')})`,
      });
    }
  }

  const autoPerPhase = new Map<string, string[]>();

  for (const skill of skills) {
    const fm = skill.frontMatter;

    if (!/^[a-z][a-z0-9-]*$/.test(fm.id)) {
      errors.push({ skillId: fm.id, message: `Invalid id format: "${fm.id}" (kebab-case required)` });
    }

    // Runtime guard: format_version is typed as literal 1, but raw input may bypass Zod
    if ((fm.format_version as number) !== 1) {
      warnings.push({ skillId: fm.id, message: `Unexpected format_version: ${String(fm.format_version)} (expected 1)` });
    }

    if (fm.trigger === 'keyword' && (!fm.keywords || fm.keywords.length === 0)) {
      errors.push({ skillId: fm.id, message: 'keywords required when trigger is "keyword"' });
    }

    if (fm.trigger === 'auto') {
      const phase = fm.phase;
      const existing = autoPerPhase.get(phase) ?? [];
      existing.push(fm.id);
      autoPerPhase.set(phase, existing);
    }
  }

  for (const [phase, ids] of autoPerPhase) {
    const unique = [...new Set(ids)];
    if (unique.length > 1) {
      errors.push({
        skillId: unique.join(', '),
        message: `Duplicate auto-trigger for phase ${phase}: [${unique.join(', ')}]`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
