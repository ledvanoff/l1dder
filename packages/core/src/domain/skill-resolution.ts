import type { Phase } from './phase.js';
import type { ParsedSkill } from './skill-types.js';
import type { SkillRegistry } from './skill-registry.js';
import { PHASE_SKILL_MAP } from './skill-phase-map.js';
import { WORK_TYPE_SKILL_MAP, type WorkType } from './work-type-map.js';

/** Input for the skill resolution algorithm (SK4). */
export interface SkillResolutionInput {
  readonly phase: Phase;
  readonly role: string;
  readonly mode: 'main' | 'quick' | 'fast';
  /** Optional work-type hint for the orthogonal work-type index (M8). */
  readonly workType?: WorkType;
}

/** Result of successful skill resolution. */
export interface ResolvedSkill {
  readonly skill: ParsedSkill;
  readonly source: 'builtin' | 'custom' | 'merged';
}

/**
 * Resolve the best matching skill for a given phase, role, and mode.
 *
 * Algorithm (SK4):
 * 1. Find candidates via PHASE_SKILL_MAP → registry.findByPhase
 * 2. Filter by trigger eligibility (only auto for now — manual/keyword handled by caller)
 * 3. Filter by role (empty roles = all roles allowed)
 * 4. Custom override wins over built-in
 * 5. If both exist, return custom as "merged" source (actual merging done by SkillMerger in knowledge)
 */
export function resolveSkill(
  input: SkillResolutionInput,
  registry: SkillRegistry,
): ResolvedSkill | null {
  const skillId = PHASE_SKILL_MAP[input.phase];
  if (!skillId) {
    return null;
  }

  const candidates = registry.findByPhase(input.phase);
  if (candidates.length === 0) {
    return null;
  }

  const eligible = candidates.filter(
    (s) => s.frontMatter.trigger === 'auto',
  );

  const roleFiltered = eligible.filter(
    (s) =>
      s.frontMatter.roles.length === 0 ||
      s.frontMatter.roles.includes(input.role),
  );

  if (roleFiltered.length === 0) {
    return null;
  }

  const customOverride = roleFiltered.find((s) => s.category === 'custom');
  const builtinMatch = roleFiltered.find((s) => s.category === 'builtin');

  if (customOverride && builtinMatch) {
    return { skill: customOverride, source: 'merged' };
  }

  if (customOverride) {
    return { skill: customOverride, source: 'custom' };
  }

  if (builtinMatch) {
    return { skill: builtinMatch, source: 'builtin' };
  }

  return null;
}

/**
 * Resolve candidate skills for a kind of engineering work (M8).
 *
 * Orthogonal to {@link resolveSkill}: instead of the workflow phase, it routes
 * by the *type of work* (testing, security, …) via {@link WORK_TYPE_SKILL_MAP}.
 * Returns all mapped skills that are present in the registry and allowed for
 * `role` (a skill with empty `roles` is allowed for every role). Order follows
 * the map's declared candidate order.
 *
 * @param workType - the kind of work in progress
 * @param registry - the loaded skill registry
 * @param role - optional active role; when given, filters by skill `roles`
 * @returns matching skills (empty array for an unknown work type — never throws)
 */
export function resolveSkillsByWorkType(
  workType: WorkType,
  registry: SkillRegistry,
  role?: string,
): readonly ParsedSkill[] {
  // View as partial: a caller may pass an unrecognized string at runtime.
  const map: Partial<Record<string, readonly string[]>> = WORK_TYPE_SKILL_MAP;
  const ids = map[workType];
  if (!ids) {
    return [];
  }

  const resolved: ParsedSkill[] = [];
  for (const id of ids) {
    const skill = registry.findById(id);
    if (!skill) continue;

    if (role !== undefined) {
      const roles = skill.frontMatter.roles;
      if (roles.length > 0 && !roles.includes(role)) continue;
    }

    resolved.push(skill);
  }

  return resolved;
}
