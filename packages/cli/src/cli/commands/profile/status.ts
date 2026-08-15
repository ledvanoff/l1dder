import type { CliContext } from '../../context.js';
import { ExitCode } from '../../output/exit-codes.js';
import { profileErrorResult } from './errors.js';
import type { ProfileResult } from './profile.js';

/**
 * Execute `l1dder profile status` — show selected / recommended / enforcement.
 *
 * Reads the canonical profile projection; does not re-derive the recommendation.
 *
 * @param ctx - CLI context
 */
export async function executeProfileStatus(
  ctx: CliContext,
): Promise<ProfileResult> {
  let sm;
  try {
    sm = await ctx.state();
  } catch (error: unknown) {
    return profileErrorResult(error);
  }

  const projection = await sm.projection.project();
  const { selected, recommended, enforced } = projection.profile;

  const data = {
    action: 'status' as const,
    selected,
    recommended,
    enforced,
  };

  const lines = [
    '',
    'Workflow Profile',
    '',
    `  Selected: ${selected ?? '(none)'}`,
    `  Recommended: ${recommended}`,
    `  Enforcement: ${enforced ? 'on' : 'off'}`,
    '',
  ];

  return {
    exitCode: ExitCode.SUCCESS,
    data,
    humanText: lines.join('\n'),
  };
}
