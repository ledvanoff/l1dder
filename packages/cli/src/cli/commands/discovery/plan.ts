import type { DiscoveryMilestoneId } from '@l1dder/schemas';

import type { CliContext } from '../../context.js';
import { ExitCode } from '../../output/exit-codes.js';
import type { DiscoveryOptions, DiscoveryResult } from './discovery.js';
import { discoveryDomainError, discoveryErrorResult } from './errors.js';

/**
 * Execute `l1dder discovery plan <milestone> --summary <text> --session <id...>`.
 */
export async function executeDiscoveryPlan(
  ctx: CliContext,
  id: DiscoveryMilestoneId,
  opts: DiscoveryOptions,
): Promise<DiscoveryResult> {
  const summary = opts.summary?.trim() ?? '';
  if (summary.length === 0) {
    return {
      exitCode: ExitCode.USAGE_ERROR,
      error: {
        code: 'USAGE_ERROR',
        message: '--summary <text> is required and must be non-empty',
      },
    };
  }

  const sessions = (opts.session ?? []).map((s) => s.trim()).filter((s) => s.length > 0);
  if (sessions.length === 0) {
    return {
      exitCode: ExitCode.USAGE_ERROR,
      error: {
        code: 'USAGE_ERROR',
        message: 'At least one --session <id> is required',
      },
    };
  }

  let sm;
  try {
    sm = await ctx.state();
  } catch (error: unknown) {
    return discoveryErrorResult(error);
  }

  const result = await sm.discovery.plan(id, { summary, sessions });
  if (!result.ok) {
    return discoveryDomainError(result.error);
  }

  return {
    exitCode: ExitCode.SUCCESS,
    data: { milestone: id, status: 'planned', sessions },
    humanText: `\n  ${ctx.colors.glyph.pass} Planned milestone "${id}" with ${String(sessions.length)} session(s)\n`,
  };
}
