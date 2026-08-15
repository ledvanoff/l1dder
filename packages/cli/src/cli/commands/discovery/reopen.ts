import type { DiscoveryMilestoneId } from '@l1dder/schemas';

import type { CliContext } from '../../context.js';
import { ExitCode } from '../../output/exit-codes.js';
import type { DiscoveryOptions, DiscoveryResult } from './discovery.js';
import { discoveryDomainError, discoveryErrorResult } from './errors.js';

/**
 * Execute `l1dder discovery reopen <milestone> --reason <text>`.
 */
export async function executeDiscoveryReopen(
  ctx: CliContext,
  id: DiscoveryMilestoneId,
  opts: DiscoveryOptions,
): Promise<DiscoveryResult> {
  const reason = opts.reason?.trim() ?? '';
  if (reason.length === 0) {
    return {
      exitCode: ExitCode.FORCE_REASON_REQUIRED,
      error: {
        code: 'MILESTONE_RATIONALE_REQUIRED',
        message: '--reason <text> is required and must be non-empty',
        hint: 'Provide a reason: --reason "..."',
      },
    };
  }

  let sm;
  try {
    sm = await ctx.state();
  } catch (error: unknown) {
    return discoveryErrorResult(error);
  }

  const result = await sm.discovery.reopen(id, reason);
  if (!result.ok) {
    return discoveryDomainError(result.error);
  }

  return {
    exitCode: ExitCode.SUCCESS,
    data: { milestone: id, status: 'in_progress', reason },
    humanText: `\n  ${ctx.colors.glyph.pass} Reopened milestone "${id}"\n  Reason: ${reason}\n`,
  };
}
