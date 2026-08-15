import type { CliContext } from '../../context.js';
import { ExitCode } from '../../output/exit-codes.js';
import { executeStageStatus } from './status.js';
import { executeStageAdvance } from './advance.js';
import { executeStageSet } from './set.js';

/** Options for stage subcommands. */
export interface StageOptions {
  to?: string | undefined;
  force?: boolean | undefined;
  reason?: string | undefined;
  yes?: boolean | undefined;
  /** Validate advance without mutating state (DF-012). */
  dryRun?: boolean | undefined;
}

/** Result returned by stage command handlers. */
export interface StageResult {
  exitCode: number;
  data?: unknown;
  humanText?: string;
  quietSummary?: string;
  error?: { code: string; message: string; hint?: string };
}

/**
 * Execute `l1dder stage` — delegates to the appropriate subcommand.
 *
 * Subcommands: status (default), advance, set.
 */
export async function executeStage(
  ctx: CliContext,
  subcommand: string | undefined,
  opts: StageOptions,
): Promise<StageResult> {
  switch (subcommand ?? 'status') {
    case 'status':
      return executeStageStatus(ctx);
    case 'advance':
      return executeStageAdvance(ctx, opts);
    case 'set':
      return executeStageSet(ctx, opts);
    default:
      return {
        exitCode: ExitCode.USAGE_ERROR,
        error: {
          code: 'USAGE_ERROR',
          message: `Unknown subcommand: ${String(subcommand)}`,
          hint: 'Available subcommands: status, advance, set',
        },
      };
  }
}
