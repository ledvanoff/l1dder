import type {
  ClockPort,
  DependenciesNotMetError,
  FileSystemPort,
  LoggerPort,
  Result,
} from '@l1dder/core';
import { err, ok } from '@l1dder/core';
import type { State, Task, TaskStatus } from '@l1dder/schemas';

import { DependencyGraph } from './dependency-graph.js';
import {
  parseTasksMarkdown,
  type TaskMarkdownError,
} from './task-markdown.js';

/** Stable error codes for {@link TaskSyncService}. */
export type TaskSyncErrorCode =
  | 'TASKS_FILE_NOT_FOUND'
  | TaskMarkdownError['code']
  | 'DEPENDENCIES_NOT_MET';

/**
 * Structured error from synchronizing `tasks.md` into `state.tasks.items`.
 */
export interface TaskSyncError {
  readonly code: TaskSyncErrorCode;
  readonly message: string;
  readonly line?: number;
}

/** Counts describing how the projection changed. */
export interface TaskSyncOutcome {
  readonly added: number;
  readonly updated: number;
  readonly removed: number;
  readonly unchanged: number;
  readonly items: readonly Task[];
  readonly state: State;
}

/** Dependencies injected into {@link TaskSyncService}. */
export interface TaskSyncServiceDeps {
  readonly fs: FileSystemPort;
  readonly clock: ClockPort;
  readonly logger: LoggerPort;
}

/**
 * Projects a `specs/<feature>/tasks.md` document into `state.tasks.items`.
 *
 * Builds a full replacement of the items array (no partial mutation). Timestamps
 * are preserved when status is unchanged; transitions set/clear `started_at` /
 * `completed_at` from the injected clock.
 */
export class TaskSyncService {
  private readonly fs: FileSystemPort;
  private readonly clock: ClockPort;
  private readonly logger: LoggerPort;

  /**
   * @param deps - filesystem, clock, and logger collaborators
   */
  constructor(deps: TaskSyncServiceDeps) {
    this.fs = deps.fs;
    this.clock = deps.clock;
    this.logger = deps.logger;
  }

  /**
   * Read `tasksPath`, parse it, validate the dependency DAG, and return a new
   * state whose `tasks.items` match the document.
   *
   * @param state - Current project state (not mutated)
   * @param tasksPath - Absolute or project-relative path to `tasks.md`
   * @param sourcePath - Project-relative path recorded in `tasks.source_path`
   *   so the implementation gate later checks this document; omit to keep the
   *   previously recorded value
   */
  async sync(
    state: State,
    tasksPath: string,
    sourcePath?: string,
  ): Promise<Result<TaskSyncOutcome, TaskSyncError>> {
    const exists = await this.fs.exists(tasksPath);
    if (!exists) {
      return err({
        code: 'TASKS_FILE_NOT_FOUND',
        message: `Tasks file not found: ${tasksPath}`,
      });
    }

    let content: string;
    try {
      content = await this.fs.readFile(tasksPath);
    } catch (cause) {
      return err({
        code: 'TASKS_FILE_NOT_FOUND',
        message: `Tasks file not found: ${tasksPath} (${String(cause)})`,
      });
    }

    const parsed = parseTasksMarkdown(content);
    if (!parsed.ok) {
      return err({
        code: parsed.error.code,
        message: parsed.error.message,
        ...(parsed.error.line !== undefined ? { line: parsed.error.line } : {}),
      });
    }

    const graph = new DependencyGraph(
      parsed.value.tasks.map((task) => ({
        id: task.id,
        depends_on: task.depends_on,
      })),
    );
    const sorted = graph.topologicalSort();
    if (!sorted.ok) {
      return err(toSyncDependencyError(sorted.error));
    }

    const previousById = new Map(
      state.tasks.items.map((task) => [task.id, task] as const),
    );
    const now = this.clock.now();
    const nextItems: Task[] = [];
    let added = 0;
    let updated = 0;
    let unchanged = 0;

    for (const row of parsed.value.tasks) {
      const previous = previousById.get(row.id);
      if (previous === undefined) {
        added += 1;
        nextItems.push(createTaskFromRow(row, now));
        continue;
      }

      const next = mergeTask(previous, row, now);
      if (taskProjectionEqual(previous, next)) {
        unchanged += 1;
      } else {
        updated += 1;
      }
      nextItems.push(next);
      previousById.delete(row.id);
    }

    const removed = previousById.size;

    const nextState: State = {
      ...state,
      tasks: {
        ...state.tasks,
        ...(sourcePath !== undefined ? { source_path: sourcePath } : {}),
        items: nextItems,
      },
    };

    this.logger.debug('Synced tasks.md into state', {
      tasksPath,
      added,
      updated,
      removed,
      unchanged,
    });

    return ok({
      added,
      updated,
      removed,
      unchanged,
      items: nextItems,
      state: nextState,
    });
  }
}

/**
 * Build a new pending/in-progress/done task from a freshly parsed markdown row.
 */
function createTaskFromRow(
  row: {
    readonly id: string;
    readonly title: string;
    readonly depends_on: readonly string[];
    readonly status: TaskStatus;
  },
  now: string,
): Task {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    depends_on: [...row.depends_on],
    started_at: row.status === 'in_progress' || row.status === 'done' ? now : undefined,
    completed_at: row.status === 'done' ? now : undefined,
  };
}

/**
 * Merge a markdown row onto an existing state task, preserving timestamps when
 * the status is unchanged and applying transition rules otherwise.
 */
function mergeTask(
  previous: Task,
  row: {
    readonly id: string;
    readonly title: string;
    readonly depends_on: readonly string[];
    readonly status: TaskStatus;
  },
  now: string,
): Task {
  if (previous.status === row.status) {
    return {
      ...previous,
      title: row.title,
      depends_on: [...row.depends_on],
      status: row.status,
    };
  }

  let startedAt = previous.started_at;
  let completedAt = previous.completed_at;

  if (row.status === 'pending') {
    startedAt = undefined;
    completedAt = undefined;
  } else if (row.status === 'in_progress') {
    startedAt = now;
    completedAt = undefined;
  } else if (row.status === 'done') {
    startedAt = previous.started_at ?? now;
    completedAt = now;
  }
  // `skipped` keeps prior timestamps as-is (no special transition clocks).

  return {
    ...previous,
    title: row.title,
    depends_on: [...row.depends_on],
    status: row.status,
    started_at: startedAt,
    completed_at: completedAt,
  };
}

/**
 * Compare the projected fields of two tasks for "unchanged" counting.
 */
function taskProjectionEqual(a: Task, b: Task): boolean {
  return (
    a.id === b.id &&
    a.title === b.title &&
    a.status === b.status &&
    a.started_at === b.started_at &&
    a.completed_at === b.completed_at &&
    a.depends_on.length === b.depends_on.length &&
    a.depends_on.every((dep, index) => dep === b.depends_on[index])
  );
}

/**
 * Map a {@link DependenciesNotMetError} (cycle) into a sync error shape.
 */
function toSyncDependencyError(error: DependenciesNotMetError): TaskSyncError {
  return {
    code: 'DEPENDENCIES_NOT_MET',
    message: error.message,
  };
}
