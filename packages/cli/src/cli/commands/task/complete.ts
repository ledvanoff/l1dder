import {
  AtomicWriter,
  TaskSyncService,
  ensureDependenciesMetForComplete,
  parseTasksMarkdown,
  setTaskStatusInMarkdown,
} from '@l1dder/state';

import type { CliContext } from '../../context.js';
import {
  ExitCode,
  errorToCode,
  mapErrorToExitCode,
} from '../../output/exit-codes.js';
import { taskErrorResult } from './errors.js';
import type { ResolvedTasksPath, TaskResult } from './task.js';

/**
 * Execute `l1dder task complete <T-NN>`.
 *
 * Markdown is the source of truth: update the Status cell atomically, then
 * sync so `state.tasks.items` matches the file. Already-done tasks are a
 * successful no-op. Unmet `depends_on` (not done/skipped) reject before any
 * write. If sync fails after the write, the error is reported clearly (file
 * and state may disagree until the next successful sync).
 *
 * @param ctx - CLI context
 * @param tasks - Resolved tasks.md location
 * @param taskId - Task id argument (`T-NN`)
 */
export async function executeTaskComplete(
  ctx: CliContext,
  tasks: ResolvedTasksPath,
  taskId: string | undefined,
): Promise<TaskResult> {
  const tasksPath = tasks.absolute;
  if (!taskId || taskId.trim().length === 0) {
    return {
      exitCode: ExitCode.USAGE_ERROR,
      error: {
        code: 'USAGE_ERROR',
        message: '<task-id> is required',
        hint: 'Usage: l1dder task complete T-01',
      },
    };
  }

  const id = taskId.trim();

  let sm;
  try {
    sm = await ctx.state();
  } catch (error: unknown) {
    return taskErrorResult(error);
  }

  const exists = await ctx.fs.exists(tasksPath);
  if (!exists) {
    return taskErrorResult({
      code: 'TASKS_FILE_NOT_FOUND',
      message: `Tasks file not found: ${tasksPath}`,
    });
  }

  let content: string;
  try {
    content = await ctx.fs.readFile(tasksPath);
  } catch (cause: unknown) {
    return taskErrorResult({
      code: 'TASKS_FILE_NOT_FOUND',
      message: `Tasks file not found: ${tasksPath} (${String(cause)})`,
    });
  }

  const parsed = parseTasksMarkdown(content);
  if (!parsed.ok) {
    return taskErrorResult(parsed.error);
  }

  const current = parsed.value.tasks.find((task) => task.id === id);
  // Already-done is an idempotent success; only pending/in_progress completions
  // must pass the depends_on guard.
  if (current !== undefined && current.status !== 'done') {
    const depsOk = ensureDependenciesMetForComplete(parsed.value.tasks, id);
    if (!depsOk.ok) {
      return taskErrorResult(depsOk.error);
    }
  }

  const updated = setTaskStatusInMarkdown(content, id, 'done');
  if (!updated.ok) {
    return taskErrorResult(updated.error);
  }

  const noop = updated.value === content;
  if (!noop) {
    const writer = new AtomicWriter({ fs: ctx.fs, logger: ctx.logger });
    const written = await writer.write(tasksPath, updated.value);
    if (!written.ok) {
      return taskErrorResult(written.error);
    }
  }

  const syncer = new TaskSyncService({
    fs: ctx.fs,
    clock: ctx.clock,
    logger: ctx.logger,
  });
  const synced = await syncer.sync(
    sm.stateSnapshot(),
    tasksPath,
    tasks.relative,
  );
  if (!synced.ok) {
    return {
      exitCode: mapErrorToExitCode(synced.error),
      error: {
        code: synced.error.code,
        message: `Task ${id} was written to tasks.md but sync into state failed: ${synced.error.message}`,
        hint: 'Re-run `l1dder task sync` to reconcile state with the file.',
      },
    };
  }

  const saved = await sm.applyAndSave(() => synced.value.state);
  if (!saved.ok) {
    return {
      exitCode: mapErrorToExitCode(saved.error),
      error: {
        code: errorToCode(saved.error),
        message: `Task ${id} was written to tasks.md but persisting state failed: ${saved.error.message}`,
        hint: 'Re-run `l1dder task sync` to reconcile state with the file.',
      },
    };
  }

  const task = synced.value.items.find((item) => item.id === id);
  const data = {
    action: 'complete' as const,
    path: tasksPath,
    task_id: id,
    status: task?.status ?? 'done',
    noop,
    counts: {
      added: synced.value.added,
      updated: synced.value.updated,
      removed: synced.value.removed,
      unchanged: synced.value.unchanged,
    },
  };

  const humanText = noop
    ? `\nTask ${id} is already done (no-op).\n`
    : `\nTask ${id} marked done and synced into state.\n`;

  return { exitCode: ExitCode.SUCCESS, data, humanText };
}
