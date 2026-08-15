import type { CliContext } from '../../context.js';
import type { StageResult } from './stage.js';
import {
  ExitCode,
  mapErrorToExitCode,
  errorToCode,
  errorToHint,
} from '../../output/exit-codes.js';
import { buildHumanOutput } from '../../output/human-output.js';
import type { StageStatusOutput } from '@l1dder/schemas';
import { evaluateDiscoveryReadiness } from '../shared/discovery-readiness.js';
import {
  toBlockerBriefs,
  toPrimaryActionBrief,
} from '../shared/projection-brief.js';

/**
 * Execute `l1dder stage status` — show current stage, enforcement, readiness, history.
 *
 * Discovery Checklist uses the same ordered 7 milestones as `status` / `helpme`
 * (via {@link evaluateDiscoveryReadiness} → WorkflowProjection).
 */
export async function executeStageStatus(
  ctx: CliContext,
): Promise<StageResult & { quietSummary?: string; data?: StageStatusOutput }> {
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
  const projection = await sm.projection.project();
  const primaryAction = toPrimaryActionBrief(projection);
  const blockers = toBlockerBriefs(projection);

  const currentStage = sm.stage.currentStage(state);
  const enforcement = config.stage.enforcement.restrict_phases;

  const advanceResult = await sm.stage.canAdvance(state, config);

  let readinessData: StageStatusOutput['readiness'];
  let nextStage: string | undefined;

  if (!advanceResult.ok) {
    readinessData = {
      score: '—',
      ready: false,
      criteria: [],
    };
  } else {
    nextStage = advanceResult.value.nextStage;
    if (state.project.stage === 'discovery') {
      const view = await evaluateDiscoveryReadiness(sm);
      readinessData = {
        score: view.score,
        ready: view.ready,
        criteria: view.milestones.map((m) => ({
          id: m.id,
          label: m.label,
          status: m.status,
          met: m.met,
          required: m.required,
          evidence_count: m.evidence_count,
          planned_session_count: m.planned_session_count,
          current: m.current,
          ...(m.detail ? { detail: m.detail } : {}),
        })),
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
  }

  const history = state.project.stage_history.map((h) => ({
    from: h.from,
    to: h.to,
    timestamp: h.timestamp,
    ...(h.reason ? { reason: h.reason } : {}),
  }));

  const data = {
    stage: currentStage,
    enforcement,
    readiness: readinessData,
    history,
    primary_action: primaryAction,
    blockers: [...blockers],
  };

  const compactBody = formatStageStatusHuman(ctx, data, nextStage);
  const { humanText, quietSummary } = buildHumanOutput({
    globals: ctx.globals,
    colors: ctx.colors,
    phase: projection.phase.current,
    primaryAction,
    blockers,
    compactBody,
  });

  return { exitCode: ExitCode.SUCCESS, data, humanText, quietSummary };
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
      const cursor = c.current ? colors.info(' ←') : '';
      lines.push(`  ${glyph} ${labelText}${detailText}${cursor}`);
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
