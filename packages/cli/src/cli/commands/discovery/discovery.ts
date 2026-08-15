import { DiscoveryMilestoneIdSchema } from '@l1dder/schemas';
import type { DiscoveryMilestoneId } from '@l1dder/schemas';

import type { CliContext } from '../../context.js';
import { ExitCode } from '../../output/exit-codes.js';
import { executeDiscoveryStatus } from './status.js';
import { executeDiscoveryStart } from './start.js';
import { executeDiscoveryPlan } from './plan.js';
import { executeDiscoveryComplete } from './complete.js';
import { executeDiscoveryWaive } from './waive.js';
import { executeDiscoveryReopen } from './reopen.js';
import { executeDiscoverySkip } from './skip.js';

/** Options for discovery subcommands. */
export interface DiscoveryOptions {
  summary?: string | undefined;
  session?: string[] | undefined;
  evidence?: string[] | undefined;
  reason?: string | undefined;
  detailed?: boolean | undefined;
}

/** Result returned by discovery command handlers. */
export interface DiscoveryResult {
  exitCode: number;
  data?: unknown;
  humanText?: string;
  error?: { code: string; message: string; hint?: string };
}

/**
 * Execute `l1dder discovery` — delegates to the appropriate subcommand.
 *
 * Subcommands: status, start, plan, complete, waive, reopen, skip.
 */
export async function executeDiscovery(
  ctx: CliContext,
  subcommand: string | undefined,
  milestone: string | undefined,
  opts: DiscoveryOptions,
): Promise<DiscoveryResult> {
  switch (subcommand ?? 'status') {
    case 'status':
      return executeDiscoveryStatus(ctx, opts);
    case 'start':
      return withMilestone(ctx, milestone, (id) => executeDiscoveryStart(ctx, id));
    case 'plan':
      return withMilestone(ctx, milestone, (id) =>
        executeDiscoveryPlan(ctx, id, opts),
      );
    case 'complete':
      return withMilestone(ctx, milestone, (id) =>
        executeDiscoveryComplete(ctx, id, opts),
      );
    case 'waive':
      return withMilestone(ctx, milestone, (id) =>
        executeDiscoveryWaive(ctx, id, opts),
      );
    case 'reopen':
      return withMilestone(ctx, milestone, (id) =>
        executeDiscoveryReopen(ctx, id, opts),
      );
    case 'skip':
      return withMilestone(ctx, milestone, (id) =>
        executeDiscoverySkip(ctx, id, opts),
      );
    default:
      return {
        exitCode: ExitCode.USAGE_ERROR,
        error: {
          code: 'USAGE_ERROR',
          message: `Unknown subcommand: ${String(subcommand)}`,
          hint: 'Available: status, start, plan, complete, waive, reopen, skip',
        },
      };
  }
}

/**
 * Parse and validate a milestone id argument.
 */
export function parseMilestoneId(
  raw: string | undefined,
):
  | { ok: true; id: DiscoveryMilestoneId }
  | { ok: false; result: DiscoveryResult } {
  if (!raw) {
    return {
      ok: false,
      result: {
        exitCode: ExitCode.USAGE_ERROR,
        error: {
          code: 'USAGE_ERROR',
          message: '<milestone> is required',
          hint: 'Valid: idea, product, architecture, integrations, data, standards, ready',
        },
      },
    };
  }

  const parsed = DiscoveryMilestoneIdSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      result: {
        exitCode: ExitCode.USAGE_ERROR,
        error: {
          code: 'USAGE_ERROR',
          message: `Invalid milestone: "${raw}"`,
          hint: 'Valid: idea, product, architecture, integrations, data, standards, ready',
        },
      },
    };
  }

  return { ok: true, id: parsed.data };
}

async function withMilestone(
  _ctx: CliContext,
  milestone: string | undefined,
  run: (id: DiscoveryMilestoneId) => Promise<DiscoveryResult>,
): Promise<DiscoveryResult> {
  const parsed = parseMilestoneId(milestone);
  if (!parsed.ok) {
    return parsed.result;
  }
  return run(parsed.id);
}
