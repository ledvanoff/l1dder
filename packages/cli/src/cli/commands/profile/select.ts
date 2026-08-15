import { WorkflowProfileIdSchema } from '@l1dder/schemas';

import type { CliContext } from '../../context.js';
import { ExitCode } from '../../output/exit-codes.js';
import { profileErrorResult } from './errors.js';
import type { ProfileResult } from './profile.js';

/** Usage hint listing canonical {@link WorkflowProfileIdSchema} values. */
const PROFILE_HINT = `Valid: ${WorkflowProfileIdSchema.options.join(', ')}`;

/**
 * Execute `l1dder profile select <profile>`.
 *
 * Validates against {@link WorkflowProfileIdSchema}, persists via
 * `StateManager.profile.select`, then reports the new selection and next step.
 *
 * @param ctx - CLI context
 * @param profileArg - Profile id argument
 */
export async function executeProfileSelect(
  ctx: CliContext,
  profileArg: string | undefined,
): Promise<ProfileResult> {
  const raw = profileArg?.trim() ?? '';
  if (raw.length === 0) {
    return {
      exitCode: ExitCode.USAGE_ERROR,
      error: {
        code: 'USAGE_ERROR',
        message: '<profile> is required',
        hint: `Usage: l1dder profile select <profile>. ${PROFILE_HINT}`,
      },
    };
  }

  const parsed = WorkflowProfileIdSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      exitCode: ExitCode.USAGE_ERROR,
      error: {
        code: 'USAGE_ERROR',
        message: `Invalid profile: "${raw}"`,
        hint: PROFILE_HINT,
      },
    };
  }

  let sm;
  try {
    sm = await ctx.state();
  } catch (error: unknown) {
    return profileErrorResult(error);
  }

  const previous = sm.stateSnapshot().workflow.profile;
  const selected = await sm.profile.select(parsed.data);
  if (!selected.ok) {
    return profileErrorResult(selected.error);
  }

  const projection = await sm.projection.project();
  const next = projection.primaryAction;

  const data = {
    action: 'select' as const,
    previous,
    selected: parsed.data,
    enforced: true,
    next_step: {
      kind: next.kind,
      command: next.command,
      reason: next.reason,
    },
  };

  const humanText = [
    '',
    `Profile selected: ${parsed.data}`,
    `  Previous: ${previous ?? '(none)'}`,
    '  Enforcement: on',
    next.command.length > 0
      ? `  Next: ${next.command}`
      : `  Next: (none) — ${next.reason}`,
    '',
  ].join('\n');

  return { exitCode: ExitCode.SUCCESS, data, humanText };
}
