import type { Result, ClockPort, LoggerPort, TransitionRule } from '@l1dder/core';
import type { StageGuardError, GateRejectedError } from '@l1dder/core';
import {
  ForbiddenTransitionError,
  PhaseStatus,
  ProfileRouteError,
  TransitionKind,
  ok,
  err,
  findTransitionRule,
  isOffRouteIdleEscape,
  isTransitionAllowedInProfile,
  listAvailableTransitions,
  listProfileTransitions,
} from '@l1dder/core';
import type {
  Config,
  State,
  Phase,
  Actor,
  TriggerSource,
  TransitionKind as TransitionKindType,
  TransitionRequest as TransitionRequestSchemaType,
} from '@l1dder/schemas';

import type { ApprovalContext } from '../../ports/approver-port.js';
import type { IdempotencyChecker } from './idempotency.js';
import type { StageGuard } from './stage-guard.js';
import type { GateEngine } from './gate-engine.js';
import type { PhaseStatusManager } from './phase-status.js';
import type { RollbackHandler } from './rollback.js';

/**
 * Request submitted to `TransitionPipeline.execute()`.
 *
 * Derived from `@l1dder/schemas` {@link TransitionRequestSchemaType} (single
 * source of truth for `to`/`trigger`/`actor`) rather than re-declaring those
 * fields — only `dryRun`/`force` are widened to optional here since internal
 * callers may omit them (unlike the CLI-facing schema, which defaults them).
 */
export type TransitionRequest = Omit<TransitionRequestSchemaType, 'dryRun' | 'force'> & {
  readonly dryRun?: boolean;
  readonly force?: boolean;
};

/**
 * Outcome of a successful transition.
 */
export interface TransitionOutcome {
  readonly previousPhase: Phase;
  readonly newPhase: Phase;
  readonly kind: TransitionKindType;
  readonly noop: boolean;
  readonly gateOutcome?: { approved: boolean; approver: string };
}

/**
 * Union of errors that can occur during a transition.
 */
export type TransitionPipelineError =
  | ForbiddenTransitionError
  | StageGuardError
  | ProfileRouteError
  | GateRejectedError;

/**
 * Dependencies injected into TransitionPipeline.
 */
export interface TransitionPipelineDeps {
  readonly idempotency: IdempotencyChecker;
  readonly stageGuard: StageGuard;
  readonly gateEngine: GateEngine;
  readonly phaseStatus: PhaseStatusManager;
  readonly rollback: RollbackHandler;
  readonly clock: ClockPort;
  readonly logger: LoggerPort;
}

/**
 * Orchestrator for the entire phase transition flow (PM3, PM4, PM5).
 *
 * Pipeline steps:
 * 1. Idempotency check → no-op if current === target
 * 2. Find transition rule in whitelist → ForbiddenTransitionError if not found
 * 3. Stage guard → StageGuardError if hard-blocked
 * 4. Profile route guard → ProfileRouteError if off the selected workflow profile
 *    (`force` does **not** bypass this — profiles are structural, not a gate).
 *    Exception: an off-route current phase may return to IDLE (audited `skip`).
 * 5. Gate evaluation → GateRejectedError if rejected (skipped when `force: true`)
 * 6. Apply: update phase, status, history
 * 7. Return TransitionOutcome
 *
 * Handles both forward and rollback transitions via the unified transition table.
 */
export class TransitionPipeline {
  private readonly deps: TransitionPipelineDeps;

  constructor(deps: TransitionPipelineDeps) {
    this.deps = deps;
  }

  /**
   * Execute a phase transition.
   *
   * Profile route enforcement (when `workflow.profile !== null`) runs after the
   * stage guard and before gate evaluation. Unlike gates, `force: true` does
   * **not** bypass the profile route — profiles are structural constraints.
   * An off-route current phase may still return to IDLE (see
   * {@link isOffRouteIdleEscape}); that is a return onto the route, not a bypass.
   *
   * @param state - Current mutable state (will be modified in-place for the caller).
   * @param config - Project configuration (gates, stages).
   * @param request - Transition details (target phase, trigger, actor, options).
   * @returns `ok(TransitionOutcome)` with updated state, or `err(TransitionPipelineError)`.
   */
  async execute(
    state: State,
    config: Config,
    request: TransitionRequest,
  ): Promise<Result<{ outcome: TransitionOutcome; state: State }, TransitionPipelineError>> {
    const currentPhase = state.workflow.current_phase;
    const targetPhase = request.to;
    const mode = state.workflow.mode;

    // 1. Idempotency check
    const idempotencyResult = this.deps.idempotency.check(currentPhase, targetPhase);
    if (idempotencyResult.isNoop) {
      this.deps.logger.debug('Idempotent transition, no-op', {
        phase: currentPhase,
      });
      return ok({
        outcome: {
          previousPhase: currentPhase,
          newPhase: currentPhase,
          kind: 'forward',
          noop: true,
        },
        state,
      });
    }

    // 2. Find transition rule in whitelist (or the off-route → IDLE escape)
    const rule = findTransitionRule(currentPhase, targetPhase, mode);
    if (!rule) {
      const escape = this.executeOffRouteIdleEscape(state, config, request);
      if (escape !== null) {
        return escape;
      }
      return err(
        new ForbiddenTransitionError(
          currentPhase,
          targetPhase,
          mode,
          listAvailableTransitions(currentPhase, mode),
        ),
      );
    }

    // 3. Rollback path
    if (rule.kind === TransitionKind.ROLLBACK) {
      return this.executeRollback(state, config, request);
    }

    // 4. Stage guard
    const stageResult = this.deps.stageGuard.check(state, config, targetPhase);
    if (!stageResult.ok) {
      return err(stageResult.error);
    }

    // 5. Profile route guard (force does NOT bypass)
    const profileResult = this.checkProfileRoute(state, currentPhase, targetPhase);
    if (!profileResult.ok) {
      return err(profileResult.error);
    }

    // 6. Gate evaluation (skip if force)
    let gateOutcome: { approved: boolean; approver: string } | undefined;
    if (!request.force && rule.gates.length > 0) {
      const approvalContext: ApprovalContext = {
        phase: currentPhase,
        actor: request.actor,
        state,
        config,
      };

      const gateResult = await this.deps.gateEngine.evaluate(
        currentPhase,
        targetPhase,
        mode,
        config,
        approvalContext,
      );

      if (!gateResult.ok) {
        this.deps.logger.warn('Gate rejected, phase blocked', {
          from: currentPhase,
          to: targetPhase,
          error: gateResult.error.message,
        });

        return err(gateResult.error);
      }

      gateOutcome = {
        approved: gateResult.value.approved,
        approver: gateResult.value.approver,
      };
    } else if (request.force && rule.gates.length > 0) {
      this.deps.logger.info('Gate bypassed via force flag', {
        from: currentPhase,
        to: targetPhase,
        gates: rule.gates,
      });
    }

    // 7. Dry run — validate only, don't apply
    if (request.dryRun) {
      const outcome: TransitionOutcome = {
        previousPhase: currentPhase,
        newPhase: targetPhase,
        kind: rule.kind,
        noop: false,
        ...(gateOutcome ? { gateOutcome } : {}),
      };
      return ok({ outcome, state });
    }

    // 8. Apply transition
    const newState = this.applyForward(
      state,
      rule,
      request.actor,
      request.trigger,
    );

    this.deps.logger.info('Phase transition completed', {
      from: currentPhase,
      to: targetPhase,
      kind: rule.kind,
    });

    const outcome: TransitionOutcome = {
      previousPhase: currentPhase,
      newPhase: targetPhase,
      kind: rule.kind,
      noop: false,
      ...(gateOutcome ? { gateOutcome } : {}),
    };
    return ok({ outcome, state: newState });
  }

  /**
   * Execute a rollback transition through RollbackHandler.
   */
  private executeRollback(
    state: State,
    config: Config,
    request: TransitionRequest,
  ): Result<{ outcome: TransitionOutcome; state: State }, TransitionPipelineError> {
    const currentPhase = state.workflow.current_phase;

    // Stage guard applies to rollback targets too
    const stageResult = this.deps.stageGuard.check(state, config, request.to);
    if (!stageResult.ok) {
      return err(stageResult.error);
    }

    // Profile route applies to rollback targets too (force does not bypass)
    const profileResult = this.checkProfileRoute(state, currentPhase, request.to);
    if (!profileResult.ok) {
      return err(profileResult.error);
    }

    const validateResult = this.deps.rollback.validate(state, request.to);
    if (!validateResult.ok) {
      return err(validateResult.error);
    }

    if (request.dryRun) {
      return ok({
        outcome: {
          previousPhase: currentPhase,
          newPhase: request.to,
          kind: 'rollback',
          noop: false,
        },
        state,
      });
    }

    const newState = this.deps.rollback.apply(
      state,
      validateResult.value,
      request.actor,
      request.trigger,
      this.deps.clock,
    );

    this.deps.logger.info('Rollback transition completed', {
      from: currentPhase,
      to: request.to,
    });

    return ok({
      outcome: {
        previousPhase: currentPhase,
        newPhase: request.to,
        kind: 'rollback',
        noop: false,
      },
      state: newState,
    });
  }

  /**
   * Return to IDLE when the current phase sits off the selected profile route.
   *
   * Used only when the transition table has no matching row. `force` is not
   * required: this is recovery onto the route, not a silent walk off it.
   * Returns `null` when the pair is not an off-route escape.
   */
  private executeOffRouteIdleEscape(
    state: State,
    config: Config,
    request: TransitionRequest,
  ): Result<{ outcome: TransitionOutcome; state: State }, TransitionPipelineError> | null {
    const currentPhase = state.workflow.current_phase;
    const targetPhase = request.to;
    if (!isOffRouteIdleEscape(state.workflow.profile, currentPhase, targetPhase)) {
      return null;
    }

    const stageResult = this.deps.stageGuard.check(state, config, targetPhase);
    if (!stageResult.ok) {
      return err(stageResult.error);
    }

    if (request.dryRun) {
      return ok({
        outcome: {
          previousPhase: currentPhase,
          newPhase: targetPhase,
          kind: TransitionKind.SKIP,
          noop: false,
        },
        state,
      });
    }

    const now = this.deps.clock.now();
    const historyEntry = {
      phase: targetPhase,
      status: PhaseStatus.IN_PROGRESS,
      started_at: now,
      actor: request.actor,
      trigger: request.trigger,
      transition_kind: TransitionKind.SKIP,
      metadata: {
        off_route_escape: true,
        escaped_from: currentPhase,
        profile: state.workflow.profile,
      },
    };

    const newState: State = {
      ...state,
      workflow: {
        ...state.workflow,
        current_phase: targetPhase,
        current_status: PhaseStatus.IN_PROGRESS,
        phase_history: [...state.workflow.phase_history, historyEntry],
      },
    };

    this.deps.logger.info('Off-route idle escape completed', {
      from: currentPhase,
      to: targetPhase,
      profile: state.workflow.profile,
    });

    return ok({
      outcome: {
        previousPhase: currentPhase,
        newPhase: targetPhase,
        kind: TransitionKind.SKIP,
        noop: false,
      },
      state: newState,
    });
  }

  /**
   * Reject transitions that leave the selected workflow profile route.
   *
   * When `workflow.profile` is `null`, enforcement is off. Quick/fast endpoints
   * are never restricted by {@link isTransitionAllowedInProfile}.
   * Off-route → IDLE is allowed via {@link isOffRouteIdleEscape}.
   */
  private checkProfileRoute(
    state: State,
    from: Phase,
    to: Phase,
  ): Result<void, ProfileRouteError> {
    const profile = state.workflow.profile;
    if (profile === null) {
      return ok(undefined);
    }
    if (isTransitionAllowedInProfile(profile, from, to)) {
      return ok(undefined);
    }
    return err(
      new ProfileRouteError(
        profile,
        from,
        to,
        listProfileTransitions(profile, from),
      ),
    );
  }

  /**
   * Apply a forward transition: update phase, status, history.
   */
  private applyForward(
    state: State,
    rule: TransitionRule,
    actor: Actor,
    trigger: TriggerSource,
  ): State {
    const now = this.deps.clock.now();

    const historyEntry = {
      phase: rule.to,
      status: PhaseStatus.IN_PROGRESS,
      started_at: now,
      actor,
      trigger,
      transition_kind: rule.kind,
    };

    return {
      ...state,
      workflow: {
        ...state.workflow,
        current_phase: rule.to,
        current_status: PhaseStatus.IN_PROGRESS,
        phase_history: [...state.workflow.phase_history, historyEntry],
      },
    };
  }
}
