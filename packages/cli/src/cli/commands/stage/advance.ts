import { AlreadyAtStageError } from '@l1dder/core';
import type { CliContext } from '../../context.js';
import type { StageOptions, StageResult } from './stage.js';
import {
  ExitCode,
  mapErrorToExitCode,
  errorToCode,
  errorToHint,
} from '../../output/exit-codes.js';
import {
  discoveryNotReadyResult,
  forceReasonRequiredResult,
  persistForcedStageChange,
} from './forced-transition.js';

/**
 * Execute `l1dder stage advance` — advance to the next project stage.
 *
 * Discovery→delivery is a hard gate: unmet checklist criteria block with a
 * non-zero exit and no state mutation. The only bypass is `--force --reason`.
 * `--dry-run` predicts the same outcome (including exit code) without writing.
 */
export async function executeStageAdvance(
  ctx: CliContext,
  opts: StageOptions,
): Promise<StageResult> {
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
  const config = sm.configSnapshot();

  const canResult = await sm.stage.canAdvance(state, config);
  if (!canResult.ok) {
    const error = canResult.error;
    return {
      exitCode: error instanceof AlreadyAtStageError
        ? ExitCode.GENERIC_ERROR
        : ExitCode.USAGE_ERROR,
      error: {
        code: error instanceof AlreadyAtStageError ? 'ALREADY_AT_STAGE' : 'INVALID_STAGE_TRANSITION',
        message: error.message,
      },
    };
  }

  const { nextStage, criteria } = canResult.value;

  if (opts.to && opts.to !== nextStage) {
    return {
      exitCode: ExitCode.USAGE_ERROR,
      error: {
        code: 'USAGE_ERROR',
        message: `Cannot advance to '${opts.to}'. Next stage is '${nextStage}'.`,
        hint: `Use 'l1dder stage set ${opts.to}' for direct stage changes.`,
      },
    };
  }

  const allMet = criteria.every((c) => c.met);

  if (opts.force && !(opts.reason?.trim())) {
    return forceReasonRequiredResult();
  }

  if (!allMet && !opts.force) {
    return discoveryNotReadyResult(ctx, sm, nextStage, opts.dryRun === true);
  }

  const reason = opts.reason?.trim() || (allMet ? 'All criteria met' : 'Forced advancement');
  const fromStage = state.project.stage;
  const forced = Boolean(opts.force && !allMet);

  if (opts.dryRun) {
    const { colors } = ctx;
    const dryLines = [
      '',
      colors.dim('───────── Stage Advance (dry run) ─────────'),
      '',
      `  ${colors.glyph.pass} Dry run: ${fromStage} → ${colors.success(nextStage)} would succeed`,
      `  Reason: ${reason}`,
      forced ? `  ${colors.warning('(would record Decision — forced)')}` : '',
      `  ${colors.dim('No state was written.')}`,
      '',
    ].filter(Boolean);
    return {
      exitCode: ExitCode.SUCCESS,
      data: {
        from: fromStage,
        to: nextStage,
        reason,
        forced,
        dry_run: true,
      },
      humanText: dryLines.join('\n'),
    };
  }

  if (forced) {
    const persistError = await persistForcedStageChange(sm, ctx.clock.now(), {
      from: fromStage,
      to: nextStage,
      reason,
    });
    if (persistError) {
      return persistError;
    }
  } else {
    const advResult = await sm.stage.advanceStage(sm.stateSnapshot(), config);
    if (!advResult.ok) {
      const error = advResult.error;
      return {
        exitCode: mapErrorToExitCode(error),
        error: {
          code: errorToCode(error),
          message: error.message,
        },
      };
    }

    const saveResult = await sm.applyAndSave(() => advResult.value);
    if (!saveResult.ok) {
      return {
        exitCode: ExitCode.CORRUPTED_STATE,
        error: {
          code: 'CORRUPTED_STATE',
          message: saveResult.error.message,
        },
      };
    }
  }

  const { colors } = ctx;

  return {
    exitCode: ExitCode.SUCCESS,
    data: {
      from: fromStage,
      to: nextStage,
      reason,
      forced,
    },
    humanText: [
      '',
      colors.dim('───────── Stage Advanced ─────────'),
      '',
      `  ${fromStage} ${colors.glyph.arrow} ${colors.success(nextStage)}`,
      `  Reason: ${reason}`,
      forced ? `  ${colors.warning('(forced)')}` : '',
      '',
    ].filter(Boolean).join('\n'),
  };
}
