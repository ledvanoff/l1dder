import type { DiscoveryMilestoneId } from '@l1dder/schemas';

import type { CliContext } from '../../context.js';
import { ExitCode } from '../../output/exit-codes.js';
import { evaluateDiscoveryReadiness } from '../shared/discovery-readiness.js';
import type { DiscoveryOptions, DiscoveryResult } from './discovery.js';
import { discoveryDomainError, discoveryErrorResult } from './errors.js';

/**
 * Execute `l1dder discovery complete <milestone> --evidence <path...>`.
 *
 * Completing `ready` is refused before any mutation when READY evidence gaps
 * are present (`ExitCode.DISCOVERY_NOT_READY`).
 */
export async function executeDiscoveryComplete(
  ctx: CliContext,
  id: DiscoveryMilestoneId,
  opts: DiscoveryOptions,
): Promise<DiscoveryResult> {
  const evidence = (opts.evidence ?? [])
    .map((e) => e.trim())
    .filter((e) => e.length > 0);

  let sm;
  try {
    sm = await ctx.state();
  } catch (error: unknown) {
    return discoveryErrorResult(error);
  }

  if (id === 'ready') {
    const view = await evaluateDiscoveryReadiness(sm);
    if (view.readiness.gaps.length > 0) {
      const listed = view.readiness.gaps
        .map((g) => `${g.code}:${g.ref}`)
        .join(', ');
      return {
        exitCode: ExitCode.DISCOVERY_NOT_READY,
        error: {
          code: 'READY_GAPS',
          message: `Cannot complete ready: unresolved readiness gaps (${listed})`,
          hint: "Resolve MVP coverage / registry gaps, then re-run 'l1dder discovery status'.",
        },
      };
    }
  }

  const result = await sm.discovery.complete(id, evidence);
  if (!result.ok) {
    return discoveryDomainError(result.error);
  }

  return {
    exitCode: ExitCode.SUCCESS,
    data: { milestone: id, status: 'complete', evidence },
    humanText: `\n  ${ctx.colors.glyph.pass} Completed milestone "${id}"\n`,
  };
}
