import type { Result, ClockPort, TransitionRule } from '@l1dder/core';
import {
  ForbiddenTransitionError,
  PhaseStatus,
  TransitionKind,
  ok,
  err,
  isRollbackAllowed,
  findTransitionRule,
  listAvailableTransitions,
} from '@l1dder/core';
import type { State, Phase, Actor, TriggerSource } from '@l1dder/schemas';

/**
 * Handles rollback transitions: validation + state mutation + audit.
 *
 * Rollback is allowed only to an adjacent earlier phase in the same mode.
 * Creates a `phase_history` entry with `transition_kind: "rollback"` and
 * sets the target phase status to `"revisited"`.
 */
export class RollbackHandler {
  /**
   * Validate whether a rollback from the current phase to the target is allowed.
   *
   * @returns The matching `TransitionRule` if valid, or `ForbiddenTransitionError`.
   */
  validate(
    state: State,
    targetPhase: Phase,
  ): Result<TransitionRule, ForbiddenTransitionError> {
    const currentPhase = state.workflow.current_phase;
    const mode = state.workflow.mode;

    if (!isRollbackAllowed(currentPhase, targetPhase, mode)) {
      return err(
        new ForbiddenTransitionError(
          currentPhase,
          targetPhase,
          mode,
          listAvailableTransitions(currentPhase, mode),
          'Rollback only allowed to adjacent earlier phase',
        ),
      );
    }

    const rule = findTransitionRule(currentPhase, targetPhase, mode);
    if (!rule || rule.kind !== TransitionKind.ROLLBACK) {
      return err(
        new ForbiddenTransitionError(
          currentPhase,
          targetPhase,
          mode,
          listAvailableTransitions(currentPhase, mode),
          'No rollback rule found',
        ),
      );
    }

    return ok(rule);
  }

  /**
   * Apply a validated rollback: update current phase, set status to `revisited`,
   * append audit entry to `phase_history`.
   */
  apply(
    state: State,
    rule: TransitionRule,
    actor: Actor,
    trigger: TriggerSource,
    clock: ClockPort,
  ): State {
    const now = clock.now();
    const previousPhase = state.workflow.current_phase;
    const targetPhase = rule.to;

    const historyEntry = {
      phase: targetPhase,
      status: PhaseStatus.REVISITED,
      started_at: now,
      actor,
      trigger,
      transition_kind: TransitionKind.ROLLBACK,
      metadata: { rolled_back_from: previousPhase },
    };

    return {
      ...state,
      workflow: {
        ...state.workflow,
        current_phase: targetPhase,
        current_status: PhaseStatus.REVISITED,
        phase_history: [...state.workflow.phase_history, historyEntry],
      },
    };
  }
}
