import { ok } from '@l1dder/core';
import type { Result } from '@l1dder/core';
import type { Config, Phase, State } from '@l1dder/schemas';

/**
 * Stable failure returned when a gate condition blocks a transition.
 *
 * Callers (and {@link import('../features/transitions/gate-engine.js').GateEngine})
 * branch on {@link GateConditionFailure.code}; the message is human-facing.
 */
export interface GateConditionFailure {
  readonly code: string;
  readonly message: string;
}

/**
 * Context provided to gate conditions before approval is requested.
 */
export interface GateConditionContext {
  readonly phase: Phase;
  readonly state: Readonly<State>;
  readonly config: Readonly<Config>;
}

/**
 * Port for deterministic gate pre-conditions evaluated before {@link ApproverPort}.
 *
 * Conditions are never skipped by `skip_allowed` (that flag only skips approval).
 * Disabled gates skip both conditions and approval at the engine level.
 */
export interface GateConditionPort {
  /**
   * Evaluate deterministic pre-conditions for `gateId`.
   *
   * @param gateId - Gate identifier from the transition table
   * @param context - Current phase / state / config snapshot
   * @returns `ok(void)` when the condition passes, or a structured failure
   */
  evaluate(
    gateId: string,
    context: GateConditionContext,
  ): Promise<Result<void, GateConditionFailure>>;
}

/**
 * Default adapter: every gate condition passes.
 *
 * Used until a concrete condition (e.g. task completion) is wired in the
 * composition root.
 */
export class NoopGateConditions implements GateConditionPort {
  /**
   * @returns Always `ok(void)`.
   */
  evaluate(
    _gateId: string,
    _context: GateConditionContext,
  ): Promise<Result<void, GateConditionFailure>> {
    return Promise.resolve(ok(undefined));
  }
}
