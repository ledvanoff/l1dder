import type { Task } from '@l1dder/schemas';

import type { CliContext } from '../../context.js';
import { ExitCode } from '../../output/exit-codes.js';
import { taskErrorResult } from './errors.js';
import type { TaskResult } from './task.js';

/** Glyphs for task status in human output. */
const STATUS_GLYPH: Readonly<Record<Task['status'], string>> = {
  pending: '○',
  in_progress: '●',
  done: '✓',
  skipped: '–',
};

/**
 * Execute `l1dder task list` — render `state.tasks.items`.
 *
 * When the projection is empty and the tasks file exists, points the user at
 * `l1dder task sync`.
 *
 * @param ctx - CLI context
 * @param tasksPath - Absolute path to tasks.md
 */
export async function executeTaskList(
  ctx: CliContext,
  tasksPath: string,
): Promise<TaskResult> {
  let sm;
  try {
    sm = await ctx.state();
  } catch (error: unknown) {
    return taskErrorResult(error);
  }

  const items = sm.stateSnapshot().tasks.items;
  const done = items.filter(
    (task) => task.status === 'done' || task.status === 'skipped',
  ).length;

  const data = {
    action: 'list' as const,
    path: tasksPath,
    tasks: items.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      depends_on: [...task.depends_on],
    })),
    summary: { done, total: items.length },
  };

  const lines: string[] = ['', 'Tasks', ''];

  if (items.length === 0) {
    const fileExists = await ctx.fs.exists(tasksPath);
    if (fileExists) {
      lines.push(
        '  Projection is empty while tasks.md exists.',
        '  Run `l1dder task sync` to project tasks into state.',
        '',
      );
    } else {
      lines.push('  No tasks in state (and tasks.md not found).', '');
    }
  } else {
    for (const task of items) {
      const glyph = STATUS_GLYPH[task.status];
      const deps =
        task.depends_on.length > 0 ? task.depends_on.join(', ') : '—';
      lines.push(`  ${glyph} ${task.id}  ${task.title}  [${deps}]`);
    }
    lines.push('');
    lines.push(`  Summary: ${String(done)}/${String(items.length)} done`);
    lines.push('');
  }

  return {
    exitCode: ExitCode.SUCCESS,
    data,
    humanText: lines.join('\n'),
  };
}
