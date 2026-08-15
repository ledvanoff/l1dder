import type { DiscoveryMilestoneId } from '@l1dder/schemas';

import type { CliContext } from '../../context.js';
import { ExitCode } from '../../output/exit-codes.js';
import type { DiscoveryOptions, DiscoveryResult } from './discovery.js';
import { discoveryDomainError, discoveryErrorResult } from './errors.js';

/**
 * Execute `l1dder discovery waive <milestone> --reason <text>`.
 */
export async function executeDiscoveryWaive(
  ctx: CliContext,
  id: DiscoveryMilestoneId,
  opts: DiscoveryOptions,
): Promise<DiscoveryResult> {
  const reason = opts.reason?.trim() ?? '';
  if (reason.length === 0) {
    return {
      exitCode: ExitCode.FORCE_REASON_REQUIRED,
      error: {
        code: 'WAIVER_REASON_REQUIRED',
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

  const result = await sm.discovery.waive(id, {
    reason,
    actor: { kind: 'human', id: 'user' },
  });
  if (!result.ok) {
    return discoveryDomainError(result.error);
  }

  return {
    exitCode: ExitCode.SUCCESS,
    data: { milestone: id, status: 'complete', waived: true, reason },
    humanText: `\n  ${ctx.colors.glyph.pass} Waived milestone "${id}"\n  Reason: ${reason}\n`,
  };
}
