import type { Phase, PhaseStatus, WorkflowMode, ProjectStage, TransitionKind } from './phase.js';

/**
 * Descriptive trigger hint stored in each transition rule.
 *
 * Format: `"<source>:<action>"` (e.g. `"slash:specify"`, `"cli:rollback"`, `"auto:plan-done"`).
 * This is NOT the runtime `TriggerSource` discriminated union — it's a documentation-level
 * hint for which trigger is expected to fire this transition.
 */
export type TriggerType = string;

/**
 * A single row in the static transition whitelist (PM3).
 *
 * Every allowed phase transition is represented by one TransitionRule.
 * Transitions NOT in the whitelist are forbidden.
 */
export interface TransitionRule {
  readonly from: Phase;
  readonly to: Phase;
  readonly kind: TransitionKind;
  readonly trigger: TriggerType;
  readonly gates: readonly string[];
  readonly mode: WorkflowMode;
}

/**
 * Record of a completed phase transition — returned by `StateManager.transition()` (PM5).
 *
 * Written to `phase_history[]` in state.yml after each successful transition.
 */
export interface TransitionRecord {
  readonly from: Phase;
  readonly to: Phase;
  readonly kind: TransitionKind;
  readonly trigger: {
    readonly kind: string;
    readonly [key: string]: unknown;
  };
  readonly actor: {
    readonly kind: string;
    readonly [key: string]: unknown;
  };
  readonly timestamp: string;
  readonly gates: readonly string[];
  readonly reason?: string;
}

/**
 * Current workflow position — snapshot of phase + status + mode + stage (PM15).
 *
 * Returned by `StateManager.currentPosition()`.
 * Context Engine uses `stage` for profile resolution (CE3).
 */
export interface WorkflowPosition {
  readonly phase: Phase;
  readonly status: PhaseStatus;
  readonly mode: WorkflowMode;
  readonly stage: ProjectStage;
  readonly iteration: number;
}

/**
 * Record produced by `StateManager.pause()` — captures interrupted state (PM9).
 *
 * Used by Session Handoff to generate `.l1dder/handoff.md`.
 */
export interface HandoffRecord {
  readonly phase: Phase;
  readonly status: PhaseStatus;
  readonly mode: WorkflowMode;
  readonly timestamp: string;
  readonly handoffPath: string;
}
