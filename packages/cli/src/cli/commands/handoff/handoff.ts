import { join } from 'node:path';
import {
  HANDOFF_RELATIVE_PATH,
  generateHandoff,
} from '@l1dder/context';

import type { CliContext } from '../../context.js';
import { ExitCode } from '../../output/exit-codes.js';
import {
  mapErrorToExitCode,
  errorToCode,
  errorToHint,
} from '../../output/exit-codes.js';

/** Options for `l1dder handoff`. */
export interface HandoffOptions {
  readonly force?: boolean | undefined;
}

/** Result returned by the handoff command handler. */
export interface HandoffResult {
  exitCode: number;
  data?: unknown;
  humanText?: string;
  error?: { code: string; message: string; hint?: string };
}

/**
 * Execute `l1dder handoff` — generate or refresh `.l1dder/handoff.md`.
 *
 * Without `--force`, an existing handoff is confirmed via {@link PromptPort}.
 * In non-interactive mode (`--no-prompt` / `--json` / non-TTY) an existing
 * handoff fails with a clear message rather than silently overwriting.
 *
 * @param ctx - CLI context
 * @param opts - Flags (`--force`)
 */
export async function executeHandoff(
  ctx: CliContext,
  opts: HandoffOptions,
): Promise<HandoffResult> {
  const handoffAbs = join(ctx.cwd, HANDOFF_RELATIVE_PATH);
  const exists = await ctx.fs.exists(handoffAbs);

  if (exists && opts.force !== true) {
    if (ctx.globals.noPrompt) {
      return {
        exitCode: ExitCode.USAGE_ERROR,
        error: {
          code: 'HANDOFF_EXISTS',
          message: `${HANDOFF_RELATIVE_PATH} already exists`,
          hint: 'Pass --force to overwrite in non-interactive mode, or run without --no-prompt/--json.',
        },
      };
    }

    const confirmed = await ctx.prompt.confirm(
      `${HANDOFF_RELATIVE_PATH} already exists. Overwrite?`,
    );
    if (!confirmed) {
      return {
        exitCode: ExitCode.GENERIC_ERROR,
        error: {
          code: 'HANDOFF_CANCELLED',
          message: 'Handoff overwrite cancelled',
        },
      };
    }
  }

  let sm;
  try {
    sm = await ctx.state();
  } catch (error: unknown) {
    const hint = errorToHint(error);
    return {
      exitCode: mapErrorToExitCode(error),
      error: {
        code: errorToCode(error),
        message: messageOf(error),
        ...(hint !== undefined ? { hint } : {}),
      },
    };
  }

  const state = sm.stateSnapshot();
  const { content, truncated } = generateHandoff(state);

  await ctx.fs.mkdir(join(ctx.cwd, '.l1dder'));
  await ctx.fs.writeFile(handoffAbs, content);

  const data = {
    action: 'handoff' as const,
    path: HANDOFF_RELATIVE_PATH,
    truncated,
    overwritten: exists,
  };

  const humanText = [
    '',
    `Handoff written: ${HANDOFF_RELATIVE_PATH}`,
    truncated ? '  (content was truncated to the context budget)' : undefined,
    '',
    'Next: open a new chat and resume from the handoff',
    `  (include ${HANDOFF_RELATIVE_PATH} in the starting context)`,
    '',
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n');

  return { exitCode: ExitCode.SUCCESS, data, humanText };
}

/** Best-effort message extraction from Error or `{ message }` objects. */
function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Unknown error';
}
