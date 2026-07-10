/**
 * Work-type → skill routing (M8).
 *
 * A second, orthogonal index to PHASE_SKILL_MAP: it maps the *kind of
 * engineering work* in progress (testing, security, debugging, …) to the
 * starter skills that help with it. Phase resolution answers "where am I in the
 * workflow"; work-type resolution answers "what kind of task is this".
 *
 * Advisory only — used to surface relevant skills, never to gate transitions.
 */

/** Kind of engineering work, used to route to relevant starter skills. */
export type WorkType =
  | 'testing'
  | 'security'
  | 'debugging'
  | 'onboarding'
  | 'error-handling';

/**
 * Maps a work type to candidate skill ids (ordered by relevance).
 *
 * Ids reference the optional engineering starter skills (installed via
 * `l1dder init --profile engineering`); entries resolve to nothing when the
 * skills are not present in the registry.
 */
export const WORK_TYPE_SKILL_MAP: Readonly<Record<WorkType, readonly string[]>> = {
  testing: ['tdd-workflow', 'e2e-testing'],
  security: ['security-review'],
  debugging: ['debugging-systematic'],
  onboarding: ['code-tour'],
  'error-handling': ['error-handling'],
};

/** Type guard: is the given string a known WorkType? */
export function isWorkType(value: string): value is WorkType {
  return Object.prototype.hasOwnProperty.call(WORK_TYPE_SKILL_MAP, value);
}
