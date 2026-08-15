import type { ClockPort, LoggerPort, Result } from '@l1dder/core';
import {
  AlreadyAtStageError,
  DISCOVERY_MILESTONE_ORDER,
  InvalidStageTransitionError,
  err,
  ok,
} from '@l1dder/core';
import type {
  Config,
  DiscoveryMilestone,
  DiscoveryMilestoneId,
  ProjectStage,
  State,
  StageHistoryEntry,
} from '@l1dder/schemas';

import type { DiscoveryOrchestrator } from '../discovery/discovery-orchestrator.js';
import type { CriterionResult, DeliveryCriteriaResult } from './delivery-criteria.js';

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
 * Decision id prefix for an audited `--force --reason` stage-gate waiver.
 *
 * Written by CLI `stage advance` / `stage set` and reported by `doctor`.
 */
export const STAGE_FORCE_DECISION_PREFIX = 'DEC-STAGE-FORCE-';

const CLOSED = new Set(['complete', 'not_applicable']);

/** Human labels for the ordered discovery checklist. */
const MILESTONE_LABELS: Readonly<Record<DiscoveryMilestoneId, string>> = {
  idea: 'Idea',
  product: 'Product',
  architecture: 'Architecture',
  integrations: 'Integrations',
  data: 'Data',
  standards: 'Standards',
  ready: 'Ready',
};

/**
 * Project Stage management: transitions between discovery → delivery → maintenance.
 *
 * Stage is a macro-level concept above Phase Machine iterations.
 * Changes are recorded in `state.project.stage_history[]`.
 *
 * Discovery→delivery readiness is a hard gate based on the discovery milestone
 * checklist ({@link DiscoveryOrchestrator.isReady}) — not file heuristics.
 */
export class StageManager {
  private readonly clock: ClockPort;
  private readonly logger: LoggerPort;
  private readonly orchestrator: DiscoveryOrchestrator;

  constructor(
    clock: ClockPort,
    logger: LoggerPort,
    orchestrator: DiscoveryOrchestrator,
  ) {
    this.clock = clock;
    this.logger = logger;
    this.orchestrator = orchestrator;
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
   * Discovery→delivery is a hard gate: every applicable milestone must be
   * `complete` or `not_applicable`. Callers that need an audited bypass should
   * use {@link setStage} with a recorded Decision — this method never soft-allows
   * unmet criteria.
   */
  advanceStage(
    state: State,
    _config: Config,
  ): Promise<Result<State, StageManagerError>> {
    const current = state.project.stage;
    const currentIdx = STAGE_ORDER.indexOf(current);

    if (currentIdx === STAGE_ORDER.length - 1) {
      return Promise.resolve(err(new AlreadyAtStageError(current)));
    }

    const nextStage = STAGE_ORDER[currentIdx + 1] as ProjectStage;

    if (current === 'discovery' && nextStage === 'delivery') {
      const readyState = this.ensureInitialized(state);
      if (!this.orchestrator.isReady(readyState)) {
        return Promise.resolve(
          err(new InvalidStageTransitionError(current, nextStage)),
        );
      }
      return Promise.resolve(
        ok(
          this.applyStageChange(readyState, nextStage, 'Natural stage advancement'),
        ),
      );
    }

    return Promise.resolve(
      ok(this.applyStageChange(state, nextStage, 'Natural stage advancement')),
    );
  }

  /**
   * Whether moving to `target` requires an audited `--force --reason` waiver.
   *
   * True when the move leaves `discovery` for a later stage while the
   * milestone checklist is not READY. Backward / same-stage moves are
   * rejected by {@link setStage} and do not need a waiver.
   */
  requiresForceWaiver(state: State, target: ProjectStage): boolean {
    const current = state.project.stage;
    const currentIdx = STAGE_ORDER.indexOf(current);
    const targetIdx = STAGE_ORDER.indexOf(target);
    if (targetIdx <= currentIdx) {
      return false;
    }
    if (current !== 'discovery') {
      return false;
    }
    return !this.orchestrator.isReady(this.ensureInitialized(state));
  }

  /**
   * Apply a forward stage change with a reason.
   *
   * This is the write primitive used by natural advance and by an audited
   * `--force --reason` waiver. Callers that bypass an unmet discovery gate
   * must record a `DEC-STAGE-FORCE-*` Decision — this method does not.
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
   * Returns the next stage and the ordered 7-milestone checklist derived from
   * {@link DiscoveryOrchestrator.list} — the same source used by CLI status/helpme/doctor.
   */
  canAdvance(
    state: State,
    _config: Config,
  ): Promise<Result<AdvanceInfo, AlreadyAtStageError>> {
    const current = state.project.stage;
    const currentIdx = STAGE_ORDER.indexOf(current);

    if (currentIdx === STAGE_ORDER.length - 1) {
      return Promise.resolve(err(new AlreadyAtStageError(current)));
    }

    const nextStage = STAGE_ORDER[currentIdx + 1] as ProjectStage;
    const criteria = this.milestoneCriteria(state);

    return Promise.resolve(ok({ nextStage, criteria }));
  }

  /**
   * Map the orchestrator checklist to {@link CriterionResult} rows.
   */
  milestoneCriteria(state: State): DeliveryCriteriaResult {
    const milestones = this.orchestrator.list(this.ensureInitialized(state));
    return DISCOVERY_MILESTONE_ORDER.map((id, index) => {
      const milestone =
        milestones.find((m) => m.id === id) ??
        ({
          id,
          status: 'pending',
          required: true,
          planned_sessions: [],
          evidence: [],
        } satisfies DiscoveryMilestone);
      return toCriterion(milestone, index + 1);
    });
  }

  private ensureInitialized(state: State): State {
    const result = this.orchestrator.initialize(state);
    return result.ok ? result.value : state;
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

/**
 * Convert a milestone record into a checklist criterion row.
 */
function toCriterion(milestone: DiscoveryMilestone, order: number): CriterionResult {
  const met = CLOSED.has(milestone.status);
  const label = MILESTONE_LABELS[milestone.id];
  let detail: string;
  if (milestone.status === 'complete') {
    detail = `Complete (${String(milestone.evidence.length)} evidence)`;
  } else if (milestone.status === 'not_applicable') {
    detail = milestone.rationale
      ? `Not applicable — ${milestone.rationale}`
      : 'Not applicable';
  } else {
    detail = `Status: ${milestone.status}`;
  }

  return {
    id: milestone.id,
    order,
    label,
    met,
    detail,
  };
}
