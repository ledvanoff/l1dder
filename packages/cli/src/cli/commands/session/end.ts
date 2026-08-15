import { join } from 'node:path';
import {
  HANDOFF_RELATIVE_PATH,
  generateHandoff,
} from '@l1dder/context';
import { AgentSessionOutcomeSchema } from '@l1dder/schemas';
import type { AgentSessionOutcome, AgentSessionRecord } from '@l1dder/schemas';

import type { CliContext } from '../../context.js';
import { ExitCode } from '../../output/exit-codes.js';
import { sessionErrorResult } from './errors.js';
import type { SessionOptions, SessionResult } from './session.js';

/**
 * Execute `l1dder session end`.
 *
 * Ends the active Agent Session via {@link StateManager.session.end}.
 * For `interrupted` / `handed_off`, also refreshes `.l1dder/handoff.md`.
 * Outcome `completed` does not write a handoff.
 *
 * @param ctx - CLI context
 * @param opts - Flags (`--outcome`, `--evidence`, `--next`)
 */
export async function executeSessionEnd(
  ctx: CliContext,
  opts: SessionOptions,
): Promise<SessionResult> {
  const outcomeResult = parseOutcome(opts.outcome);
  if (!outcomeResult.ok) {
    return outcomeResult.result;
  }

  let sm;
  try {
    sm = await ctx.state();
  } catch (error: unknown) {
    return sessionErrorResult(error);
  }

  const evidence = opts.evidence ?? [];
  const nextAction =
    opts.next !== undefined && opts.next.trim().length > 0
      ? opts.next.trim()
      : null;

  const ended = await sm.session.end({
    outcome: outcomeResult.outcome,
    evidence,
    nextAction,
  });

  if (!ended.ok) {
    return sessionErrorResult(ended.error);
  }

  const record = ended.value;
  let handoffPath: string | undefined;

  if (
    outcomeResult.outcome === 'interrupted' ||
    outcomeResult.outcome === 'handed_off'
  ) {
    const written = await writeHandoff(ctx);
    if (!written.ok) {
      return written.result;
    }
    handoffPath = written.path;
  }

  const data = {
    action: 'end' as const,
    record,
    ...(handoffPath !== undefined ? { handoff: handoffPath } : {}),
  };

  return {
    exitCode: ExitCode.SUCCESS,
    data,
    humanText: formatHumanEnd(record, handoffPath),
  };
}

function parseOutcome(
  raw: string | undefined,
):
  | { ok: true; outcome: AgentSessionOutcome }
  | { ok: false; result: SessionResult } {
  if (raw === undefined || raw.trim().length === 0) {
    return {
      ok: false,
      result: {
        exitCode: ExitCode.USAGE_ERROR,
        error: {
          code: 'USAGE_ERROR',
          message: '--outcome is required',
          hint: 'Usage: l1dder session end --outcome <completed|interrupted|handed_off> [--evidence <text>] [--next <text>]',
        },
      },
    };
  }

  const parsed = AgentSessionOutcomeSchema.safeParse(raw.trim());
  if (!parsed.success) {
    return {
      ok: false,
      result: {
        exitCode: ExitCode.USAGE_ERROR,
        error: {
          code: 'USAGE_ERROR',
          message: `Invalid outcome: "${raw}"`,
          hint: 'Valid: completed, interrupted, handed_off',
        },
      },
    };
  }

  return { ok: true, outcome: parsed.data };
}

async function writeHandoff(
  ctx: CliContext,
): Promise<
  | { ok: true; path: string }
  | { ok: false; result: SessionResult }
> {
  try {
    const sm = await ctx.state();
    const state = sm.stateSnapshot();
    const { content } = generateHandoff(state);
    const handoffPath = join(ctx.cwd, HANDOFF_RELATIVE_PATH);
    await ctx.fs.mkdir(join(ctx.cwd, '.l1dder'));
    await ctx.fs.writeFile(handoffPath, content);
    return { ok: true, path: HANDOFF_RELATIVE_PATH };
  } catch (error: unknown) {
    return {
      ok: false,
      result: {
        exitCode: ExitCode.GENERIC_ERROR,
        error: {
          code: 'HANDOFF_WRITE_FAILED',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to write handoff.md',
        },
      },
    };
  }
}

/**
 * Human-readable Done / Next block for session end.
 */
function formatHumanEnd(
  record: AgentSessionRecord,
  handoffPath: string | undefined,
): string {
  const evidenceLines =
    record.evidence.length > 0
      ? record.evidence.map((e) => `  - ${e}`).join('\n')
      : '  (none)';

  const lines = [
    '',
    `Session ended: ${record.session}`,
    `  Outcome: ${record.outcome}`,
    `  Profile: ${record.profile}`,
    `  Started: ${record.started_at}`,
    `  Ended:   ${record.ended_at}`,
    '  Evidence:',
    evidenceLines,
  ];

  if (handoffPath !== undefined) {
    lines.push(`  Handoff: ${handoffPath}`);
  }

  lines.push('');
  lines.push('Done / Next');
  lines.push(
    `  Done: ended session ${record.session} as ${record.outcome}`,
  );

  const next =
    record.next_action ??
    (handoffPath !== undefined
      ? `Open a new chat and resume from ${handoffPath} (or run \`l1dder\`)`
      : 'Run `l1dder` (or `l1dder session status`) for the next step');
  lines.push(`  Next: ${next}`);
  lines.push('');

  return lines.join('\n');
}
