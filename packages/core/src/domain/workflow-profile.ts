import { PHASE_TO_MODE, Phase, ProjectStage, WorkflowMode } from './phase.js';
import {
  isAllowedTransition,
  listAvailableTransitions,
} from './transitions-table.js';

// SYNC WARNING: WorkflowProfile values MUST match @l1dder/schemas WorkflowProfileIdSchema.
// Any change here requires a corresponding update in packages/schemas/src/workflow-profile.ts.

/** All 4 workflow profile identifiers. */
export const WorkflowProfile = {
  PRODUCT_DISCOVERY: 'product_discovery',
  FEATURE_DISCOVERY: 'feature_discovery',
  DELIVERY: 'delivery',
  HYGIENE: 'hygiene',
} as const;

/** Union of all 4 workflow profile string literals. */
export type WorkflowProfileId =
  (typeof WorkflowProfile)[keyof typeof WorkflowProfile];

/**
 * Whitelist of phases each profile may occupy.
 *
 * Invariants:
 * 1. Profile enforcement applies ONLY to {@link WorkflowMode.MAIN}.
 *    `quick` / `fast` modes are explicit audited bypasses and are never restricted by profile.
 * 2. When no profile is selected (`null`), enforcement is OFF and legacy behavior applies.
 *    Profiles are never inferred silently.
 * 3. Routes are whitelists of allowed phases, not mandatory linear paths:
 *    e.g. `update_asis → complete` stays legal in `delivery` even though `review` is also allowed.
 */
export const PROFILE_ROUTES: Readonly<Record<WorkflowProfileId, readonly Phase[]>> = {
  [WorkflowProfile.PRODUCT_DISCOVERY]: [
    Phase.IDLE,
    Phase.SPECIFY,
    Phase.PLAN,
    Phase.UPDATE_TOBE,
    Phase.REVIEW,
    Phase.COMPLETE,
  ],
  [WorkflowProfile.FEATURE_DISCOVERY]: [
    Phase.IDLE,
    Phase.SPECIFY,
    Phase.PLAN,
    Phase.UPDATE_TOBE,
    Phase.REVIEW,
    Phase.COMPLETE,
  ],
  [WorkflowProfile.DELIVERY]: [
    Phase.IDLE,
    Phase.TASKS,
    Phase.IMPLEMENT,
    Phase.UPDATE_ASIS,
    Phase.REVIEW,
    Phase.COMPLETE,
  ],
  [WorkflowProfile.HYGIENE]: [
    Phase.IDLE,
    Phase.HYGIENE,
    Phase.REVIEW,
    Phase.COMPLETE,
  ],
};

/**
 * Whether `phase` is on the whitelist for `profile`.
 *
 * - `profile === null` → enforcement off; always `true`.
 * - Non-main (quick/fast) phases → never restricted by profile; always `true`.
 */
export function isPhaseAllowedInProfile(
  profile: WorkflowProfileId | null,
  phase: Phase,
): boolean {
  if (profile === null) {
    return true;
  }
  if (PHASE_TO_MODE[phase] !== WorkflowMode.MAIN) {
    return true;
  }
  return PROFILE_ROUTES[profile].includes(phase);
}

/**
 * Whether `from → to` is the off-route escape back to {@link Phase.IDLE}.
 *
 * After a mid-iteration `profile select`, the current phase may sit off the
 * new route. Requiring both endpoints on the route would trap the user:
 * `--force` must not silently walk to an off-route target (HARD-2), but a
 * return to IDLE is always on-route (IDLE is on every profile).
 *
 * Not a table rule — the pipeline records it as `skip` when no whitelist
 * row exists. `profile === null` never escapes (enforcement is off).
 */
export function isOffRouteIdleEscape(
  profile: WorkflowProfileId | null,
  from: Phase,
  to: Phase,
): boolean {
  if (profile === null || to !== Phase.IDLE || from === Phase.IDLE) {
    return false;
  }
  if (PHASE_TO_MODE[from] !== WorkflowMode.MAIN) {
    return false;
  }
  return !isPhaseAllowedInProfile(profile, from);
}

/**
 * Whether a MAIN-mode transition `from → to` is allowed under `profile`.
 *
 * On-route: both phases must be on the profile route AND
 * {@link isAllowedTransition} must permit the pair in {@link WorkflowMode.MAIN}.
 *
 * Off-route: only the {@link isOffRouteIdleEscape} to IDLE is allowed, so a
 * mismatched `profile select` cannot deadlock the machine.
 *
 * - `profile === null` → enforcement off; always `true`.
 * - If either endpoint is a quick/fast phase → never restricted; always `true`.
 */
export function isTransitionAllowedInProfile(
  profile: WorkflowProfileId | null,
  from: Phase,
  to: Phase,
): boolean {
  if (profile === null) {
    return true;
  }
  if (
    PHASE_TO_MODE[from] !== WorkflowMode.MAIN ||
    PHASE_TO_MODE[to] !== WorkflowMode.MAIN
  ) {
    return true;
  }
  if (isOffRouteIdleEscape(profile, from, to)) {
    return true;
  }
  return (
    isPhaseAllowedInProfile(profile, from) &&
    isPhaseAllowedInProfile(profile, to) &&
    isAllowedTransition(from, to, WorkflowMode.MAIN)
  );
}

/**
 * List MAIN-mode target phases reachable from `from` under `profile`.
 *
 * When `profile` is `null`, returns all MAIN targets from the transition table
 * (enforcement off). When `from` is off the selected route, returns IDLE as
 * the sole escape. Otherwise filters table targets to profile-allowed pairs.
 */
export function listProfileTransitions(
  profile: WorkflowProfileId | null,
  from: Phase,
): readonly Phase[] {
  const mainTargets = listAvailableTransitions(from, WorkflowMode.MAIN).map(
    (rule) => rule.to,
  );
  if (profile === null) {
    return mainTargets;
  }
  if (isOffRouteIdleEscape(profile, from, Phase.IDLE)) {
    return [Phase.IDLE];
  }
  return mainTargets.filter((to) =>
    isTransitionAllowedInProfile(profile, from, to),
  );
}

/**
 * Pure advisory suggestion for which profile fits a project stage.
 *
 * MUST NOT be used to silently select a route — callers must surface the
 * recommendation and obtain an explicit profile choice.
 *
 * Mapping: `discovery` → `product_discovery`; `delivery` / `maintenance` → `delivery`.
 */
export function recommendProfile(stage: ProjectStage): WorkflowProfileId {
  if (stage === ProjectStage.DISCOVERY) {
    return WorkflowProfile.PRODUCT_DISCOVERY;
  }
  return WorkflowProfile.DELIVERY;
}
