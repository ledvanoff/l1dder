import { isAbsolute, join, relative, sep } from 'node:path';

import type { CliContext } from '../../context.js';
import { ExitCode } from '../../output/exit-codes.js';
import { DEFAULT_TASKS_RELATIVE_PATH } from '../shared/default-tasks-path.js';
import { executeTaskList } from './list.js';
import { executeTaskSync } from './sync.js';
import { executeTaskComplete } from './complete.js';

/** Options for `l1dder task` subcommands. */
export interface TaskOptions {
  readonly file?: string | undefined;
}

/** Result returned by task command handlers. */
export interface TaskResult {
  exitCode: number;
  data?: unknown;
  humanText?: string;
  error?: { code: string; message: string; hint?: string };
}

/** Both forms of the resolved tasks.md location. */
export interface ResolvedTasksPath {
  /** Absolute path used for filesystem access. */
  readonly absolute: string;
  /**
   * Project-relative path recorded in `state.tasks.source_path`.
   *
   * `undefined` when `--file` points outside the project: an absolute or
   * escaping path is not portable, so it is used for this run only and never
   * written into shared state.
   */
  readonly relative: string | undefined;
}

/**
 * Resolve the tasks.md location from `--file` or the shared default.
 *
 * Relative paths are resolved against the CLI project root (`ctx.cwd`).
 *
 * @param ctx - CLI context
 * @param opts - Command options
 */
export function resolveTasksPath(
  ctx: CliContext,
  opts: TaskOptions,
): ResolvedTasksPath {
  const raw = opts.file?.trim() || DEFAULT_TASKS_RELATIVE_PATH;
  const absolute = isAbsolute(raw) ? raw : join(ctx.cwd, raw);
  const relative = toProjectRelative(ctx.cwd, absolute);
  return { absolute, relative };
}

/**
 * Express a path relative to the project root, when it lives inside it.
 *
 * @param projectRoot - CLI project root
 * @param absolute - Absolute path to express
 * @returns POSIX project-relative path, or `undefined` when outside the project
 */
function toProjectRelative(
  projectRoot: string,
  absolute: string,
): string | undefined {
  const rel = relative(projectRoot, absolute);
  if (rel.length === 0 || rel.startsWith('..') || isAbsolute(rel)) {
    return undefined;
  }
  return rel.split(sep).join('/');
}

/**
 * Execute `l1dder task` — delegates to list / sync / complete.
 *
 * Subcommands: list (default), sync, complete.
 */
export async function executeTask(
  ctx: CliContext,
  subcommand: string | undefined,
  arg: string | undefined,
  opts: TaskOptions,
): Promise<TaskResult> {
  const tasksPath = resolveTasksPath(ctx, opts);

  switch (subcommand ?? 'list') {
    case 'list':
      return executeTaskList(ctx, tasksPath.absolute);
    case 'sync':
      return executeTaskSync(ctx, tasksPath);
    case 'complete':
      return executeTaskComplete(ctx, tasksPath, arg);
    default:
      return {
        exitCode: ExitCode.USAGE_ERROR,
        error: {
          code: 'USAGE_ERROR',
          message: `Unknown subcommand: ${String(subcommand)}`,
          hint: 'Available: list, sync, complete',
        },
      };
  }
}
