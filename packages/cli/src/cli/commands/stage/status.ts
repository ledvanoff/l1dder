import type { CliContext } from '../../context.js';
import type { StageResult } from './stage.js';
import {
  ExitCode,
  mapErrorToExitCode,
  errorToCode,
  errorToHint,
} from '../../output/exit-codes.js';
import type { StageStatusOutput } from '@l1dder/schemas';

/**
 * Execute `l1dder stage status` — show current stage, enforcement, readiness, history.
 *
 * Displays an ordered Discovery Checklist (milestones 1→5) with per-criterion
 * status and detail, plus a readiness score and advisory recommendation.
 */
export async function executeStageStatus(
  ctx: CliContext,
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

  const currentStage = sm.stage.currentStage(state);
  const enforcement = config.stage.enforcement.restrict_phases;

  const advanceResult = await sm.stage.canAdvance(state, config);

  let readinessData: StageStatusOutput['readiness'];

  if (!advanceResult.ok) {
    readinessData = {
      score: '—',
      ready: false,
      criteria: [],
    };
  } else {
    const { criteria } = advanceResult.value;
    const metCount = criteria.filter((c) => c.met).length;

    readinessData = {
      score: `${String(metCount)}/${String(criteria.length)}`,
      ready: criteria.every((c) => c.met),
      criteria: criteria.map((c) => ({
        id: c.id,
        label: c.label,
        met: c.met,
        detail: c.detail,
      })),
    };
  }

  const history = state.project.stage_history.map((h) => ({
    from: h.from,
    to: h.to,
    timestamp: h.timestamp,
    ...(h.reason ? { reason: h.reason } : {}),
  }));

  const data: StageStatusOutput = {
    stage: currentStage,
    enforcement,
    readiness: readinessData,
    history,
  };

  const humanText = formatStageStatusHuman(ctx, data, advanceResult.ok ? advanceResult.value.nextStage : undefined);

  return { exitCode: ExitCode.SUCCESS, data, humanText };
}

function formatStageStatusHuman(
  ctx: CliContext,
  data: StageStatusOutput,
  nextStage: string | undefined,
): string {
  const { colors } = ctx;
  const lines: string[] = [];

  lines.push('');
  lines.push(colors.dim('───────── Project Stage ─────────'));
  lines.push('');

  lines.push(`  ${colors.bold('Stage:')}       ${colors.info(data.stage)}`);
  lines.push(`  ${colors.bold('Enforcement:')} ${data.enforcement}`);
  lines.push('');

  if (data.readiness.criteria.length === 0) {
    lines.push(`  ${colors.dim('Already at final stage (maintenance)')}`);
  } else {
    lines.push(`  ${colors.bold(`Discovery Checklist${nextStage ? ` (next: ${nextStage})` : ''}`)}`);
    lines.push('');

    for (const c of data.readiness.criteria) {
      const glyph = c.met ? colors.glyph.pass : colors.glyph.fail;
      const labelText = c.met ? colors.success(c.label) : c.label;
      const detailText = c.detail ? ` — ${colors.dim(c.detail)}` : '';
      lines.push(`  ${glyph} ${labelText}${detailText}`);
    }

    lines.push('');
    const readyLabel = data.readiness.ready
      ? colors.success('READY')
      : colors.warning('NOT READY');
    lines.push(`  Score: ${data.readiness.score} — ${readyLabel}`);
  }

  if (data.history.length > 0) {
    lines.push('');
    lines.push(`  ${colors.bold('Stage History')}`);
    for (const h of data.history) {
      const date = h.timestamp.slice(0, 10);
      const reason = h.reason ? `  ${h.reason}` : '';
      lines.push(`  ${h.from} ${colors.glyph.arrow} ${h.to}  ${colors.dim(`(${date})`)}${reason}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}
