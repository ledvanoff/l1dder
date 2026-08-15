import type { CliContext } from '../../context.js';
import { ExitCode } from '../../output/exit-codes.js';
import { profileErrorResult } from './errors.js';
import type { ProfileResult } from './profile.js';

/**
 * Execute `l1dder profile clear` — clear selection (enforcement off).
 *
 * @param ctx - CLI context
 */
export async function executeProfileClear(
  ctx: CliContext,
): Promise<ProfileResult> {
  let sm;
  try {
    sm = await ctx.state();
  } catch (error: unknown) {
    return profileErrorResult(error);
  }

  const previous = sm.stateSnapshot().workflow.profile;
  const cleared = await sm.profile.clear();
  if (!cleared.ok) {
    return profileErrorResult(cleared.error);
  }

  const data = {
    action: 'clear' as const,
    previous,
    selected: null,
    enforced: false,
  };

  const humanText = [
    '',
    'Profile cleared.',
    `  Previous: ${previous ?? '(none)'}`,
    '  Enforcement is now off.',
    '',
  ].join('\n');

  return { exitCode: ExitCode.SUCCESS, data, humanText };
}
