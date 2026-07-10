// SYNC WARNING: Phase values MUST match @l1dder/schemas PhaseSchema.
// Any change here requires a corresponding update in packages/schemas/src/state.ts.

/** All 15 workflow phases (9 main + 1 hygiene + 3 quick + 2 fast). */
export const Phase = {
  IDLE: 'idle',
  SPECIFY: 'specify',
  PLAN: 'plan',
  UPDATE_TOBE: 'update_tobe',
  TASKS: 'tasks',
  IMPLEMENT: 'implement',
  UPDATE_ASIS: 'update_asis',
  COMPLETE: 'complete',
  REVIEW: 'review',
  HYGIENE: 'hygiene',
  QUICK_PLAN: 'quick_plan',
  QUICK_IMPLEMENT: 'quick_implement',
  QUICK_COMPLETE: 'quick_complete',
  FAST_IMPLEMENT: 'fast_implement',
  FAST_COMPLETE: 'fast_complete',
} as const;

/** Union of all 15 phase string literals. */
export type Phase = (typeof Phase)[keyof typeof Phase];

// SYNC WARNING: PhaseStatus values MUST match @l1dder/schemas PhaseStatusSchema.
// Any change here requires a corresponding update in packages/schemas/src/state.ts.

/** The 6 execution statuses a phase can be in. */
export const PhaseStatus = {
  IN_PROGRESS: 'in_progress',
  AWAITING_GATE: 'awaiting_gate',
  BLOCKED: 'blocked',
  COMPLETED: 'completed',
  REVISITED: 'revisited',
  INTERRUPTED: 'interrupted',
} as const;

/** Union of all 6 phase status string literals. */
export type PhaseStatus = (typeof PhaseStatus)[keyof typeof PhaseStatus];

// SYNC WARNING: WorkflowMode values MUST match @l1dder/schemas WorkflowModeSchema.
// Any change here requires a corresponding update in packages/schemas/src/state.ts.

/** The 3 workflow modes: main (full iteration), quick, fast. */
export const WorkflowMode = {
  MAIN: 'main',
  QUICK: 'quick',
  FAST: 'fast',
} as const;

/** Union of all 3 workflow mode string literals. */
export type WorkflowMode = (typeof WorkflowMode)[keyof typeof WorkflowMode];

/** The 3 project lifecycle stages. */
export const ProjectStage = {
  DISCOVERY: 'discovery',
  DELIVERY: 'delivery',
  MAINTENANCE: 'maintenance',
} as const;

/** Union of all 3 project stage string literals. */
export type ProjectStage =
  (typeof ProjectStage)[keyof typeof ProjectStage];

/** The 4 kinds of phase transitions. */
export const TransitionKind = {
  FORWARD: 'forward',
  ROLLBACK: 'rollback',
  SKIP: 'skip',
  MODE_SWITCH: 'mode_switch',
} as const;

/** Union of all 4 transition kind string literals. */
export type TransitionKind =
  (typeof TransitionKind)[keyof typeof TransitionKind];

/**
 * Maps each Phase to its WorkflowMode.
 *
 * Main phases (10, incl. HYGIENE) → "main", Quick phases (3) → "quick", Fast phases (2) → "fast".
 * HYGIENE is a main-mode phase (no dedicated WorkflowMode) — an advisory audit session
 * reachable from IDLE/COMPLETE, analogous to REVIEW.
 */
export const PHASE_TO_MODE: Readonly<Record<Phase, WorkflowMode>> = {
  [Phase.IDLE]: WorkflowMode.MAIN,
  [Phase.SPECIFY]: WorkflowMode.MAIN,
  [Phase.PLAN]: WorkflowMode.MAIN,
  [Phase.UPDATE_TOBE]: WorkflowMode.MAIN,
  [Phase.TASKS]: WorkflowMode.MAIN,
  [Phase.IMPLEMENT]: WorkflowMode.MAIN,
  [Phase.UPDATE_ASIS]: WorkflowMode.MAIN,
  [Phase.COMPLETE]: WorkflowMode.MAIN,
  [Phase.REVIEW]: WorkflowMode.MAIN,
  [Phase.HYGIENE]: WorkflowMode.MAIN,
  [Phase.QUICK_PLAN]: WorkflowMode.QUICK,
  [Phase.QUICK_IMPLEMENT]: WorkflowMode.QUICK,
  [Phase.QUICK_COMPLETE]: WorkflowMode.QUICK,
  [Phase.FAST_IMPLEMENT]: WorkflowMode.FAST,
  [Phase.FAST_COMPLETE]: WorkflowMode.FAST,
};
