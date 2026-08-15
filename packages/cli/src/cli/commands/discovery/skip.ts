import type { DiscoveryMilestoneId } from '@l1dder/schemas';

import type { CliContext } from '../../context.js';
import { ExitCode } from '../../output/exit-codes.js';
import type { DiscoveryOptions, DiscoveryResult } from './discovery.js';
import { discoveryDomainError, discoveryErrorResult } from './errors.js';

/**
 * Execute `l1dder discovery skip <milestone> --reason <text>`.
 *
 * Marks a conditional milestone `not_applicable` (DF-013). Spec listed only
 * six discovery subcommands; this seventh is required so integrations/standards
 * can be closed with a rationale.
 */
export async function executeDiscoverySkip(
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
        hint: 'Provide a rationale: --reason "..."',
      },
    };
  }

  let sm;
  try {
    sm = await ctx.state();
  } catch (error: unknown) {
    return discoveryErrorResult(error);
  }

  const result = await sm.discovery.markNotApplicable(id, reason);
  if (!result.ok) {
    return discoveryDomainError(result.error);
  }

  return {
    exitCode: ExitCode.SUCCESS,
    data: { milestone: id, status: 'not_applicable', reason },
    humanText: `\n  ${ctx.colors.glyph.pass} Marked milestone "${id}" not_applicable\n  Reason: ${reason}\n`,
  };
}
