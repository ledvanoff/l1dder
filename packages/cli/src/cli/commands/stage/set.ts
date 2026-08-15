import { ProjectStageSchema } from '@l1dder/schemas';
import type { ProjectStage } from '@l1dder/schemas';
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
import {
  discoveryNotReadyResult,
  forceReasonRequiredResult,
  persistForcedStageChange,
} from './forced-transition.js';

const VALID_STAGES = ProjectStageSchema.options;

/**
 * Execute `l1dder stage set --to <stage>` — set stage to a specific forward target.
 *
 * Shares the discovery→delivery hard gate with `stage advance`: unmet
 * checklist criteria refuse unless `--force --reason` records an audited
 * waiver (Decision + forced). Backward transitions stay forbidden.
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
  const target = targetStage as ProjectStage;
  const fromStage = state.project.stage;

  if (opts.force && !(opts.reason?.trim())) {
    return forceReasonRequiredResult();
  }

  const needsWaiver = sm.stage.requiresForceWaiver(state, target);
  if (needsWaiver && !opts.force) {
    return discoveryNotReadyResult(ctx, sm, target, false);
  }

  const forced = Boolean(opts.force && needsWaiver);
  const reason = opts.reason?.trim() || (forced ? 'Forced advancement' : `Set to ${target} via CLI`);

  if (forced) {
    const persistError = await persistForcedStageChange(sm, ctx.clock.now(), {
      from: fromStage,
      to: target,
      reason,
    });
    if (persistError) {
      return persistError;
    }
  } else {
    const setResult = sm.stage.setStage(state, target, reason);

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
  }

  const { colors } = ctx;

  return {
    exitCode: ExitCode.SUCCESS,
    data: {
      from: fromStage,
      to: target,
      reason,
      forced,
    },
    humanText: [
      '',
      colors.dim('───────── Stage Set ─────────'),
      '',
      `  ${fromStage} ${colors.glyph.arrow} ${colors.success(target)}`,
      `  Reason: ${reason}`,
      forced ? `  ${colors.warning('(forced)')}` : '',
      '',
    ].filter(Boolean).join('\n'),
  };
}
