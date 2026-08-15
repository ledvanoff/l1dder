import type { ClockPort, Result } from '@l1dder/core';
import { err, ok } from '@l1dder/core';
import type {
  AgentSessionOutcome,
  AgentSessionRecord,
  State,
  WorkflowProfileId,
} from '@l1dder/schemas';

import type { DeliveryRailSession } from '../projection/delivery-rail-index-port.js';
import { PhaseStatusManager } from '../transitions/phase-status.js';
import {
  RoadmapRailGuard,
  type RailGuardError,
} from './roadmap-rail-guard.js';

/** Options for an audited off-road session start. */
export interface SessionStartForceOptions {
  readonly force: boolean;
  readonly reason: string;
}

/**
 * Returned when `--force` is requested without a non-empty reason.
 */
export interface SessionForceRequiredError {
  readonly code: 'SESSION_FORCE_REASON_REQUIRED';
  readonly message: string;
}

/** Returned when `end` is called with no active `workflow.session`. */
export interface SessionNotActiveError {
  readonly code: 'SESSION_NOT_ACTIVE';
  readonly message: string;
}

/**
 * Returned when `outcome` is `completed` but no non-empty evidence was provided.
 */
export interface SessionEndEvidenceRequiredError {
  readonly code: 'SESSION_END_EVIDENCE_REQUIRED';
  readonly message: string;
}

/** Errors produced by {@link SessionService.end}. */
export type SessionEndError =
  | SessionNotActiveError
  | SessionEndEvidenceRequiredError;

/** Errors produced by {@link SessionService.start}. */
export type SessionServiceError = RailGuardError | SessionForceRequiredError;

/** Input for {@link SessionService.end}. */
export interface SessionEndInput {
  readonly outcome: AgentSessionOutcome;
  readonly evidence: readonly string[];
  readonly nextAction: string | null;
}

/** Successful result of {@link SessionService.end}. */
export interface SessionEndResult {
  readonly state: State;
  readonly record: AgentSessionRecord;
}

/** Dependencies for {@link SessionService}. */
export interface SessionServiceDeps {
  readonly clock: ClockPort;
  readonly guard?: RoadmapRailGuard;
  readonly phaseStatus?: PhaseStatusManager;
}

/**
 * Starts and ends Agent Sessions by writing `workflow.session` / history.
 *
 * Guard rejections are returned as errors unless `force` is set with a
 * non-empty reason, in which case the rail is recorded with `waiver` set.
 * Never mutates the input state on failure.
 */
export class SessionService {
  private readonly clock: ClockPort;
  private readonly guard: RoadmapRailGuard;
  private readonly phaseStatus: PhaseStatusManager;

  /**
   * @param deps - clock, optional rail guard and phase-status overrides
   */
  constructor(deps: SessionServiceDeps) {
    this.clock = deps.clock;
    this.guard = deps.guard ?? new RoadmapRailGuard();
    this.phaseStatus = deps.phaseStatus ?? new PhaseStatusManager();
  }

  /**
   * Start (or force-start) an Agent Session.
   *
   * @param state - Current project state (not mutated)
   * @param sessionId - Requested session id
   * @param rails - Delivery rails from the index port
   * @param profile - Selected workflow profile (used when rails are unknown or for force)
   * @param forceOptions - Optional audited `--force --reason` bypass
   */
  start(
    stateInput: State,
    sessionId: string,
    rails: readonly DeliveryRailSession[],
    profile: WorkflowProfileId,
    forceOptions?: SessionStartForceOptions,
  ): Result<State, SessionServiceError> {
    // Picking work back up resumes a phase parked by an interrupted session.
    const resumed = this.phaseStatus.resumeFromInterrupted(stateInput);
    const state = resumed.ok ? resumed.value : stateInput;
    const force = forceOptions?.force === true;
    const reason = (forceOptions?.reason ?? '').trim();

    if (force && reason.length === 0) {
      return err({
        code: 'SESSION_FORCE_REASON_REQUIRED',
        message: 'Forced session start requires a non-empty --reason',
      });
    }

    const checked = this.guard.check(sessionId, rails);

    if (!checked.ok) {
      if (!force) {
        return err(checked.error);
      }

      const matched = rails.find((entry) => entry.session === sessionId);
      const now = this.clock.now();
      return ok(
        withSession(state, {
          // null = not tracked on delivery rails yet (unmatched / unknown rails)
          iteration: matched?.iteration ?? null,
          session: sessionId,
          profile: matched?.profile ?? profile,
          started_at: now,
          waiver: { reason, at: now },
        }),
      );
    }

    const now = this.clock.now();

    if (checked.value.railsUnknown || checked.value.session === null) {
      return ok(
        withSession(state, {
          // null = rails unknown; session is not tracked on delivery rails yet
          iteration: null,
          session: sessionId,
          profile,
          started_at: now,
          waiver: null,
        }),
      );
    }

    const matched = checked.value.session;
    return ok(
      withSession(state, {
        iteration: matched.iteration,
        session: matched.session,
        profile: matched.profile,
        started_at: now,
        waiver: null,
      }),
    );
  }

  /**
   * End the active Agent Session: append a history record and clear the rail.
   *
   * Requires an active `workflow.session`. Outcome `completed` requires at
   * least one non-empty evidence string. Never mutates the input state on
   * failure.
   *
   * @param state - Current project state (not mutated)
   * @param input - Outcome, evidence, and optional next action
   */
  end(
    state: State,
    input: SessionEndInput,
  ): Result<SessionEndResult, SessionEndError> {
    const active = state.workflow.session;
    if (active === null) {
      return err({
        code: 'SESSION_NOT_ACTIVE',
        message: 'No active Agent Session to end',
      });
    }

    const evidence = input.evidence
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (input.outcome === 'completed' && evidence.length === 0) {
      return err({
        code: 'SESSION_END_EVIDENCE_REQUIRED',
        message: 'Completed sessions require at least one --evidence entry',
      });
    }

    const nextAction =
      input.nextAction !== null && input.nextAction.trim().length > 0
        ? input.nextAction.trim()
        : null;

    const record: AgentSessionRecord = {
      iteration: active.iteration,
      session: active.session,
      profile: active.profile,
      started_at: active.started_at,
      ended_at: this.clock.now(),
      outcome: input.outcome,
      evidence,
      next_action: nextAction,
      waiver: active.waiver,
    };

    // An unfinished session parks the phase: `interrupted` is what tells the
    // next session (and doctor) that work was left mid-phase.
    const parked =
      input.outcome === 'completed'
        ? state
        : this.phaseStatus.markInterrupted(state);

    const nextState: State = {
      ...parked,
      workflow: {
        ...parked.workflow,
        session: null,
        session_history: [...parked.workflow.session_history, record],
      },
    };

    return ok({ state: nextState, record });
  }
}

/**
 * Return a new state with `workflow.session` and `workflow.profile` set.
 */
function withSession(
  state: State,
  session: NonNullable<State['workflow']['session']>,
): State {
  return {
    ...state,
    workflow: {
      ...state.workflow,
      profile: session.profile,
      session,
    },
  };
}
