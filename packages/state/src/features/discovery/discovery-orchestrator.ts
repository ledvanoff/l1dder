import type { ClockPort, MilestoneError, Result } from '@l1dder/core';
import {
  DISCOVERY_MILESTONE_ORDER,
  MilestoneEvidenceRequiredError,
  MilestoneNotConditionalError,
  MilestoneNotFoundError,
  MilestoneOrderError,
  MilestonePlanIncompleteError,
  MilestoneRationaleRequiredError,
  MilestoneStatusTransitionError,
  WaiverReasonRequiredError,
  err,
  isConditionalMilestone,
  milestoneIndex,
  ok,
} from '@l1dder/core';
import type {
  Actor,
  Decision,
  DiscoveryMilestone,
  DiscoveryMilestoneId,
  DiscoveryMilestoneStatus,
  DiscoveryWaiver,
  State,
} from '@l1dder/schemas';

/** Input for planning a discovery milestone after brainstorm. */
export interface PlanMilestoneInput {
  readonly summary: string;
  readonly sessions: readonly string[];
}

/** Input for an audited discovery milestone waiver. */
export interface WaiveMilestoneInput {
  readonly reason: string;
  readonly actor: Actor;
  readonly decisionId?: string;
}

/** Errors produced by {@link DiscoveryOrchestrator}. */
export type DiscoveryOrchestratorError = MilestoneError;

/** Stable reason why a milestone cannot start or complete right now. */
export type MilestoneBlockerCode =
  | 'MILESTONE_UNKNOWN'
  | 'MILESTONE_ORDER'
  | 'MILESTONE_READY_DEPENDENCY'
  | 'MILESTONE_ALREADY_CLOSED'
  | 'MILESTONE_EVIDENCE_REQUIRED'
  | 'MILESTONE_PLAN_INCOMPLETE';

/**
 * One blocker with a stable machine code plus a human message.
 *
 * The code is part of the contract: consumers (CLI checklist, projection,
 * `--json` output) branch on `code`, never on `message` wording.
 */
export interface MilestoneBlocker {
  readonly code: MilestoneBlockerCode;
  readonly message: string;
}

const CLOSED_STATUSES: ReadonlySet<DiscoveryMilestoneStatus> = new Set([
  'complete',
  'not_applicable',
]);

/**
 * Canonical pending milestone record used by initialize / list defaults.
 */
export function initialDiscoveryMilestone(
  id: DiscoveryMilestoneId,
): DiscoveryMilestone {
  return {
    id,
    status: 'pending',
    required: true,
    planned_sessions: [],
    evidence: [],
  };
}

/**
 * Canonical initial `discovery` slice: 7 pending milestones, cursor at `idea`.
 *
 * Single source for {@link DiscoveryOrchestrator.initialize} and
 * {@link import('../../io/initial-state.js').createInitialState} — do not
 * duplicate milestone literals elsewhere.
 */
export function initialDiscoverySlice(): State['discovery'] {
  return {
    milestones: DISCOVERY_MILESTONE_ORDER.map(initialDiscoveryMilestone),
    current: 'idea',
    waivers: [],
  };
}

/**
 * Pure application service over the `discovery` state slice.
 *
 * Enforces milestone lifecycle, order, evidence, and waiver invariants.
 * Returns a new `State` object on success — never mutates the input.
 * No filesystem or CLI concerns; timestamps come from the injected {@link ClockPort}.
 */
export class DiscoveryOrchestrator {
  private readonly clock: ClockPort;

  constructor(clock: ClockPort) {
    this.clock = clock;
  }

  /**
   * Create the 7 canonical milestone records (`pending`) and set `current` to `idea`.
   *
   * Idempotent: when milestones already exist, returns `state` unchanged.
   */
  initialize(state: State): Result<State, DiscoveryOrchestratorError> {
    if (state.discovery.milestones.length > 0) {
      return ok(state);
    }

    const slice = initialDiscoverySlice();

    return ok({
      ...state,
      discovery: {
        ...state.discovery,
        milestones: slice.milestones,
        current: slice.current,
      },
    });
  }

  /**
   * Start brainstorming: `pending → brainstorming`.
   */
  startBrainstorm(
    state: State,
    id: DiscoveryMilestoneId,
  ): Result<State, DiscoveryOrchestratorError> {
    return this.transitionStatus(state, id, 'pending', 'brainstorming', {
      requireOrder: true,
    });
  }

  /**
   * Plan the milestone: `brainstorming → planned`.
   *
   * Requires a non-empty summary and at least one planned session id.
   */
  plan(
    state: State,
    id: DiscoveryMilestoneId,
    input: PlanMilestoneInput,
  ): Result<State, DiscoveryOrchestratorError> {
    const summary = input.summary.trim();
    if (summary.length === 0) {
      return err(new MilestonePlanIncompleteError(id, 'summary'));
    }
    if (input.sessions.length === 0) {
      return err(new MilestonePlanIncompleteError(id, 'sessions'));
    }

    const located = this.locate(state, id);
    if (!located.ok) {
      return located;
    }
    const { milestone, index } = located.value;

    if (milestone.status !== 'brainstorming') {
      return err(
        new MilestoneStatusTransitionError(
          id,
          milestone.status,
          'planned',
        ),
      );
    }

    return ok(
      this.replaceMilestone(state, index, {
        ...milestone,
        status: 'planned',
        brainstorm_summary: summary,
        planned_sessions: [...input.sessions],
      }),
    );
  }

  /**
   * Start execution: `planned → in_progress`.
   */
  startWork(
    state: State,
    id: DiscoveryMilestoneId,
  ): Result<State, DiscoveryOrchestratorError> {
    return this.transitionStatus(state, id, 'planned', 'in_progress');
  }

  /**
   * Submit for review: `in_progress → in_review`, appending evidence paths.
   */
  submitForReview(
    state: State,
    id: DiscoveryMilestoneId,
    evidence: readonly string[],
  ): Result<State, DiscoveryOrchestratorError> {
    const located = this.locate(state, id);
    if (!located.ok) {
      return located;
    }
    const { milestone, index } = located.value;

    if (milestone.status !== 'in_progress') {
      return err(
        new MilestoneStatusTransitionError(
          id,
          milestone.status,
          'in_review',
        ),
      );
    }

    return ok(
      this.replaceMilestone(state, index, {
        ...milestone,
        status: 'in_review',
        evidence: [...milestone.evidence, ...evidence],
      }),
    );
  }

  /**
   * Complete a milestone: `in_progress | in_review → complete`.
   *
   * Requires ≥1 evidence entry (stored ∪ passed). Sets `completed_at` and
   * advances `discovery.current` to the next open milestone (or `null`).
   */
  complete(
    state: State,
    id: DiscoveryMilestoneId,
    evidence: readonly string[],
  ): Result<State, DiscoveryOrchestratorError> {
    const located = this.locate(state, id);
    if (!located.ok) {
      return located;
    }
    const { milestone, index } = located.value;

    if (milestone.status !== 'in_progress' && milestone.status !== 'in_review') {
      return err(
        new MilestoneStatusTransitionError(
          id,
          milestone.status,
          'complete',
        ),
      );
    }

    const mergedEvidence = [...milestone.evidence, ...evidence];
    if (mergedEvidence.length === 0) {
      return err(new MilestoneEvidenceRequiredError(id));
    }

    const readyGate = this.assertReadyMayComplete(state, id);
    if (!readyGate.ok) {
      return readyGate;
    }

    const completed: DiscoveryMilestone = {
      ...milestone,
      status: 'complete',
      evidence: mergedEvidence,
      completed_at: this.clock.now(),
    };

    const nextState = this.replaceMilestone(state, index, completed);
    return ok(this.withAdvancedCurrent(nextState));
  }

  /**
   * Mark a conditional milestone `not_applicable` with a non-empty rationale.
   *
   * Allowed from any non-complete / non-`not_applicable` status.
   */
  markNotApplicable(
    state: State,
    id: DiscoveryMilestoneId,
    rationale: string,
  ): Result<State, DiscoveryOrchestratorError> {
    if (!isConditionalMilestone(id)) {
      return err(new MilestoneNotConditionalError(id));
    }

    const trimmed = rationale.trim();
    if (trimmed.length === 0) {
      return err(new MilestoneRationaleRequiredError(id));
    }

    const orderCheck = this.assertEarlierClosed(state, id);
    if (!orderCheck.ok) {
      return orderCheck;
    }

    const located = this.locate(state, id);
    if (!located.ok) {
      return located;
    }
    const { milestone, index } = located.value;

    if (CLOSED_STATUSES.has(milestone.status)) {
      return err(
        new MilestoneStatusTransitionError(
          id,
          milestone.status,
          'not_applicable',
        ),
      );
    }

    const updated: DiscoveryMilestone = {
      ...milestone,
      status: 'not_applicable',
      rationale: trimmed,
      completed_at: this.clock.now(),
    };

    return ok(this.withAdvancedCurrent(this.replaceMilestone(state, index, updated)));
  }

  /**
   * Reopen a closed milestone: `complete | not_applicable → in_progress`.
   *
   * Clears `completed_at`, invalidates READY when it was complete, sets
   * `discovery.current` to the reopened milestone, and appends a Decision
   * audit entry with the given reason.
   */
  reopen(
    state: State,
    id: DiscoveryMilestoneId,
    reason: string,
  ): Result<State, DiscoveryOrchestratorError> {
    const trimmed = reason.trim();
    if (trimmed.length === 0) {
      return err(
        new MilestoneRationaleRequiredError(
          id,
          `Reopen of milestone "${id}" requires a non-empty reason`,
        ),
      );
    }

    const located = this.locate(state, id);
    if (!located.ok) {
      return located;
    }
    const { milestone, index } = located.value;

    if (milestone.status !== 'complete' && milestone.status !== 'not_applicable') {
      return err(
        new MilestoneStatusTransitionError(
          id,
          milestone.status,
          'in_progress',
        ),
      );
    }

    let next = this.replaceMilestone(state, index, {
      ...milestone,
      status: 'in_progress',
      completed_at: undefined,
      rationale: milestone.status === 'not_applicable' ? undefined : milestone.rationale,
    });

    next = this.invalidateReady(next, id);

    const audit: Decision = {
      id: `DEC-REOPEN-${id}-${this.clock.now()}`,
      title: `Reopened discovery milestone ${id}`,
      rationale: trimmed,
      alternatives: [],
      status: 'accepted',
      timestamp: this.clock.now(),
    };

    return ok({
      ...next,
      discovery: {
        ...next.discovery,
        current: id,
      },
      decisions: [...next.decisions, audit],
    });
  }

  /**
   * Audited `--force --reason` bypass: append a waiver and mark complete
   * with empty evidence. Requires a non-empty reason.
   *
   * This is the only path that may jump to `complete` outside the normal lifecycle.
   */
  waive(
    state: State,
    id: DiscoveryMilestoneId,
    input: WaiveMilestoneInput,
  ): Result<State, DiscoveryOrchestratorError> {
    const reason = input.reason.trim();
    if (reason.length === 0) {
      return err(new WaiverReasonRequiredError(id));
    }

    const orderCheck = this.assertEarlierClosed(state, id);
    if (!orderCheck.ok) {
      return orderCheck;
    }

    const readyGate = this.assertReadyMayComplete(state, id);
    if (!readyGate.ok) {
      return readyGate;
    }

    const located = this.locate(state, id);
    if (!located.ok) {
      return located;
    }
    const { milestone, index } = located.value;

    if (CLOSED_STATUSES.has(milestone.status)) {
      return err(
        new MilestoneStatusTransitionError(
          id,
          milestone.status,
          'complete',
          `Milestone "${id}" is already closed; cannot waive`,
        ),
      );
    }

    const waiver: DiscoveryWaiver = {
      milestone: id,
      reason,
      actor: input.actor,
      timestamp: this.clock.now(),
      ...(input.decisionId !== undefined
        ? { decision_id: input.decisionId }
        : {}),
    };

    const completed: DiscoveryMilestone = {
      ...milestone,
      status: 'complete',
      evidence: [],
      completed_at: this.clock.now(),
    };

    const withMilestone = this.replaceMilestone(state, index, completed);
    const withWaiver: State = {
      ...withMilestone,
      discovery: {
        ...withMilestone.discovery,
        waivers: [...withMilestone.discovery.waivers, waiver],
      },
    };

    return ok(this.withAdvancedCurrent(withWaiver));
  }

  /**
   * Ordered checklist of all 7 milestones.
   *
   * Fills defaults for milestones missing from state so an uninitialized
   * project still yields 7 `pending` rows. Single source for CLI
   * `status` / `helpme` / `doctor` consumers.
   */
  list(state: State): readonly DiscoveryMilestone[] {
    const byId = new Map(
      state.discovery.milestones.map((m) => [m.id, m] as const),
    );
    return DISCOVERY_MILESTONE_ORDER.map(
      (id) => byId.get(id) ?? initialDiscoveryMilestone(id),
    );
  }

  /**
   * Current discovery cursor, or `null` when unset / all closed.
   */
  current(state: State): DiscoveryMilestoneId | null {
    return state.discovery.current;
  }

  /**
   * Coded reasons why `id` cannot start or complete right now.
   *
   * Single source for every consumer checklist — do not re-derive these
   * conditions elsewhere.
   */
  blockers(state: State, id: DiscoveryMilestoneId): readonly MilestoneBlocker[] {
    const reasons: MilestoneBlocker[] = [];
    const milestones = this.list(state);
    const milestone = milestones.find((m) => m.id === id);
    if (!milestone) {
      return [
        { code: 'MILESTONE_UNKNOWN', message: `Unknown milestone "${id}"` },
      ];
    }

    const idx = milestoneIndex(id);
    for (let i = 0; i < idx; i++) {
      const earlier = milestones[i];
      if (!earlier) continue;
      if (!CLOSED_STATUSES.has(earlier.status)) {
        reasons.push({
          code: 'MILESTONE_ORDER',
          message: `Earlier milestone "${earlier.id}" is still ${earlier.status}`,
        });
      }
    }

    if (id === 'ready') {
      for (const m of milestones) {
        if (m.id === 'ready') continue;
        if (!CLOSED_STATUSES.has(m.status)) {
          reasons.push({
            code: 'MILESTONE_READY_DEPENDENCY',
            message: `Milestone "${m.id}" must be complete or not_applicable before ready can complete`,
          });
        }
      }
    }

    if (milestone.status === 'complete') {
      reasons.push({
        code: 'MILESTONE_ALREADY_CLOSED',
        message: 'Milestone is already complete',
      });
    } else if (milestone.status === 'not_applicable') {
      reasons.push({
        code: 'MILESTONE_ALREADY_CLOSED',
        message: 'Milestone is marked not_applicable',
      });
    }

    if (
      (milestone.status === 'in_progress' || milestone.status === 'in_review') &&
      milestone.evidence.length === 0
    ) {
      reasons.push({
        code: 'MILESTONE_EVIDENCE_REQUIRED',
        message: 'At least one evidence entry is required to complete',
      });
    }

    if (milestone.status === 'brainstorming') {
      if (!milestone.brainstorm_summary) {
        reasons.push({
          code: 'MILESTONE_PLAN_INCOMPLETE',
          message: 'Brainstorm summary is required before planning',
        });
      }
      if (milestone.planned_sessions.length === 0) {
        reasons.push({
          code: 'MILESTONE_PLAN_INCOMPLETE',
          message: 'At least one planned session is required before planning',
        });
      }
    }

    return reasons;
  }

  /**
   * Whether every applicable (non-`not_applicable`) milestone is `complete`.
   */
  isReady(state: State): boolean {
    return this.list(state).every(
      (m) => m.status === 'complete' || m.status === 'not_applicable',
    );
  }

  /**
   * Apply a simple from→to status change with optional order enforcement.
   */
  private transitionStatus(
    state: State,
    id: DiscoveryMilestoneId,
    from: DiscoveryMilestoneStatus,
    to: DiscoveryMilestoneStatus,
    options?: { readonly requireOrder?: boolean },
  ): Result<State, DiscoveryOrchestratorError> {
    if (options?.requireOrder) {
      const orderCheck = this.assertEarlierClosed(state, id);
      if (!orderCheck.ok) {
        return orderCheck;
      }
    }

    const located = this.locate(state, id);
    if (!located.ok) {
      return located;
    }
    const { milestone, index } = located.value;

    if (milestone.status !== from) {
      return err(new MilestoneStatusTransitionError(id, milestone.status, to));
    }

    return ok(
      this.replaceMilestone(state, index, {
        ...milestone,
        status: to,
      }),
    );
  }

  /**
   * Locate a milestone in state by id (requires initialized milestones array).
   */
  private locate(
    state: State,
    id: DiscoveryMilestoneId,
  ): Result<{ milestone: DiscoveryMilestone; index: number }, MilestoneNotFoundError> {
    const index = state.discovery.milestones.findIndex((m) => m.id === id);
    if (index < 0) {
      // Allow operations on listed defaults only after initialize — missing = not found.
      return err(new MilestoneNotFoundError(id));
    }
    const milestone = state.discovery.milestones[index];
    if (!milestone) {
      return err(new MilestoneNotFoundError(id));
    }
    return ok({ milestone, index });
  }

  /**
   * Invariant 1: earlier milestones must be closed before leaving `pending`.
   */
  private assertEarlierClosed(
    state: State,
    id: DiscoveryMilestoneId,
  ): Result<void, MilestoneOrderError> {
    const milestones = this.list(state);
    const idx = milestoneIndex(id);
    for (let i = 0; i < idx; i++) {
      const earlier = milestones[i];
      if (!earlier) continue;
      if (!CLOSED_STATUSES.has(earlier.status)) {
        return err(new MilestoneOrderError(id, earlier.id));
      }
    }
    return ok(undefined);
  }

  /**
   * Invariant 5: `ready` may only complete when every other applicable milestone is closed.
   */
  private assertReadyMayComplete(
    state: State,
    id: DiscoveryMilestoneId,
  ): Result<void, MilestoneOrderError> {
    if (id !== 'ready') {
      return ok(undefined);
    }
    for (const m of this.list(state)) {
      if (m.id === 'ready') continue;
      if (!CLOSED_STATUSES.has(m.status)) {
        return err(new MilestoneOrderError(id, m.id));
      }
    }
    return ok(undefined);
  }

  /**
   * Replace one milestone by index and return a new state.
   */
  private replaceMilestone(
    state: State,
    index: number,
    milestone: DiscoveryMilestone,
  ): State {
    const milestones = state.discovery.milestones.map((m, i) =>
      i === index ? milestone : m,
    );
    return {
      ...state,
      discovery: {
        ...state.discovery,
        milestones,
      },
    };
  }

  /**
   * Set `discovery.current` to the first non-closed milestone, or `null`.
   */
  private withAdvancedCurrent(state: State): State {
    const next = this.list(state).find((m) => !CLOSED_STATUSES.has(m.status));
    return {
      ...state,
      discovery: {
        ...state.discovery,
        current: next?.id ?? null,
      },
    };
  }

  /**
   * When reopening a non-ready milestone, reset READY if it was complete.
   */
  private invalidateReady(state: State, reopenedId: DiscoveryMilestoneId): State {
    if (reopenedId === 'ready') {
      return state;
    }

    const readyIndex = state.discovery.milestones.findIndex(
      (m) => m.id === 'ready',
    );
    if (readyIndex < 0) {
      return state;
    }

    const ready = state.discovery.milestones[readyIndex];
    if (!ready || ready.status !== 'complete') {
      return state;
    }

    return this.replaceMilestone(state, readyIndex, {
      ...ready,
      status: 'pending',
      evidence: [],
      completed_at: undefined,
    });
  }
}
