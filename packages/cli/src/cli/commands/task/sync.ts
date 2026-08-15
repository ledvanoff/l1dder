import { TaskSyncService } from '@l1dder/state';

import type { CliContext } from '../../context.js';
import { ExitCode } from '../../output/exit-codes.js';
import { taskErrorResult } from './errors.js';
import type { ResolvedTasksPath, TaskResult } from './task.js';

/**
 * Execute `l1dder task sync` — project tasks.md into `state.tasks.items`.
 *
 * Idempotent: a second run reports zero added/updated/removed.
 *
 * @param ctx - CLI context
 * @param tasks - Resolved tasks.md location
 */
export async function executeTaskSync(
  ctx: CliContext,
  tasks: ResolvedTasksPath,
): Promise<TaskResult> {
  const tasksPath = tasks.absolute;
  let sm;
  try {
    sm = await ctx.state();
  } catch (error: unknown) {
    return taskErrorResult(error);
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
    return taskErrorResult(synced.error);
  }

  const saved = await sm.applyAndSave(() => synced.value.state);
  if (!saved.ok) {
    return taskErrorResult(saved.error);
  }

  const { added, updated, removed, unchanged, items } = synced.value;
  const data = {
    action: 'sync' as const,
    path: tasksPath,
    counts: { added, updated, removed, unchanged },
    tasks: items.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      depends_on: [...task.depends_on],
    })),
  };

  const changed = added + updated + removed;
  const humanText =
    changed === 0
      ? `\nTasks sync: no changes (${String(unchanged)} unchanged)\n  path: ${tasksPath}\n`
      : [
          '',
          'Tasks sync complete',
          `  path: ${tasksPath}`,
          `  added: ${String(added)}  updated: ${String(updated)}  removed: ${String(removed)}  unchanged: ${String(unchanged)}`,
          '',
        ].join('\n');

  return { exitCode: ExitCode.SUCCESS, data, humanText };
}
