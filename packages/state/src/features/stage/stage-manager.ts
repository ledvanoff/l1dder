import type { ClockPort, FileSystemPort, LoggerPort, Result } from '@l1dder/core';
import {
  AlreadyAtStageError,
  InvalidStageTransitionError,
  err,
  ok,
} from '@l1dder/core';
import type {
  Config,
  ProjectStage,
  State,
  StageHistoryEntry,
} from '@l1dder/schemas';

import {
  DeliveryCriteriaChecker,
  type DeliveryCriteriaResult,
} from './delivery-criteria.js';

/** Errors produced by StageManager. */
export type StageManagerError =
  | InvalidStageTransitionError
  | AlreadyAtStageError;

/** Result of canAdvance: next stage + criteria evaluation. */
export interface AdvanceInfo {
  readonly nextStage: ProjectStage;
  readonly criteria: DeliveryCriteriaResult;
}

const STAGE_ORDER: readonly ProjectStage[] = [
  'discovery',
  'delivery',
  'maintenance',
];

/**
 * Project Stage management: transitions between discovery → delivery → maintenance.
 *
 * Stage is a macro-level concept above Phase Machine iterations.
 * Changes are recorded in `state.project.stage_history[]`.
 *
 * `canAdvance` and `advanceStage` are async because the delivery criteria
 * checker reads project artifact files via FileSystemPort.
 */
export class StageManager {
  private readonly clock: ClockPort;
  private readonly logger: LoggerPort;
  private readonly criteriaChecker: DeliveryCriteriaChecker;
  private readonly fs: FileSystemPort;
  private readonly projectRoot: string;

  constructor(
    clock: ClockPort,
    logger: LoggerPort,
    fs: FileSystemPort,
    projectRoot: string,
  ) {
    this.clock = clock;
    this.logger = logger;
    this.criteriaChecker = new DeliveryCriteriaChecker();
    this.fs = fs;
    this.projectRoot = projectRoot;
  }

  /**
   * Current project stage from state.
   */
  currentStage(state: State): ProjectStage {
    return state.project.stage;
  }

  /**
   * Advance to the next stage in the natural order (discovery→delivery→maintenance).
   *
   * When advancing discovery→delivery, delivery criteria (semantic milestone
   * checks via FileSystemPort) are evaluated. In `advisory` mode a warning is
   * logged but the transition is allowed. In `enforced` mode unmet criteria
   * block the transition.
   */
  async advanceStage(
    state: State,
    config: Config,
  ): Promise<Result<State, StageManagerError>> {
    const current = state.project.stage;
    const currentIdx = STAGE_ORDER.indexOf(current);

    if (currentIdx === STAGE_ORDER.length - 1) {
      return err(new AlreadyAtStageError(current));
    }

    const nextStage = STAGE_ORDER[currentIdx + 1] as ProjectStage;

    if (current === 'discovery' && nextStage === 'delivery') {
      const enforcement = config.stage.enforcement.require_criteria;
      if (enforcement !== 'off') {
        const criteria = await this.criteriaChecker.evaluate(
          this.fs,
          this.projectRoot,
          config,
        );
        if (!this.criteriaChecker.allMet(criteria)) {
          if (enforcement === 'enforced') {
            return err(
              new InvalidStageTransitionError(current, nextStage),
            );
          }
          this.logger.warn(
            'Advancing to delivery with unmet criteria (advisory mode)',
            { criteria },
          );
        }
      }
    }

    return ok(this.applyStageChange(state, nextStage, 'Natural stage advancement'));
  }

  /**
   * Force-set stage with a reason (for `--force --reason` CLI).
   * Only forward transitions are allowed (no going back).
   */
  setStage(
    state: State,
    stage: ProjectStage,
    reason: string,
  ): Result<State, StageManagerError> {
    const current = state.project.stage;

    if (current === stage) {
      return err(new AlreadyAtStageError(stage));
    }

    const currentIdx = STAGE_ORDER.indexOf(current);
    const targetIdx = STAGE_ORDER.indexOf(stage);

    if (targetIdx < currentIdx) {
      return err(new InvalidStageTransitionError(current, stage));
    }

    return ok(this.applyStageChange(state, stage, reason));
  }

  /**
   * Check whether the project can advance to the next stage.
   *
   * Returns the next stage and criteria evaluation for UI display.
   * Async because it reads project artifact files via FileSystemPort.
   */
  async canAdvance(
    state: State,
    config: Config,
  ): Promise<Result<AdvanceInfo, AlreadyAtStageError>> {
    const current = state.project.stage;
    const currentIdx = STAGE_ORDER.indexOf(current);

    if (currentIdx === STAGE_ORDER.length - 1) {
      return err(new AlreadyAtStageError(current));
    }

    const nextStage = STAGE_ORDER[currentIdx + 1] as ProjectStage;
    const criteria = await this.criteriaChecker.evaluate(
      this.fs,
      this.projectRoot,
      config,
    );

    return ok({ nextStage, criteria });
  }

  private applyStageChange(
    state: State,
    newStage: ProjectStage,
    reason: string,
  ): State {
    const historyEntry: StageHistoryEntry = {
      from: state.project.stage,
      to: newStage,
      timestamp: this.clock.now(),
      reason,
    };

    this.logger.info('Stage transition', {
      from: state.project.stage,
      to: newStage,
      reason,
    });

    return {
      ...state,
      project: {
        ...state.project,
        stage: newStage,
        stage_history: [...state.project.stage_history, historyEntry],
      },
    };
  }
}
