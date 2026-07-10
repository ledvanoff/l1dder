import type { CliContext } from '../context.js';
import {
  ExitCode,
  mapErrorToExitCode,
  errorToCode,
  errorToHint,
} from '../output/exit-codes.js';
import type { QuickOutput, Phase } from '@l1dder/schemas';

/** Result returned by executeQuick. */
interface QuickResult {
  exitCode: number;
  data?: QuickOutput;
  humanText?: string;
  error?: { code: string; message: string; hint?: string };
}

interface QuickOptions {
  finish?: boolean;
}

const MAX_DESCRIPTION_LENGTH = 200;

/** Advisory shown when starting quick/fast on a discovery-stage project. */
export const DISCOVERY_QUICK_ADVISORY =
  'Tip: this is a discovery-stage project — for a from-scratch product, prefer the full specify→plan→tasks cycle.';

/**
 * Execute `l1dder quick` or `l1dder fast` — Quick Mode orchestrator.
 *
 * Start: creates quick_task, transitions to QUICK_PLAN / FAST_IMPLEMENT.
 * Finish: drift check, mark completed, chain transitions to IDLE.
 */
export async function executeQuick(
  ctx: CliContext,
  mode: 'quick' | 'fast',
  description: string | undefined,
  opts: QuickOptions,
): Promise<QuickResult> {
  // --finish path
  if (opts.finish) {
    return executeFinish(ctx, mode);
  }

  // Start path — description required
  if (!description || description.trim().length === 0) {
    return {
      exitCode: ExitCode.USAGE_ERROR,
      error: {
        code: 'USAGE_ERROR',
        message: `Description is required: l1dder ${mode} "<description>"`,
      },
    };
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return {
      exitCode: ExitCode.USAGE_ERROR,
      error: {
        code: 'USAGE_ERROR',
        message: `Description too long (max ${String(MAX_DESCRIPTION_LENGTH)} chars)`,
      },
    };
  }

  return executeStart(ctx, mode, description.trim());
}

async function executeStart(
  ctx: CliContext,
  mode: 'quick' | 'fast',
  description: string,
): Promise<QuickResult> {
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
        ...(hint !== undefined ? { hint } : {}),
      },
    };
  }

  const slug = description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);

  const state = sm.stateSnapshot();

  const result = mode === 'quick'
    ? sm.quick.startQuick(state, slug, description)
    : sm.quick.startFast(state, slug, description);

  if (!result.ok) {
    const exitCode = mapErrorToExitCode(result.error);
    const hint = errorToHint(result.error);
    return {
      exitCode,
      error: {
        code: errorToCode(result.error),
        message: result.error.message,
        ...(hint !== undefined ? { hint } : {}),
      },
    };
  }

  const saveResult = await sm.applyAndSave(() => result.value);
  if (!saveResult.ok) {
    return {
      exitCode: ExitCode.CORRUPTED_STATE,
      error: {
        code: 'CORRUPTED_STATE',
        message: 'Failed to save state after starting quick task',
      },
    };
  }

  const newTask = result.value.quick_tasks[result.value.quick_tasks.length - 1];
  if (!newTask) {
    return {
      exitCode: ExitCode.GENERIC_ERROR,
      error: { code: 'GENERIC_ERROR', message: 'Internal error: task not created' },
    };
  }

  const targetPhase: Phase = mode === 'quick' ? 'quick_plan' : 'fast_implement';

  const data: QuickOutput = {
    quick_task: {
      id: newTask.id,
      mode,
      title: newTask.description,
      status: newTask.status,
      started_at: newTask.created_at,
    },
    transition: {
      from: 'idle' as Phase,
      to: targetPhase,
    },
    active_skill: 'quick-implement',
  };

  const g = ctx.colors.glyph;
  const lines = [
    `${g.pass} Started ${mode} task: "${description}"`,
    `  Task ID:  ${newTask.id}`,
    `  Phase:    idle → ${targetPhase}`,
  ];

  if (state.project.stage === 'discovery') {
    lines.push('');
    lines.push(`  ${ctx.colors.warning(DISCOVERY_QUICK_ADVISORY)}`);
  }

  lines.push('');
  lines.push(`  ${g.info} When done, run: l1dder ${mode} --finish`);

  const humanText = lines.join('\n');

  return { exitCode: ExitCode.SUCCESS, data, humanText };
}

async function executeFinish(
  ctx: CliContext,
  mode: 'quick' | 'fast',
): Promise<QuickResult> {
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
        ...(hint !== undefined ? { hint } : {}),
      },
    };
  }

  const state = sm.stateSnapshot();

  // Find active quick task (in_progress, matching mode)
  const activeTask = state.quick_tasks.find(
    (t) => t.status === 'in_progress',
  );

  if (!activeTask) {
    return {
      exitCode: ExitCode.GENERIC_ERROR,
      error: {
        code: 'TASK_NOT_FOUND',
        message: `No active ${mode} task found`,
        hint: `Start a ${mode} task first: l1dder ${mode} "<description>"`,
      },
    };
  }

  // Commit the quick task (includes drift check if available)
  const commitResult = mode === 'quick'
    ? await sm.quick.commitQuick(state, activeTask.id)
    : await sm.quick.commitFast(state, activeTask.id);

  if (!commitResult.ok) {
    const exitCode = mapErrorToExitCode(commitResult.error);
    return {
      exitCode,
      error: {
        code: errorToCode(commitResult.error),
        message: commitResult.error.message,
      },
    };
  }

  const saveResult = await sm.applyAndSave(() => commitResult.value);
  if (!saveResult.ok) {
    return {
      exitCode: ExitCode.CORRUPTED_STATE,
      error: {
        code: 'CORRUPTED_STATE',
        message: 'Failed to save state after completing quick task',
      },
    };
  }

  const completedTask = commitResult.value.quick_tasks.find((t) => t.id === activeTask.id);
  const hasDrift = completedTask?.knowledge_drift_warning === true;

  const data: QuickOutput = {
    quick_task: {
      id: activeTask.id,
      mode,
      title: activeTask.description,
      status: 'done',
      started_at: activeTask.created_at,
      completed_at: completedTask?.completed_at ?? ctx.clock.now(),
      knowledge_drift_warning: hasDrift,
    },
    transition: {
      from: state.workflow.current_phase,
      to: 'idle' as Phase,
    },
  };

  const g = ctx.colors.glyph;
  const lines = [
    `${g.pass} Completed ${mode} task: "${activeTask.description}"`,
    `  Task ID:  ${activeTask.id}`,
    `  Phase:    ${state.workflow.current_phase} → idle`,
  ];

  if (hasDrift) {
    lines.push('');
    lines.push(`  ${g.warn} Knowledge drift detected — consider a knowledge update session`);
  }

  return { exitCode: ExitCode.SUCCESS, data, humanText: lines.join('\n') };
}
