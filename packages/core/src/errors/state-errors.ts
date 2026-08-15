import type { TaskStatus } from '@l1dder/schemas';

import type { DiscoveryMilestoneId } from '../domain/discovery.js';
import type { Phase, ProjectStage, WorkflowMode } from '../domain/phase.js';
import type { TransitionRule } from '../domain/transition-types.js';
import type { WorkflowProfileId } from '../domain/workflow-profile.js';
import { L1dderError } from './l1dder-error.js';
import { formatSchemaIssues } from './schema-issues.js';

/**
 * Raised when a phase transition is not in the whitelist (PM6).
 *
 * Includes available transitions from the current phase as a hint.
 */
export class ForbiddenTransitionError extends L1dderError {
  readonly code = 'FORBIDDEN_TRANSITION' as const;

  constructor(
    readonly from: Phase,
    readonly to: Phase,
    readonly mode: WorkflowMode,
    readonly available: readonly TransitionRule[],
    readonly hint?: string | undefined,
  ) {
    const availableStr =
      available.length > 0
        ? available.map((r) => r.to).join(', ')
        : 'none';
    const base = `Cannot transition from "${from}" to "${to}" in ${mode} mode. Available: ${availableStr}`;
    super(hint ? `${base}. ${hint}` : base);
  }
}

/**
 * Raised when Project Stage guard blocks a transition (PS4, PS6).
 *
 * Example: trying to enter IMPLEMENT while project stage is "discovery".
 */
export class StageGuardError extends L1dderError {
  readonly code = 'STAGE_GUARD_BLOCKED' as const;

  constructor(
    readonly phase: Phase,
    readonly stage: ProjectStage,
    message?: string,
  ) {
    super(
      message ??
        `Phase "${phase}" is not allowed in project stage "${stage}"`,
    );
  }
}

/**
 * Raised when a gate rejects a transition (PM5, PM6).
 */
export class GateRejectedError extends L1dderError {
  readonly code = 'GATE_REJECTED' as const;

  constructor(
    readonly gateId: string,
    readonly phase: Phase,
    readonly rejectedBy: string,
    message?: string,
  ) {
    super(
      message ??
        `Gate "${gateId}" rejected at phase "${phase}" by ${rejectedBy}`,
    );
  }
}

/**
 * Raised when task dependencies block a transition or task start (PM12).
 */
export class DependenciesNotMetError extends L1dderError {
  readonly code = 'DEPENDENCIES_NOT_MET' as const;

  constructor(
    readonly taskId: string,
    readonly unmetDependencies: readonly string[],
    message?: string,
  ) {
    super(
      message ??
        `Task "${taskId}" has unmet dependencies: ${unmetDependencies.join(', ')}`,
    );
  }
}

/**
 * Raised when state.yml is corrupted or contains inconsistent data.
 *
 * May be caused by manual editing, partial writes, or version mismatch.
 */
export class CorruptedStateError extends L1dderError {
  readonly code = 'CORRUPTED_STATE' as const;

  constructor(
    readonly filePath: string,
    readonly reason: string,
  ) {
    super(`Corrupted state at "${filePath}": ${reason}`);
  }
}

/**
 * Raised when state.yml or config.yml fails Zod schema validation.
 *
 * Message includes safe Zod `path` + `message` pairs (never raw received values).
 */
export class SchemaValidationError extends L1dderError {
  readonly code = 'SCHEMA_VALIDATION' as const;

  constructor(
    readonly filePath: string,
    readonly issues: readonly unknown[],
  ) {
    super(
      `Schema validation failed for "${filePath}": ${formatSchemaIssues(issues)}`,
    );
  }
}

/**
 * Raised when an operation requires an initialized L1DDER project
 * but `.l1dder/state.yml` does not exist.
 */
export class NotInitializedError extends L1dderError {
  readonly code = 'NOT_INITIALIZED' as const;

  constructor(
    readonly cwd: string,
  ) {
    super(`L1DDER project not initialized in "${cwd}". Run "l1dder init" first.`);
  }
}

// ─── Union types for Result<T, E> error branches ───

/** Errors that can occur during a phase transition. */
export type TransitionError =
  | ForbiddenTransitionError
  | StageGuardError
  | GateRejectedError
  | DependenciesNotMetError
  | ProfileRouteError;

/** Errors that can occur when loading state.yml. */
export type StateLoadError =
  | CorruptedStateError
  | SchemaValidationError
  | NotInitializedError;

/** Errors related to task operations. */
export type TaskError =
  | DependenciesNotMetError
  | TaskNotFoundError
  | TaskAlreadyExistsError
  | InvalidTaskStatusTransitionError;

/**
 * Raised when a referenced task does not exist in `tasks.items[]`.
 */
export class TaskNotFoundError extends L1dderError {
  readonly code = 'TASK_NOT_FOUND' as const;

  constructor(readonly taskId: string) {
    super(`Task "${taskId}" not found`);
  }
}

/**
 * Raised when adding a task whose id already exists in `tasks.items[]`.
 *
 * Distinct from {@link TaskNotFoundError} (which means the opposite:
 * the task is absent) — conflating the two hid the real cause of `addTask`
 * failures behind a "not found" message.
 */
export class TaskAlreadyExistsError extends L1dderError {
  readonly code = 'TASK_ALREADY_EXISTS' as const;

  constructor(readonly taskId: string) {
    super(`Task "${taskId}" already exists`);
  }
}

/**
 * Raised when a task status transition is not allowed (e.g. completing a
 * task that hasn't been started, or starting one that's already done).
 *
 * Distinct from {@link TaskNotFoundError} — the task exists, but the
 * requested status change violates `isValidTaskStatusTransition()`.
 */
export class InvalidTaskStatusTransitionError extends L1dderError {
  readonly code = 'INVALID_TASK_STATUS_TRANSITION' as const;

  constructor(
    readonly taskId: string,
    readonly from: TaskStatus,
    readonly to: TaskStatus,
  ) {
    super(`Cannot transition task "${taskId}" from "${from}" to "${to}"`);
  }
}

/** Errors related to project stage operations. */
export type StageError =
  | InvalidStageTransitionError
  | AlreadyAtStageError;

/**
 * Raised when an invalid stage transition is attempted.
 */
export class InvalidStageTransitionError extends L1dderError {
  readonly code = 'INVALID_STAGE_TRANSITION' as const;

  constructor(
    readonly from: ProjectStage,
    readonly to: ProjectStage,
  ) {
    super(`Cannot transition project stage from "${from}" to "${to}"`);
  }
}

/**
 * Raised when attempting to set a stage the project is already in.
 */
export class AlreadyAtStageError extends L1dderError {
  readonly code = 'ALREADY_AT_STAGE' as const;

  constructor(readonly stage: ProjectStage) {
    super(`Project is already at stage "${stage}"`);
  }
}

// ─── Discovery milestone errors ───

/**
 * Raised when a referenced discovery milestone does not exist in state.
 */
export class MilestoneNotFoundError extends L1dderError {
  readonly code = 'MILESTONE_NOT_FOUND' as const;

  constructor(readonly milestoneId: DiscoveryMilestoneId) {
    super(`Discovery milestone "${milestoneId}" not found`);
  }
}

/**
 * Raised when a milestone may not leave `pending` because an earlier
 * milestone is still open (not `complete` / `not_applicable`).
 */
export class MilestoneOrderError extends L1dderError {
  readonly code = 'MILESTONE_ORDER' as const;

  constructor(
    readonly milestoneId: DiscoveryMilestoneId,
    readonly blockedBy: DiscoveryMilestoneId,
  ) {
    super(
      `Cannot advance milestone "${milestoneId}" while earlier milestone "${blockedBy}" is not closed`,
    );
  }
}

/**
 * Raised when a discovery milestone status transition is not allowed.
 */
export class MilestoneStatusTransitionError extends L1dderError {
  readonly code = 'MILESTONE_STATUS_TRANSITION' as const;

  constructor(
    readonly milestoneId: DiscoveryMilestoneId,
    readonly from: string,
    readonly to: string,
    message?: string,
  ) {
    super(
      message ??
        `Cannot transition milestone "${milestoneId}" from "${from}" to "${to}"`,
    );
  }
}

/**
 * Raised when completing a milestone without at least one evidence entry.
 */
export class MilestoneEvidenceRequiredError extends L1dderError {
  readonly code = 'MILESTONE_EVIDENCE_REQUIRED' as const;

  constructor(
    readonly milestoneId: DiscoveryMilestoneId,
    message?: string,
  ) {
    super(
      message ??
        `Milestone "${milestoneId}" requires at least one evidence entry to complete`,
    );
  }
}

/**
 * Raised when a milestone cannot be planned because the brainstorm summary or
 * the planned Agent Sessions are missing.
 */
export class MilestonePlanIncompleteError extends L1dderError {
  readonly code = 'MILESTONE_PLAN_INCOMPLETE' as const;

  constructor(
    readonly milestoneId: DiscoveryMilestoneId,
    readonly missing: 'summary' | 'sessions',
  ) {
    super(
      missing === 'summary'
        ? `Planning milestone "${milestoneId}" requires a non-empty brainstorm summary`
        : `Planning milestone "${milestoneId}" requires at least one planned session`,
    );
  }
}

/**
 * Raised when a conditional milestone is marked `not_applicable` without
 * a non-empty rationale, or when a reopen is requested without a reason.
 */
export class MilestoneRationaleRequiredError extends L1dderError {
  readonly code = 'MILESTONE_RATIONALE_REQUIRED' as const;

  constructor(
    readonly milestoneId: DiscoveryMilestoneId,
    message?: string,
  ) {
    super(
      message ??
        `Milestone "${milestoneId}" requires a non-empty rationale`,
    );
  }
}

/**
 * Raised when `not_applicable` is requested for a non-conditional milestone.
 */
export class MilestoneNotConditionalError extends L1dderError {
  readonly code = 'MILESTONE_NOT_CONDITIONAL' as const;

  constructor(readonly milestoneId: DiscoveryMilestoneId) {
    super(
      `Milestone "${milestoneId}" cannot be marked not_applicable (only conditional milestones allow it)`,
    );
  }
}

/**
 * Raised when a discovery waiver is attempted without a non-empty reason.
 */
export class WaiverReasonRequiredError extends L1dderError {
  readonly code = 'WAIVER_REASON_REQUIRED' as const;

  constructor(readonly milestoneId: DiscoveryMilestoneId) {
    super(`Waiver for milestone "${milestoneId}" requires a non-empty reason`);
  }
}

/**
 * Raised when a phase transition is off the selected workflow profile route.
 *
 * Profiles are structural — `force` does not bypass this check.
 */
export class ProfileRouteError extends L1dderError {
  readonly code = 'PROFILE_ROUTE' as const;

  constructor(
    readonly profile: WorkflowProfileId,
    readonly from: Phase,
    readonly to: Phase,
    readonly allowed: readonly Phase[],
  ) {
    const allowedStr = allowed.length > 0 ? allowed.join(', ') : 'none';
    super(
      `Transition "${from}" → "${to}" is not allowed on workflow profile "${profile}". Allowed targets: ${allowedStr}`,
    );
  }
}

/** Errors related to discovery milestone operations. */
export type MilestoneError =
  | MilestoneNotFoundError
  | MilestoneOrderError
  | MilestoneStatusTransitionError
  | MilestoneEvidenceRequiredError
  | MilestonePlanIncompleteError
  | MilestoneRationaleRequiredError
  | MilestoneNotConditionalError
  | WaiverReasonRequiredError;
