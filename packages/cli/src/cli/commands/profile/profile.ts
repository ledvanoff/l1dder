import type { CliContext } from '../../context.js';
import { ExitCode } from '../../output/exit-codes.js';
import { executeProfileClear } from './clear.js';
import { executeProfileSelect } from './select.js';
import { executeProfileStatus } from './status.js';

/** Result returned by profile command handlers. */
export interface ProfileResult {
  exitCode: number;
  data?: unknown;
  humanText?: string;
  error?: { code: string; message: string; hint?: string };
}

/**
 * Execute `l1dder profile` — delegates to status / select / clear.
 *
 * Subcommands: status (default), select, clear.
 *
 * @param ctx - CLI context
 * @param subcommand - Subcommand name, or undefined for status
 * @param profileArg - Profile id for `select`
 */
export async function executeProfile(
  ctx: CliContext,
  subcommand: string | undefined,
  profileArg: string | undefined,
): Promise<ProfileResult> {
  switch (subcommand ?? 'status') {
    case 'status':
      return executeProfileStatus(ctx);
    case 'select':
      return executeProfileSelect(ctx, profileArg);
    case 'clear':
      return executeProfileClear(ctx);
    default:
      return {
        exitCode: ExitCode.USAGE_ERROR,
        error: {
          code: 'USAGE_ERROR',
          message: `Unknown subcommand: ${String(subcommand)}`,
          hint: 'Available: status, select, clear',
        },
      };
  }
}
