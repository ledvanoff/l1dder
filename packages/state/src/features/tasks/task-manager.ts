import type { ClockPort, LoggerPort, Result } from '@l1dder/core';
import {
  DependenciesNotMetError,
  TaskNotFoundError,
  TaskAlreadyExistsError,
  InvalidTaskStatusTransitionError,
  err,
  ok,
} from '@l1dder/core';
import type { State, Task } from '@l1dder/schemas';

import { DependencyGraph, resolveNextAvailableTaskId } from './dependency-graph.js';
import { isValidTaskStatusTransition } from './task-status.js';

/** Union of errors produced by TaskManager operations. */
export type TaskManagerError =
  | DependenciesNotMetError
  | TaskNotFoundError
  | TaskAlreadyExistsError
  | InvalidTaskStatusTransitionError;

/**
 * Task management: CRUD, status transitions, dependency-aware start and auto-pick.
 *
 * Operates on `state.tasks.items[]` — returns new State on each mutation (immutable).
 */
export class TaskManager {
  private readonly clock: ClockPort;
  private readonly logger: LoggerPort;

  constructor(clock: ClockPort, logger: LoggerPort) {
    this.clock = clock;
    this.logger = logger;
  }

  /**
   * Add a new task with `status: pending`.
   */
  addTask(
    state: State,
    task: Pick<Task, 'id' | 'title'> & Partial<Pick<Task, 'depends_on' | 'assigned_to' | 'metadata'>>,
  ): Result<State, TaskAlreadyExistsError> {
    const existing = state.tasks.items.find((t) => t.id === task.id);
    if (existing) {
      return err(
        new TaskAlreadyExistsError(task.id),
      );
    }

    const newTask: Task = {
      id: task.id,
      title: task.title,
      status: 'pending',
      depends_on: task.depends_on ?? [],
      assigned_to: task.assigned_to,
      started_at: undefined,
      completed_at: undefined,
      metadata: task.metadata,
    };

    this.logger.debug('Task added', { taskId: task.id });

    return ok({
      ...state,
      tasks: {
        ...state.tasks,
        items: [...state.tasks.items, newTask],
      },
    });
  }

  /**
   * Start a task: validates dependencies are met, transitions pending → in_progress.
   */
  startTask(state: State, taskId: string): Result<State, TaskManagerError> {
    const task = state.tasks.items.find((t) => t.id === taskId);
    if (!task) {
      return err(new TaskNotFoundError(taskId));
    }

    if (!isValidTaskStatusTransition(task.status, 'in_progress')) {
      return err(
        new InvalidTaskStatusTransitionError(taskId, task.status, 'in_progress'),
      );
    }

    const completedIds = this.getCompletedTaskIds(state);
    const graph = new DependencyGraph(state.tasks.items);

    if (!graph.canStart(taskId, completedIds)) {
      const unmet = task.depends_on.filter((dep) => !completedIds.has(dep));
      return err(new DependenciesNotMetError(taskId, unmet));
    }

    return ok(this.updateTask(state, taskId, {
      status: 'in_progress',
      started_at: this.clock.now(),
    }));
  }

  /**
   * Complete a task: transitions in_progress → done.
   */
  completeTask(state: State, taskId: string): Result<State, TaskManagerError> {
    const task = state.tasks.items.find((t) => t.id === taskId);
    if (!task) {
      return err(new TaskNotFoundError(taskId));
    }

    if (!isValidTaskStatusTransition(task.status, 'done')) {
      return err(new InvalidTaskStatusTransitionError(taskId, task.status, 'done'));
    }

    return ok(this.updateTask(state, taskId, {
      status: 'done',
      completed_at: this.clock.now(),
    }));
  }

  /**
   * Skip a task: transitions pending|in_progress → skipped.
   */
  skipTask(state: State, taskId: string): Result<State, TaskManagerError> {
    const task = state.tasks.items.find((t) => t.id === taskId);
    if (!task) {
      return err(new TaskNotFoundError(taskId));
    }

    if (!isValidTaskStatusTransition(task.status, 'skipped')) {
      return err(new InvalidTaskStatusTransitionError(taskId, task.status, 'skipped'));
    }

    return ok(this.updateTask(state, taskId, {
      status: 'skipped',
      completed_at: this.clock.now(),
    }));
  }

  /**
   * Returns the next pending task whose dependencies are met (topological order).
   * Returns `null` when all tasks are done/skipped.
   */
  nextTask(state: State): Result<string | null, DependenciesNotMetError> {
    return resolveNextAvailableTaskId(state.tasks.items);
  }

  /**
   * List all tasks in the current state.
   */
  listTasks(state: State): Task[] {
    return [...state.tasks.items];
  }

  private getCompletedTaskIds(state: State): Set<string> {
    return new Set(
      state.tasks.items
        .filter((t): t is Task & { status: 'done' | 'skipped' } =>
          t.status === 'done' || t.status === 'skipped',
        )
        .map((t) => t.id),
    );
  }

  private updateTask(
    state: State,
    taskId: string,
    updates: Partial<Pick<Task, 'status' | 'started_at' | 'completed_at'>>,
  ): State {
    return {
      ...state,
      tasks: {
        ...state.tasks,
        items: state.tasks.items.map((t) =>
          t.id === taskId ? { ...t, ...updates } : t,
        ),
      },
    };
  }
}
