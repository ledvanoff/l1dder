import type { Result } from '@l1dder/core';
import { ForbiddenTransitionError, ok, err } from '@l1dder/core';
import { PhaseStatus, listAvailableTransitions, WorkflowMode } from '@l1dder/core';
import type { Phase } from '@l1dder/core';
import type { State } from '@l1dder/schemas';
import type { PhaseStatus as PhaseStatusType } from '@l1dder/schemas';

/**
 * Events that drive PhaseStatus lifecycle transitions.
 */
export type StatusEvent =
  | 'start'
  | 'gate_required'
  | 'gate_approved'
  | 'gate_rejected'
  | 'complete'
  | 'interrupt'
  | 'resume';

/**
 * Valid status transitions: `[currentStatus, event] → newStatus`.
 */
const STATUS_TRANSITIONS: ReadonlyMap<
  string,
  PhaseStatusType
> = new Map([
  // start: entering a new phase
  [`${PhaseStatus.IN_PROGRESS}:start`, PhaseStatus.IN_PROGRESS],
  [`${PhaseStatus.COMPLETED}:start`, PhaseStatus.IN_PROGRESS],
  [`${PhaseStatus.REVISITED}:start`, PhaseStatus.IN_PROGRESS],

  // gate_required: phase needs gate approval before completing
  [`${PhaseStatus.IN_PROGRESS}:gate_required`, PhaseStatus.AWAITING_GATE],

  // gate_approved: gate passed
  [`${PhaseStatus.AWAITING_GATE}:gate_approved`, PhaseStatus.COMPLETED],

  // gate_rejected: gate failed
  [`${PhaseStatus.AWAITING_GATE}:gate_rejected`, PhaseStatus.BLOCKED],

  // complete: phase finished (no gate needed)
  [`${PhaseStatus.IN_PROGRESS}:complete`, PhaseStatus.COMPLETED],

  // interrupt: pause current work
  [`${PhaseStatus.IN_PROGRESS}:interrupt`, PhaseStatus.INTERRUPTED],
  [`${PhaseStatus.AWAITING_GATE}:interrupt`, PhaseStatus.INTERRUPTED],
  [`${PhaseStatus.BLOCKED}:interrupt`, PhaseStatus.INTERRUPTED],

  // resume: come back from interrupted
  [`${PhaseStatus.INTERRUPTED}:resume`, PhaseStatus.IN_PROGRESS],
]);

/**
 * Manages PhaseStatus lifecycle: the 6-state machine for each phase's execution status.
 *
 * Status flow:
 * ```
 * in_progress ──→ awaiting_gate ──→ completed
 *      │                 │               ↑
 *      │                 ├──→ blocked    │
 *      │                 │               │
 *      ├─────────────────┤               │
 *      │         interrupt               │
 *      ↓                                 │
 *  interrupted ──resume──→ in_progress ──┘
 * ```
 */
export class PhaseStatusManager {
  /**
   * Compute the next PhaseStatus given a current status and an event.
   *
   * @returns `ok(newStatus)` or `err(ForbiddenTransitionError)` if the transition is invalid.
   */
  transitionStatus(
    currentStatus: PhaseStatusType,
    event: StatusEvent,
  ): Result<PhaseStatusType, ForbiddenTransitionError> {
    const key = `${currentStatus}:${event}`;
    const nextStatus = STATUS_TRANSITIONS.get(key);

    if (nextStatus === undefined) {
      return err(
        new ForbiddenTransitionError(
          currentStatus as unknown as Phase,
          event as unknown as Phase,
          WorkflowMode.MAIN,
          [],
          `Invalid status transition: "${currentStatus}" + "${event}"`,
        ),
      );
    }

    return ok(nextStatus);
  }

  /**
   * Mark the current phase as interrupted in state.
   */
  markInterrupted(state: State): State {
    return {
      ...state,
      workflow: {
        ...state.workflow,
        current_status: PhaseStatus.INTERRUPTED,
      },
    };
  }

  /**
   * Resume from interrupted status back to in_progress.
   *
   * @returns Updated state or error if not currently interrupted.
   */
  resumeFromInterrupted(
    state: State,
  ): Result<State, ForbiddenTransitionError> {
    if (state.workflow.current_status !== PhaseStatus.INTERRUPTED) {
      return err(
        new ForbiddenTransitionError(
          state.workflow.current_phase,
          state.workflow.current_phase,
          state.workflow.mode,
          listAvailableTransitions(
            state.workflow.current_phase,
            state.workflow.mode,
          ),
          `Cannot resume: current status is "${state.workflow.current_status}", not "interrupted"`,
        ),
      );
    }

    return ok({
      ...state,
      workflow: {
        ...state.workflow,
        current_status: PhaseStatus.IN_PROGRESS,
      },
    });
  }
}
