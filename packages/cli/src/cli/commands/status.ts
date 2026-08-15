import type { CliContext } from '../context.js';
import {
  ExitCode,
  mapErrorToExitCode,
  errorToCode,
  errorToHint,
} from '../output/exit-codes.js';
import { buildHumanOutput } from '../output/human-output.js';
import type { StatusOutput } from '@l1dder/schemas';
import type { State } from '@l1dder/schemas';
import type { WorkflowProjection } from '@l1dder/state';
import { evaluateDiscoveryReadiness } from './shared/discovery-readiness.js';
import {
  formatQuietSummary,
  toBlockerBriefs,
  toPrimaryActionBrief,
} from './shared/projection-brief.js';

/** Result of status execution. */
interface StatusResult {
  exitCode: number;
  data?: StatusOutput;
  humanText?: string;
  quietSummary?: string;
  error?: { code: string; message: string; hint?: string };
}

/**
 * Execute `l1dder status` — compact single-screen output of project state.
 *
 * All next-step / task-count facts come from {@link StateManager.projection};
 * human output follows progressive disclosure (one Primary Action by default).
 */
export async function executeStatus(ctx: CliContext): Promise<StatusResult> {
  let sm;
  try {
    sm = await ctx.state();
  } catch (error: unknown) {
    const exitCode = mapErrorToExitCode(error);
    const hint = errorToHint(error);
    return {
      exitCode,
      error: {
        code: errorToCode(error),
        message: error instanceof Error ? error.message : 'Unknown error',
        ...(hint ? { hint } : {}),
      },
    };
  }

  const state = sm.stateSnapshot();
  const pos = sm.currentPosition();
  const projection = await sm.projection.project();
  const primaryAction = toPrimaryActionBrief(projection);
  const blockers = toBlockerBriefs(projection);
  const progress = projection.progress;

  const nextSteps = buildNextStepsFromProjection(projection);

  let discoveryBrief: StatusOutput['discovery'];

  if (state.project.stage === 'discovery') {
    const view = await evaluateDiscoveryReadiness(sm);
    discoveryBrief = {
      score: view.score,
      ready: view.ready,
      next_milestone: view.next_milestone,
      milestones: view.milestones.map((m) => ({
        order: m.order,
        id: m.id,
        label: m.label,
        status: m.status,
        met: m.met,
        required: m.required,
        evidence_count: m.evidence_count,
        planned_session_count: m.planned_session_count,
        current: m.current,
      })),
      message: view.message,
      primary_action: view.primary_action,
      blockers: view.blockers.map((b) => ({ ...b })),
    };
  }

  const data = {
    project: {
      name: state.project.name,
      stage: state.project.stage,
      created: state.project.created_at,
    },
    workflow: {
      phase: pos.phase,
      status: pos.status,
      mode: pos.mode,
      iteration: pos.iteration > 0 ? String(pos.iteration) : null,
    },
    tasks: {
      total: progress.tasksTotal,
      done: progress.tasksDone,
      in_progress: progress.tasksInProgress,
      pending: progress.tasksPending,
      blocked: progress.tasksBlocked,
      skipped: progress.tasksSkipped,
      next_available: progress.nextAvailable,
    },
    next_steps: nextSteps,
    ...(discoveryBrief ? { discovery: discoveryBrief } : {}),
    primary_action: primaryAction,
    blockers: [...blockers],
  };

  const compactBody = formatCompactBody(ctx, state, pos, discoveryBrief);
  const verboseExtra = formatVerboseExtra(ctx, state, projection);

  const { humanText, quietSummary } = buildHumanOutput({
    globals: ctx.globals,
    colors: ctx.colors,
    phase: pos.phase,
    primaryAction,
    blockers,
    compactBody,
    verboseExtra,
  });

  return {
    exitCode: ExitCode.SUCCESS,
    data,
    humanText,
    quietSummary: quietSummary || formatQuietSummary(pos.phase, primaryAction),
  };
}

// ─── Projection → next_steps (JSON / verbose machine picture) ───

function buildNextStepsFromProjection(
  projection: WorkflowProjection,
): StatusOutput['next_steps'] {
  const steps: StatusOutput['next_steps'] = [
    {
      label: projection.primaryAction.reason,
      command: projection.primaryAction.command || null,
      blocking: projection.blockers.length > 0,
    },
  ];

  for (const alt of projection.phase.alternatives) {
    if (projection.primaryAction.to === alt) continue;
    steps.push({
      label: `Alternative transition: ${alt}`,
      command: `l1dder transition --to ${alt}`,
      blocking: false,
    });
  }

  return steps;
}

// ─── Human output ───

function formatCompactBody(
  ctx: CliContext,
  state: Readonly<State>,
  pos: { phase: string; status: string; mode: string; iteration: number; stage: string },
  discovery?: StatusOutput['discovery'],
): string {
  const { colors } = ctx;
  const lines: string[] = [];

  lines.push('');
  lines.push(colors.dim('───────── L1DDER Status ─────────'));
  lines.push('');

  lines.push(`  Project:   ${colors.bold(state.project.name)}`);
  lines.push(
    `  Stage:     ${pos.stage} (${pos.stage === 'discovery' ? 'advisory' : 'standard'} enforcement)`,
  );
  lines.push(`  Created:   ${formatDate(state.project.created_at)}`);
  lines.push('');

  lines.push('  Workflow');
  lines.push(`  Phase:     ${colors.info(pos.phase)} (${pos.status})`);
  lines.push(`  Mode:      ${pos.mode}`);
  if (pos.iteration > 0) {
    lines.push(`  Iteration: ${String(pos.iteration)}`);
  }
  lines.push('');

  if (discovery && discovery.milestones.length > 0) {
    lines.push('  Discovery (brief)');
    if (discovery.next_milestone) {
      lines.push(`  Next milestone: ${discovery.next_milestone}`);
    }
    for (const m of discovery.milestones) {
      const glyph = m.met ? colors.glyph.pass : colors.glyph.fail;
      lines.push(`  ${glyph} ${m.label}`);
    }
    lines.push(
      `  Score: ${discovery.score} — ${discovery.ready ? colors.success('READY') : colors.warning('NOT READY')}`,
    );
    lines.push('');
  }

  return lines.join('\n');
}

function formatVerboseExtra(
  ctx: CliContext,
  state: Readonly<State>,
  projection: WorkflowProjection,
): string {
  const { colors } = ctx;
  const lines: string[] = [];
  const p = projection.progress;

  if (p.tasksTotal > 0) {
    lines.push(`  Tasks (${String(p.tasksTotal)} total)`);
    for (const task of state.tasks.items) {
      const glyph = taskGlyph(task.status, colors);
      lines.push(`  ${glyph} ${task.id}: ${task.title}  ${colors.dim(task.status)}`);
    }
    lines.push('');
    const progressParts: string[] = [];
    if (p.tasksDone > 0) {
      progressParts.push(`${String(p.tasksDone)}/${String(p.tasksTotal)} done`);
    }
    if (p.tasksInProgress > 0) {
      progressParts.push(`${String(p.tasksInProgress)} in progress`);
    }
    if (p.tasksPending > 0) {
      progressParts.push(`${String(p.tasksPending)} pending`);
    }
    if (p.tasksBlocked > 0) {
      progressParts.push(`${String(p.tasksBlocked)} blocked`);
    }
    if (p.tasksSkipped > 0) {
      progressParts.push(`${String(p.tasksSkipped)} skipped`);
    }
    if (p.nextAvailable) {
      progressParts.push(`next: ${p.nextAvailable}`);
    }
    lines.push(`  Progress: ${progressParts.join(' · ')}`);
    lines.push('');
  }

  if (projection.phase.alternatives.length > 0) {
    lines.push('  Alternative transitions');
    for (const alt of projection.phase.alternatives) {
      lines.push(`  ${colors.glyph.arrow} l1dder transition --to ${alt}`);
    }
    lines.push('');
  }

  if (projection.readiness.gaps.length > 0) {
    lines.push('  Readiness evidence gaps');
    for (const gap of projection.readiness.gaps) {
      lines.push(`  ${colors.glyph.warn} [${gap.code}] ${gap.message}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function taskGlyph(status: string, colors: CliContext['colors']): string {
  switch (status) {
    case 'done':
      return colors.success('✓');
    case 'in_progress':
      return colors.info('⚙');
    case 'skipped':
      return colors.dim('–');
    default:
      return colors.dim('○');
  }
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}
