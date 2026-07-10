import type { Result, LoggerPort, ClockPort } from '@l1dder/core';
import { GateRejectedError, ok, err } from '@l1dder/core';
import { requiredGatesFor } from '@l1dder/core';
import type { Config, Phase, WorkflowMode } from '@l1dder/schemas';

import type {
  ApproverPort,
  ApprovalContext,
  GateApprovalOutcome,
} from '../../ports/approver-port.js';

/**
 * Config-driven gate resolution and approval (PM11).
 *
 * Reads `config.gates` to determine whether a transition requires approval,
 * then delegates to `ApproverPort` for the actual decision.
 */
export class GateEngine {
  private readonly approver: ApproverPort;
  private readonly logger: LoggerPort;
  private readonly clock: ClockPort;

  constructor(approver: ApproverPort, logger: LoggerPort, clock: ClockPort) {
    this.approver = approver;
    this.logger = logger;
    this.clock = clock;
  }

  /**
   * Check whether a phase has any gates configured (either in transition table
   * or config overrides).
   *
   * Checks *every* gate in the transition table, not just the first — a
   * transition with several gates where only a later one is enabled must
   * still report `true` (consistent with `evaluate()`, which evaluates all
   * of them).
   */
  hasGates(
    fromPhase: Phase,
    toPhase: Phase,
    mode: WorkflowMode,
    config: Config,
  ): boolean {
    const tableGates = requiredGatesFor(fromPhase, toPhase, mode);
    return tableGates.some((gateId) => this.resolveGateConfig(gateId, config).enabled);
  }

  /**
   * Evaluate gates for a transition. Calls `ApproverPort` for each active gate.
   *
   * Evaluates *all* gates in the transition table in order — a transition
   * with several gates only passes once every enabled, non-skipped gate is
   * approved. Returns as soon as any gate rejects; otherwise returns the
   * outcome of the last gate that was actually evaluated (or an auto-approve
   * outcome if every gate was disabled/skip_allowed/absent).
   *
   * @returns `ok(GateApprovalOutcome)` if all gates pass or are skipped,
   *          `err(GateRejectedError)` if any gate rejects.
   */
  async evaluate(
    fromPhase: Phase,
    toPhase: Phase,
    mode: WorkflowMode,
    config: Config,
    context: ApprovalContext,
  ): Promise<Result<GateApprovalOutcome, GateRejectedError>> {
    const tableGates = requiredGatesFor(fromPhase, toPhase, mode);

    let outcome: GateApprovalOutcome = {
      approved: true,
      approver: 'auto',
      timestamp: this.clock.now(),
    };

    for (const gateId of tableGates) {
      const gateConfig = this.resolveGateConfig(gateId, config);

      if (!gateConfig.enabled) {
        this.logger.debug(`Gate "${gateId}" is disabled, skipping`, { gateId });
        continue;
      }

      if (gateConfig.skip_allowed) {
        this.logger.debug(`Gate "${gateId}" is skip_allowed, auto-approving`, { gateId });
        continue;
      }

      const result = await this.approver.approve(gateId, context);

      if (!result.ok) {
        return err(result.error);
      }

      if (!result.value.approved) {
        return err(
          new GateRejectedError(
            gateId,
            context.phase,
            result.value.approver,
            result.value.reason,
          ),
        );
      }

      this.logger.debug(`Gate "${gateId}" approved by "${result.value.approver}"`, {
        gateId,
        approver: result.value.approver,
      });

      outcome = result.value;
    }

    return ok(outcome);
  }

  /**
   * Resolve gate configuration by merging default with per-gate overrides.
   */
  private resolveGateConfig(
    gateId: string,
    config: Config,
  ): { enabled: boolean; skip_allowed: boolean } {
    const defaults = config.gates.default;
    const override = config.gates.overrides[gateId];

    return {
      enabled: override?.enabled ?? defaults.enabled,
      skip_allowed: override?.skip_allowed ?? defaults.skip_allowed,
    };
  }
}
