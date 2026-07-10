import { ok } from '@l1dder/core';
import type { Result } from '@l1dder/core';
import type { GateRejectedError } from '@l1dder/core';
import type { ClockPort } from '@l1dder/core';

import type {
  ApprovalContext,
  ApproverPort,
  GateApprovalOutcome,
} from '../ports/approver-port.js';

/**
 * Auto-approving gate handler for solo mode.
 *
 * Always returns `approved: true` — solo developers don't need
 * external approval. Used as the default `ApproverPort` implementation.
 */
export class SoloApprover implements ApproverPort {
  private readonly clock: ClockPort;

  constructor(clock: ClockPort) {
    this.clock = clock;
  }

  approve(
    _gateId: string,
    _context: ApprovalContext,
  ): Promise<Result<GateApprovalOutcome, GateRejectedError>> {
    return Promise.resolve(
      ok({
        approved: true,
        approver: 'solo',
        timestamp: this.clock.now(),
      }),
    );
  }
}
