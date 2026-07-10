import type { ClockPort, LoggerPort, Result } from '@l1dder/core';
import {
  ForbiddenTransitionError,
  TaskNotFoundError,
  err,
  ok,
} from '@l1dder/core';
import { listAvailableTransitions } from '@l1dder/core';
import type { Phase, QuickTask, State } from '@l1dder/schemas';

import type { DriftCheckerPort } from './drift-checker-port.js';

/** Errors produced by QuickTaskManager. */
export type QuickTaskError = ForbiddenTransitionError | TaskNotFoundError;

/**
 * Lifecycle manager for quick/fast tasks.
 *
 * Quick mode: IDLE → QUICK_PLAN → QUICK_IMPLEMENT → QUICK_COMPLETE → IDLE
 * Fast mode:  IDLE → FAST_IMPLEMENT → FAST_COMPLETE → IDLE
 *
 * Manages `state.quick_tasks[]` entries and optional drift detection on commit.
 */
export class QuickTaskManager {
  private readonly clock: ClockPort;
  private readonly logger: LoggerPort;
  private readonly driftChecker: DriftCheckerPort | undefined;

  constructor(
    clock: ClockPort,
    logger: LoggerPort,
    driftChecker?: DriftCheckerPort,
  ) {
    this.clock = clock;
    this.logger = logger;
    this.driftChecker = driftChecker;
  }

  /**
   * Start a quick task: creates entry in `quick_tasks[]`, sets mode to `quick`.
   * Only allowed from IDLE phase in main mode.
   */
  startQuick(
    state: State,
    slug: string,
    description: string,
  ): Result<State, ForbiddenTransitionError> {
    return this.startMode(state, slug, description, 'quick', 'quick_plan');
  }

  /**
   * Start a fast task: creates entry in `quick_tasks[]`, sets mode to `fast`.
   * Only allowed from IDLE phase in main mode.
   */
  startFast(
    state: State,
    slug: string,
    description: string,
  ): Result<State, ForbiddenTransitionError> {
    return this.startMode(state, slug, description, 'fast', 'fast_implement');
  }

  /**
   * Commit a quick task: optionally run drift check, mark as done, transition back to idle/main.
   */
  async commitQuick(
    state: State,
    taskId: string,
  ): Promise<Result<State, QuickTaskError>> {
    return this.commitMode(state, taskId);
  }

  /**
   * Commit a fast task: optionally run drift check, mark as done, transition back to idle/main.
   */
  async commitFast(
    state: State,
    taskId: string,
  ): Promise<Result<State, QuickTaskError>> {
    return this.commitMode(state, taskId);
  }

  /**
   * List all quick tasks from state.
   */
  listQuickTasks(state: State): QuickTask[] {
    return [...state.quick_tasks];
  }

  private startMode(
    state: State,
    slug: string,
    description: string,
    mode: 'quick' | 'fast',
    nextPhase: Phase,
  ): Result<State, ForbiddenTransitionError> {
    if (state.workflow.current_phase !== 'idle' || state.workflow.mode !== 'main') {
      return err(
        new ForbiddenTransitionError(
          state.workflow.current_phase,
          nextPhase,
          state.workflow.mode,
          listAvailableTransitions(state.workflow.current_phase, state.workflow.mode),
          `${mode} mode can only be started from idle phase in main mode`,
        ),
      );
    }

    const taskId = `${mode}-${slug}-${String(new Date(this.clock.now()).getTime())}`;
    const now = this.clock.now();

    const quickTask: QuickTask = {
      id: taskId,
      description,
      status: 'in_progress',
      created_at: now,
      completed_at: undefined,
      knowledge_drift_warning: false,
    };

    this.logger.debug(`Started ${mode} task`, { taskId, slug });

    return ok({
      ...state,
      workflow: {
        ...state.workflow,
        current_phase: nextPhase,
        current_status: 'in_progress',
        mode,
      },
      quick_tasks: [...state.quick_tasks, quickTask],
    });
  }

  private async commitMode(
    state: State,
    taskId: string,
  ): Promise<Result<State, QuickTaskError>> {
    const taskIndex = state.quick_tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      return err(new TaskNotFoundError(taskId));
    }

    const task = state.quick_tasks[taskIndex] as QuickTask;
    const now = this.clock.now();

    let driftWarning = false;

    if (this.driftChecker) {
      const driftResult = await this.driftChecker.checkDrift(
        task,
        'knowledge/to-be',
      );
      if (driftResult.ok && driftResult.value.hasDrift) {
        driftWarning = true;
        this.logger.warn('Knowledge drift detected', {
          taskId,
          affectedFiles: driftResult.value.affectedFiles,
          summary: driftResult.value.summary,
        });
      }
    } else {
      this.logger.debug('Drift check skipped: no DriftCheckerPort provided', {
        taskId,
      });
    }

    const updatedTask: QuickTask = {
      ...task,
      status: 'done',
      completed_at: now,
      knowledge_drift_warning: driftWarning,
    };

    const updatedQuickTasks = state.quick_tasks.map((t, i) =>
      i === taskIndex ? updatedTask : t,
    );

    this.logger.debug('Committed quick/fast task', { taskId, driftWarning });

    return ok({
      ...state,
      workflow: {
        ...state.workflow,
        current_phase: 'idle',
        current_status: 'in_progress',
        mode: 'main',
      },
      quick_tasks: updatedQuickTasks,
    });
  }
}
