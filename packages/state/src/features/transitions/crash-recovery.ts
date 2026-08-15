import type { Result, ClockPort } from '@l1dder/core';
import { CorruptedStateError, PhaseStatus, ok, err } from '@l1dder/core';
import type { State, InFlightTransition, Phase, Actor, TriggerSource } from '@l1dder/schemas';

/**
 * Detects and resolves in-flight transition markers left by crashes (SM7).
 *
 * When a transition is in progress, `_in_flight_transition` is set in state.yml.
 * If the process crashes mid-transition, this marker remains. On next load,
 * `CrashRecovery` detects it and offers resume or rollback.
 */
export class CrashRecovery {
  /**
   * Check whether state has an in-flight transition marker.
   *
   * @returns The `InFlightTransition` marker if present, `null` otherwise.
   */
  detect(state: State): InFlightTransition | null {
    return state._in_flight_transition ?? null;
  }

  /**
   * Resolve an in-flight transition by either resuming (forward to target)
   * or rolling back (stay at original phase).
   *
   * Idempotent for already-applied recoveries: if the marker is present but
   * workflow already reflects the target outcome (phase + a recovery history
   * entry), the marker is cleared without appending another history row
   * (DF-007).
   *
   * @param action - `"resume"` completes the transition to the target phase;
   *                 `"rollback"` keeps the original phase.
   * @returns Updated state with marker cleared.
   */
  resolve(
    state: State,
    action: 'resume' | 'rollback',
    clock: ClockPort,
  ): Result<State, CorruptedStateError> {
    const marker = state._in_flight_transition;
    if (!marker) {
      return err(
        new CorruptedStateError(
          'state.yml',
          'No in-flight transition marker found',
        ),
      );
    }

    const targetPhase = action === 'resume' ? marker.to : marker.from;

    if (this.isAlreadyResolved(state, targetPhase)) {
      return ok(this.clearMarker(state));
    }

    const now = clock.now();
    const stateWithoutMarker = this.clearMarker(state);

    const historyEntry = {
      phase: targetPhase,
      status: PhaseStatus.IN_PROGRESS,
      started_at: now,
      actor: marker.actor,
      trigger: { kind: 'recovery' as const, original_phase: marker.from },
    };

    return ok({
      ...stateWithoutMarker,
      workflow: {
        ...state.workflow,
        current_phase: targetPhase,
        current_status: PhaseStatus.IN_PROGRESS,
        phase_history: [...state.workflow.phase_history, historyEntry],
      },
    });
  }

  /**
   * True when workflow already matches a prior recovery for `targetPhase`
   * (phase set + at least one recovery history entry for that phase).
   */
  private isAlreadyResolved(state: State, targetPhase: Phase): boolean {
    if (state.workflow.current_phase !== targetPhase) {
      return false;
    }
    return state.workflow.phase_history.some(
      (entry) => entry.trigger.kind === 'recovery' && entry.phase === targetPhase,
    );
  }

  /**
   * Create an in-flight marker on state before applying a transition.
   * The caller must persist this to disk before applying the actual transition.
   */
  setMarker(
    state: State,
    from: Phase,
    to: Phase,
    actor: Actor,
    trigger: TriggerSource,
    clock: ClockPort,
  ): State {
    return {
      ...state,
      _in_flight_transition: {
        from,
        to,
        started_at: clock.now(),
        actor,
        trigger,
      },
    };
  }

  /**
   * Clear the in-flight marker after a successful transition.
   *
   * Uses destructuring to physically remove the key — setting it to `undefined`
   * would cause YAML serialization to emit `null`, breaking Zod validation on reload.
   */
  clearMarker(state: State): State {
    const { _in_flight_transition: _, ...rest } = state;
    return rest;
  }
}
