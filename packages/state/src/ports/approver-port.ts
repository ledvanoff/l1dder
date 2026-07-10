import type { Result } from '@l1dder/core';
import type { GateRejectedError } from '@l1dder/core';
import type { Config, Phase, State } from '@l1dder/schemas';

/**
 * Outcome of a gate approval decision.
 */
export interface GateApprovalOutcome {
  readonly approved: boolean;
  readonly approver: string;
  readonly timestamp: string;
  readonly reason?: string;
}

/**
 * Context provided to the approver for a gate decision.
 */
export interface ApprovalContext {
  readonly phase: Phase;
  readonly actor: { readonly kind: string; readonly [key: string]: unknown };
  readonly state: Readonly<State>;
  readonly config: Readonly<Config>;
}

/**
 * Port for gate approval in the transition pipeline (SM9, PM11).
 *
 * Solo mode: auto-approves everything.
 * Team mode: delegates to human/role-based approval (Iteration 5).
 */
export interface ApproverPort {
  approve(
    gateId: string,
    context: ApprovalContext,
  ): Promise<Result<GateApprovalOutcome, GateRejectedError>>;
}
