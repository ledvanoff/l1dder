import { Phase, TransitionKind, WorkflowMode } from './phase.js';
import type { TransitionRule } from './transition-types.js';

/**
 * Static whitelist of all allowed phase transitions (PM3).
 *
 * 28 rules: 11 main forward + 5 main rollback + 5 hygiene/review + 4 quick + 3 fast.
 * INIT→IDLE is NOT included — handled by `l1dder init` directly.
 * Hygiene route is expressible as IDLE/COMPLETE → HYGIENE → REVIEW → COMPLETE → IDLE;
 * HYGIENE → IDLE remains for the advisory short-circuit. REVIEW is never mandatory:
 * discovery may leave UPDATE_TOBE via REVIEW or directly to COMPLETE, matching
 * UPDATE_ASIS → COMPLETE on the delivery route.
 */
export const TRANSITIONS: readonly TransitionRule[] = [
  // ─── Main Mode: Forward ───

  { from: Phase.IDLE, to: Phase.SPECIFY, kind: TransitionKind.FORWARD, trigger: 'slash:specify', gates: [], mode: WorkflowMode.MAIN },
  // IDLE → TASKS is the entry point of the `delivery` profile route: an Agent
  // Session that picks up an approved roadmap entry starts at TASKS, and its
  // route contains no SPECIFY/PLAN/UPDATE_TOBE to arrive from. Without this
  // rule the projection has no forward transition to offer such a session.
  // No gate here: the To-Be approval happened in the Discovery session, and the
  // rail guard plus stage guard already decide whether this entry may start.
  { from: Phase.IDLE, to: Phase.TASKS, kind: TransitionKind.FORWARD, trigger: 'slash:tasks', gates: [], mode: WorkflowMode.MAIN },
  { from: Phase.SPECIFY, to: Phase.PLAN, kind: TransitionKind.FORWARD, trigger: 'slash:plan', gates: ['spec-gate'], mode: WorkflowMode.MAIN },
  { from: Phase.PLAN, to: Phase.UPDATE_TOBE, kind: TransitionKind.FORWARD, trigger: 'slash:update-tobe', gates: [], mode: WorkflowMode.MAIN },
  { from: Phase.UPDATE_TOBE, to: Phase.TASKS, kind: TransitionKind.FORWARD, trigger: 'slash:tasks', gates: ['discovery-gate'], mode: WorkflowMode.MAIN },
  // Discovery profiles end at REVIEW/COMPLETE, not TASKS. Without these exits
  // UPDATE_TOBE has no on-route forward move (same class of gap as DF-034).
  { from: Phase.UPDATE_TOBE, to: Phase.REVIEW, kind: TransitionKind.FORWARD, trigger: 'cli:review', gates: ['discovery-gate'], mode: WorkflowMode.MAIN },
  { from: Phase.UPDATE_TOBE, to: Phase.COMPLETE, kind: TransitionKind.FORWARD, trigger: 'slash:complete', gates: ['discovery-gate'], mode: WorkflowMode.MAIN },
  { from: Phase.TASKS, to: Phase.IMPLEMENT, kind: TransitionKind.FORWARD, trigger: 'slash:implement', gates: [], mode: WorkflowMode.MAIN },
  { from: Phase.IMPLEMENT, to: Phase.UPDATE_ASIS, kind: TransitionKind.FORWARD, trigger: 'slash:update-asis', gates: ['implementation-gate'], mode: WorkflowMode.MAIN },
  { from: Phase.UPDATE_ASIS, to: Phase.COMPLETE, kind: TransitionKind.FORWARD, trigger: 'slash:complete', gates: ['as-is-update-gate'], mode: WorkflowMode.MAIN },
  { from: Phase.COMPLETE, to: Phase.IDLE, kind: TransitionKind.FORWARD, trigger: 'auto:iteration-done', gates: [], mode: WorkflowMode.MAIN },

  // ─── Main Mode: Rollback (adjacent phases only) ───

  { from: Phase.PLAN, to: Phase.SPECIFY, kind: TransitionKind.ROLLBACK, trigger: 'cli:rollback', gates: [], mode: WorkflowMode.MAIN },
  { from: Phase.UPDATE_TOBE, to: Phase.PLAN, kind: TransitionKind.ROLLBACK, trigger: 'cli:rollback', gates: [], mode: WorkflowMode.MAIN },
  { from: Phase.TASKS, to: Phase.PLAN, kind: TransitionKind.ROLLBACK, trigger: 'cli:rollback', gates: [], mode: WorkflowMode.MAIN },
  { from: Phase.IMPLEMENT, to: Phase.TASKS, kind: TransitionKind.ROLLBACK, trigger: 'cli:rollback', gates: [], mode: WorkflowMode.MAIN },
  { from: Phase.UPDATE_ASIS, to: Phase.IMPLEMENT, kind: TransitionKind.ROLLBACK, trigger: 'cli:rollback', gates: [], mode: WorkflowMode.MAIN },

  // ─── Hygiene (DEC-6-4): advisory audit session, no mandatory gate ───

  { from: Phase.IDLE, to: Phase.HYGIENE, kind: TransitionKind.MODE_SWITCH, trigger: 'cli:hygiene', gates: [], mode: WorkflowMode.MAIN },
  { from: Phase.COMPLETE, to: Phase.HYGIENE, kind: TransitionKind.MODE_SWITCH, trigger: 'cli:hygiene', gates: [], mode: WorkflowMode.MAIN },
  { from: Phase.HYGIENE, to: Phase.IDLE, kind: TransitionKind.FORWARD, trigger: 'cli:hygiene-done', gates: [], mode: WorkflowMode.MAIN },
  { from: Phase.HYGIENE, to: Phase.REVIEW, kind: TransitionKind.FORWARD, trigger: 'cli:hygiene-review', gates: [], mode: WorkflowMode.MAIN },
  { from: Phase.REVIEW, to: Phase.COMPLETE, kind: TransitionKind.FORWARD, trigger: 'cli:review-done', gates: [], mode: WorkflowMode.MAIN },

  // ─── Quick Mode ───

  { from: Phase.IDLE, to: Phase.QUICK_PLAN, kind: TransitionKind.MODE_SWITCH, trigger: 'cli:quick', gates: [], mode: WorkflowMode.QUICK },
  { from: Phase.QUICK_PLAN, to: Phase.QUICK_IMPLEMENT, kind: TransitionKind.FORWARD, trigger: 'auto:plan-done', gates: [], mode: WorkflowMode.QUICK },
  { from: Phase.QUICK_IMPLEMENT, to: Phase.QUICK_COMPLETE, kind: TransitionKind.FORWARD, trigger: 'auto:implement-done', gates: [], mode: WorkflowMode.QUICK },
  { from: Phase.QUICK_COMPLETE, to: Phase.IDLE, kind: TransitionKind.FORWARD, trigger: 'auto:commit-done', gates: [], mode: WorkflowMode.QUICK },

  // ─── Fast Mode ───

  { from: Phase.IDLE, to: Phase.FAST_IMPLEMENT, kind: TransitionKind.MODE_SWITCH, trigger: 'cli:fast', gates: [], mode: WorkflowMode.FAST },
  { from: Phase.FAST_IMPLEMENT, to: Phase.FAST_COMPLETE, kind: TransitionKind.FORWARD, trigger: 'auto:implement-done', gates: [], mode: WorkflowMode.FAST },
  { from: Phase.FAST_COMPLETE, to: Phase.IDLE, kind: TransitionKind.FORWARD, trigger: 'auto:commit-done', gates: [], mode: WorkflowMode.FAST },
] as const;

/**
 * Check whether a transition from one phase to another is allowed in the given mode.
 */
export function isAllowedTransition(
  from: Phase,
  to: Phase,
  mode: WorkflowMode,
): boolean {
  return TRANSITIONS.some(
    (r) => r.from === from && r.to === to && r.mode === mode,
  );
}

/**
 * Find the matching TransitionRule for a (from, to, mode) triple.
 *
 * Returns `undefined` if the transition is not in the whitelist.
 */
export function findTransitionRule(
  from: Phase,
  to: Phase,
  mode: WorkflowMode,
): TransitionRule | undefined {
  return TRANSITIONS.find(
    (r) => r.from === from && r.to === to && r.mode === mode,
  );
}

/**
 * Return gate IDs required for a specific transition.
 *
 * Returns an empty array if the transition is not found or has no gates.
 */
export function requiredGatesFor(
  from: Phase,
  to: Phase,
  mode: WorkflowMode,
): readonly string[] {
  return findTransitionRule(from, to, mode)?.gates ?? [];
}

/**
 * List all transitions available from a given phase in a given mode.
 */
export function listAvailableTransitions(
  currentPhase: Phase,
  currentMode: WorkflowMode,
): readonly TransitionRule[] {
  return TRANSITIONS.filter(
    (r) => r.from === currentPhase && r.mode === currentMode,
  );
}

/**
 * Check whether rolling back from one phase to another is allowed.
 *
 * Rollback is only permitted for adjacent phases (kind === "rollback" in the table).
 */
export function isRollbackAllowed(
  from: Phase,
  to: Phase,
  mode: WorkflowMode,
): boolean {
  return TRANSITIONS.some(
    (r) =>
      r.from === from &&
      r.to === to &&
      r.mode === mode &&
      r.kind === TransitionKind.ROLLBACK,
  );
}
