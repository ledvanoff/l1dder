import type { Phase } from '@l1dder/schemas';

/**
 * Result of an idempotency check on a transition request.
 */
export interface IdempotencyResult {
  readonly isNoop: boolean;
}

/**
 * Detects no-op transitions where current phase equals the target phase.
 *
 * When a no-op is detected, the transition pipeline returns early
 * without error — idempotent transitions are safe, not forbidden.
 */
export class IdempotencyChecker {
  /**
   * Check whether a transition from `currentPhase` to `targetPhase` is a no-op.
   */
  check(currentPhase: Phase, targetPhase: Phase): IdempotencyResult {
    return { isNoop: currentPhase === targetPhase };
  }
}
