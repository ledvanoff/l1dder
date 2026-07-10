import type { CliContext } from '../context.js';
import {
  ExitCode,
  mapErrorToExitCode,
  errorToCode,
  errorToHint,
} from '../output/exit-codes.js';
import {
  Phase,
  listAvailableTransitions,
} from '@l1dder/core';
import type { WorkflowMode } from '@l1dder/core';
import type { StatusOutput } from '@l1dder/schemas';
import type { State } from '@l1dder/schemas';
import { evaluateDiscoveryReadiness } from './shared/discovery-readiness.js';

/** Result of status execution. */
interface StatusResult {
  exitCode: number;
  data?: StatusOutput;
  humanText?: string;
  error?: { code: string; message: string; hint?: string };
}

/**
 * Execute `l1dder status` — compact single-screen output of project state.
 *
 * Shows: project info, workflow position, task progress, next steps.
 */
export async function executeStatus(
  ctx: CliContext,
): Promise<StatusResult> {
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

  const taskCounts = computeTaskCounts(state);
  const nextAvailable = resolveNextAvailable(sm, state);
  const nextSteps = computeNextSteps(pos.phase, pos.status, pos.mode, taskCounts, nextAvailable);

  const config = sm.configSnapshot();
  let discoveryBrief: StatusOutput['discovery'];

  if (state.project.stage === 'discovery') {
    const rec = await evaluateDiscoveryReadiness(ctx, config);
    discoveryBrief = {
      score: rec.score,
      ready: rec.ready,
      next_milestone: rec.nextMilestone ?? null,
      milestones: rec.milestones.map((m) => ({
        order: m.order,
        id: m.id,
        label: m.label,
        met: m.met,
      })),
      message: rec.message,
    };
  }

  const data: StatusOutput = {
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
      total: taskCounts.total,
      done: taskCounts.done,
      in_progress: taskCounts.inProgress,
      pending: taskCounts.pending,
      blocked: taskCounts.blocked,
      skipped: taskCounts.skipped,
      next_available: nextAvailable,
    },
    next_steps: nextSteps,
    ...(discoveryBrief ? { discovery: discoveryBrief } : {}),
  };

  const humanText = formatHuman(ctx, state, pos, taskCounts, nextAvailable, nextSteps, discoveryBrief);

  return { exitCode: ExitCode.SUCCESS, data, humanText };
}

// ─── Task counting ───

interface TaskCounts {
  total: number;
  done: number;
  inProgress: number;
  pending: number;
  blocked: number;
  skipped: number;
}

function computeTaskCounts(state: Readonly<State>): TaskCounts {
  const items = state.tasks.items;
  const doneIds = new Set(
    items.filter((t) => t.status === 'done' || t.status === 'skipped').map((t) => t.id),
  );

  let done = 0;
  let inProgress = 0;
  let pending = 0;
  let blocked = 0;
  let skipped = 0;

  for (const task of items) {
    switch (task.status) {
      case 'done':
        done++;
        break;
      case 'in_progress':
        inProgress++;
        break;
      case 'skipped':
        skipped++;
        break;
      case 'pending': {
        const isBlocked = task.depends_on.length > 0 &&
          task.depends_on.some((dep) => !doneIds.has(dep));
        if (isBlocked) {
          blocked++;
        } else {
          pending++;
        }
        break;
      }
    }
  }

  return { total: items.length, done, inProgress, pending, blocked, skipped };
}

// ─── Next available task ───

function resolveNextAvailable(
  sm: { task: { nextTask(state: State): { ok: boolean; value?: string | null } } },
  state: Readonly<State>,
): string | null {
  const result = sm.task.nextTask(state);
  if (result.ok && result.value) {
    return result.value;
  }
  return null;
}

// ─── Next steps algorithm ───

interface NextStep {
  label: string;
  command: string | null;
  blocking: boolean;
}

function computeNextSteps(
  phase: string,
  status: string,
  mode: WorkflowMode,
  counts: TaskCounts,
  nextAvailable: string | null,
): NextStep[] {
  const steps: NextStep[] = [];

  if (phase === Phase.IDLE) {
    steps.push({ label: 'Start a new iteration', command: '/l1dder.specify', blocking: false });
    steps.push({ label: 'Quick task', command: 'l1dder quick', blocking: false });
    return steps;
  }

  if (phase === Phase.COMPLETE) {
    steps.push({ label: 'Iteration will close', command: null, blocking: false });
    return steps;
  }

  // Current in-progress tasks
  if (counts.inProgress > 0 && phase === Phase.IMPLEMENT) {
    const inProgressTask = nextAvailable ?? undefined;
    steps.push({
      label: inProgressTask
        ? `Complete current task (${inProgressTask})`
        : 'Complete current task',
      command: null,
      blocking: true,
    });
  }

  // Pending tasks with deps met
  if (counts.pending > 0 && nextAvailable && counts.inProgress === 0) {
    steps.push({
      label: `Start next task (${nextAvailable})`,
      command: null,
      blocking: false,
    });
  }

  // Available transitions from current phase
  const pos = { phase, status } as { phase: Phase; status: string };
  const transitions = listAvailableTransitions(
    pos.phase,
    mode,
  );

  for (const tr of transitions) {
    if (tr.to === phase) continue;
    const transitionLabel = phaseLabel(tr.to);
    steps.push({
      label: `Then: ${transitionLabel}`,
      command: tr.trigger.includes('slash:')
        ? `/l1dder.${tr.trigger.replace('slash:', '')}`
        : null,
      blocking: false,
    });
    break;
  }

  return steps;
}

function phaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    [Phase.IDLE]: 'idle',
    [Phase.SPECIFY]: 'specify',
    [Phase.PLAN]: 'plan',
    [Phase.UPDATE_TOBE]: 'update_tobe',
    [Phase.TASKS]: 'tasks',
    [Phase.IMPLEMENT]: 'implement',
    [Phase.UPDATE_ASIS]: 'update_asis',
    [Phase.COMPLETE]: 'complete',
    [Phase.REVIEW]: 'review',
  };
  return labels[phase] ?? phase;
}

// ─── Human output ───

function formatHuman(
  ctx: CliContext,
  state: Readonly<State>,
  pos: { phase: string; status: string; mode: string; iteration: number; stage: string },
  counts: TaskCounts,
  nextAvailable: string | null,
  nextSteps: NextStep[],
  discovery?: StatusOutput['discovery'],
): string {
  const { colors } = ctx;
  const lines: string[] = [];

  lines.push('');
  lines.push(colors.dim('───────── L1DDER Status ─────────'));
  lines.push('');

  lines.push(`  Project:   ${colors.bold(state.project.name)}`);
  lines.push(`  Stage:     ${pos.stage} (${pos.stage === 'discovery' ? 'advisory' : 'standard'} enforcement)`);
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
    lines.push(`  Score: ${discovery.score} — ${discovery.ready ? colors.success('READY') : colors.warning('NOT READY')}`);
    lines.push('');
  }

  if (counts.total > 0) {
    lines.push(`  Tasks (${String(counts.total)} total)`);
    for (const task of state.tasks.items) {
      const glyph = taskGlyph(task.status, colors);
      lines.push(`  ${glyph} ${task.id}: ${task.title}  ${colors.dim(task.status)}`);
    }
    lines.push('');

    const progressParts: string[] = [];
    if (counts.done > 0) progressParts.push(`${String(counts.done)}/${String(counts.total)} done`);
    if (counts.inProgress > 0) progressParts.push(`${String(counts.inProgress)} in progress`);
    if (counts.blocked > 0) progressParts.push(`${String(counts.blocked)} blocked`);
    if (counts.skipped > 0) progressParts.push(`${String(counts.skipped)} skipped`);
    lines.push(`  Progress: ${progressParts.join(' · ')}`);
    lines.push('');
  }

  if (nextSteps.length > 0) {
    lines.push('  Next Steps');
    for (const step of nextSteps) {
      const cmd = step.command ? ` (${step.command})` : '';
      lines.push(`  ${colors.glyph.arrow} ${step.label}${cmd}`);
    }
  }

  lines.push('');
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
