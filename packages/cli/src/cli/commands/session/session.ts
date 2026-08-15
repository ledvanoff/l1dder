import type { CliContext } from '../../context.js';
import { ExitCode } from '../../output/exit-codes.js';
import { executeSessionEnd } from './end.js';
import { executeSessionStatus } from './status.js';
import { executeSessionStart } from './start.js';

/** Options for `l1dder session` subcommands. */
export interface SessionOptions {
  readonly profile?: string | undefined;
  readonly force?: boolean | undefined;
  readonly reason?: string | undefined;
  readonly outcome?: string | undefined;
  readonly evidence?: readonly string[] | undefined;
  readonly next?: string | undefined;
}

/** Result returned by session command handlers. */
export interface SessionResult {
  exitCode: number;
  data?: unknown;
  humanText?: string;
  error?: { code: string; message: string; hint?: string };
}

/**
 * Execute `l1dder session` — delegates to status / start / end.
 *
 * Subcommands: status (default), start, end.
 */
export async function executeSession(
  ctx: CliContext,
  subcommand: string | undefined,
  sessionId: string | undefined,
  opts: SessionOptions,
): Promise<SessionResult> {
  switch (subcommand ?? 'status') {
    case 'status':
      return executeSessionStatus(ctx);
    case 'start':
      return executeSessionStart(ctx, sessionId, opts);
    case 'end':
      return executeSessionEnd(ctx, opts);
    default:
      return {
        exitCode: ExitCode.USAGE_ERROR,
        error: {
          code: 'USAGE_ERROR',
          message: `Unknown subcommand: ${String(subcommand)}`,
          hint: 'Available: status, start, end',
        },
      };
  }
}
