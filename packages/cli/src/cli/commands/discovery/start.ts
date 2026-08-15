import type { DiscoveryMilestoneId } from '@l1dder/schemas';

import type { CliContext } from '../../context.js';
import { ExitCode } from '../../output/exit-codes.js';
import type { DiscoveryResult } from './discovery.js';
import { discoveryDomainError, discoveryErrorResult } from './errors.js';

/**
 * Execute `l1dder discovery start <milestone>`.
 *
 * - `pending` → `startBrainstorm`
 * - `planned` → `startWork`
 */
export async function executeDiscoveryStart(
  ctx: CliContext,
  id: DiscoveryMilestoneId,
): Promise<DiscoveryResult> {
  let sm;
  try {
    sm = await ctx.state();
  } catch (error: unknown) {
    return discoveryErrorResult(error);
  }

  const initResult = await sm.discovery.initialize();
  if (!initResult.ok) {
    return discoveryDomainError(initResult.error);
  }

  const record = sm.discovery.list().find((m) => m.id === id);
  const status = record?.status ?? 'pending';

  let action: 'brainstorm' | 'work';
  let result;
  if (status === 'pending') {
    action = 'brainstorm';
    result = await sm.discovery.startBrainstorm(id);
  } else if (status === 'planned') {
    action = 'work';
    result = await sm.discovery.startWork(id);
  } else {
    return {
      exitCode: ExitCode.MILESTONE_ERROR,
      error: {
        code: 'MILESTONE_STATUS_TRANSITION',
        message: `Cannot start milestone "${id}" from status "${status}" (expected pending or planned)`,
        hint: "Run 'l1dder discovery status' to see the ordered checklist.",
      },
    };
  }

  if (!result.ok) {
    return discoveryDomainError(result.error);
  }

  const nextStatus = action === 'brainstorm' ? 'brainstorming' : 'in_progress';
  return {
    exitCode: ExitCode.SUCCESS,
    data: { milestone: id, action, status: nextStatus },
    humanText: `\n  ${ctx.colors.glyph.pass} Started ${action} on milestone "${id}" → ${nextStatus}\n`,
  };
}
