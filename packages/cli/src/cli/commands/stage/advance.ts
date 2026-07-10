import { AlreadyAtStageError } from '@l1dder/core';
import type { CliContext } from '../../context.js';
import type { StageOptions, StageResult } from './stage.js';
import {
  ExitCode,
  mapErrorToExitCode,
  errorToCode,
  errorToHint,
} from '../../output/exit-codes.js';
import type { CriterionResult } from '@l1dder/state';

/**
 * Execute `l1dder stage advance` — advance to the next project stage.
 *
 * Shows readiness wizard when criteria are not met, unless `--force --reason` is given.
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

  const metCount = criteria.filter((c) => c.met).length;
  const allMet = criteria.every((c) => c.met);

  if (!allMet && !opts.force) {
    const readinessText = formatReadinessBlock(ctx, criteria, metCount);

    const confirmed = opts.yes
      ? true
      : await ctx.prompt.confirm(`Advance to '${nextStage}' despite unmet criteria?`);

    if (!confirmed) {
      return {
        exitCode: ExitCode.SUCCESS,
        humanText: readinessText + `\n  ${ctx.colors.dim('Advance cancelled.')}\n`,
      };
    }
  }

  if (opts.force && !opts.reason) {
    return {
      exitCode: ExitCode.USAGE_ERROR,
      error: {
        code: 'USAGE_ERROR',
        message: '--force requires --reason',
        hint: 'Provide a reason: --force --reason "..."',
      },
    };
  }

  const reason = opts.reason ?? (allMet ? 'All criteria met' : 'Forced advancement');

  const advResult = await sm.stage.advanceStage(state, config);
  if (!advResult.ok) {
    const error = advResult.error;
    return {
      exitCode: ExitCode.GENERIC_ERROR,
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

  const fromStage = state.project.stage;
  const { colors } = ctx;

  return {
    exitCode: ExitCode.SUCCESS,
    data: {
      from: fromStage,
      to: nextStage,
      reason,
      forced: opts.force ?? false,
    },
    humanText: [
      '',
      colors.dim('───────── Stage Advanced ─────────'),
      '',
      `  ${fromStage} ${colors.glyph.arrow} ${colors.success(nextStage)}`,
      `  Reason: ${reason}`,
      opts.force ? `  ${colors.warning('(forced)')}` : '',
      '',
    ].filter(Boolean).join('\n'),
  };
}

function formatReadinessBlock(
  ctx: CliContext,
  criteria: readonly CriterionResult[],
  metCount: number,
): string {
  const { colors } = ctx;
  const lines: string[] = [];
  lines.push('');
  lines.push(colors.dim('───────── Discovery Readiness ─────────'));
  lines.push('');

  for (const c of criteria) {
    const glyph = c.met ? colors.glyph.pass : colors.glyph.fail;
    const labelText = c.met ? colors.success(c.label) : c.label;
    const detailText = c.detail ? ` — ${colors.dim(c.detail)}` : '';
    lines.push(`  ${glyph} ${labelText}${detailText}`);
  }

  lines.push('');
  lines.push(`  Score: ${String(metCount)}/${String(criteria.length)} — ${colors.warning('NOT READY')}`);
  lines.push('');

  return lines.join('\n');
}
