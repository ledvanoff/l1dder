import { ProjectStageSchema } from '@l1dder/schemas';
import {
  AlreadyAtStageError,
  InvalidStageTransitionError,
} from '@l1dder/core';
import type { CliContext } from '../../context.js';
import type { StageOptions, StageResult } from './stage.js';
import {
  ExitCode,
  mapErrorToExitCode,
  errorToCode,
  errorToHint,
} from '../../output/exit-codes.js';

const VALID_STAGES = ProjectStageSchema.options;

/**
 * Execute `l1dder stage set <stage>` — force-set stage directly.
 *
 * Unlike advance, allows non-sequential changes (but only forward in
 * the current implementation of StageManager).
 */
export async function executeStageSet(
  ctx: CliContext,
  opts: StageOptions,
): Promise<StageResult> {
  const targetStage = opts.to;

  if (!targetStage) {
    return {
      exitCode: ExitCode.USAGE_ERROR,
      error: {
        code: 'USAGE_ERROR',
        message: 'Target stage is required.',
        hint: `Usage: l1dder stage set --to <${VALID_STAGES.join('|')}>`,
      },
    };
  }

  if (!VALID_STAGES.includes(targetStage as typeof VALID_STAGES[number])) {
    return {
      exitCode: ExitCode.USAGE_ERROR,
      error: {
        code: 'USAGE_ERROR',
        message: `Invalid stage: '${targetStage}'.`,
        hint: `Valid stages: ${VALID_STAGES.join(', ')}`,
      },
    };
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
        message: error instanceof Error ? error.message : 'Unknown error',
        ...(hint ? { hint } : {}),
      },
    };
  }

  const state = sm.stateSnapshot();
  const reason = opts.reason ?? `Set to ${targetStage} via CLI`;

  const setResult = sm.stage.setStage(
    state,
    targetStage as typeof VALID_STAGES[number],
    reason,
  );

  if (!setResult.ok) {
    const error = setResult.error;
    const exitCode = error instanceof AlreadyAtStageError
      ? ExitCode.GENERIC_ERROR
      : error instanceof InvalidStageTransitionError
        ? ExitCode.USAGE_ERROR
        : mapErrorToExitCode(error);

    return {
      exitCode,
      error: {
        code: errorToCode(error),
        message: error.message,
      },
    };
  }

  const saveResult = await sm.applyAndSave(() => setResult.value);
  if (!saveResult.ok) {
    return {
      exitCode: ExitCode.CORRUPTED_STATE,
      error: {
        code: 'CORRUPTED_STATE',
        message: saveResult.error.message,
      },
    };
  }

  const fromStage = state.project.stage;
  const { colors } = ctx;

  return {
    exitCode: ExitCode.SUCCESS,
    data: {
      from: fromStage,
      to: targetStage,
      reason,
    },
    humanText: [
      '',
      colors.dim('───────── Stage Set ─────────'),
      '',
      `  ${fromStage} ${colors.glyph.arrow} ${colors.success(targetStage)}`,
      `  Reason: ${reason}`,
      '',
    ].join('\n'),
  };
}
