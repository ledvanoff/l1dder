import {
  L1dderError,
  ForbiddenTransitionError,
  StageGuardError,
  GateRejectedError,
  CorruptedStateError,
  SchemaValidationError,
  NotInitializedError,
  DependenciesNotMetError,
  MilestoneOrderError,
  MilestoneStatusTransitionError,
  MilestoneEvidenceRequiredError,
  MilestonePlanIncompleteError,
  MilestoneRationaleRequiredError,
  MilestoneNotConditionalError,
  MilestoneNotFoundError,
  WaiverReasonRequiredError,
} from '@l1dder/core';

/** Structured exit codes for CLI (CL3). */
export const ExitCode = {
  SUCCESS: 0,
  GENERIC_ERROR: 1,
  USAGE_ERROR: 2,
  FORBIDDEN_TRANSITION: 3,
  STAGE_GUARD_BLOCKED: 4,
  GATE_REJECTED: 5,
  CORRUPTED_STATE: 6,
  SCHEMA_VALIDATION: 7,
  NOT_INITIALIZED: 8,
  DEPENDENCIES_NOT_MET: 9,
  /** `--force` supplied without a non-empty `--reason`. */
  FORCE_REASON_REQUIRED: 10,
  /** Discovery checklist incomplete; stage advance / guarded transition blocked. */
  DISCOVERY_NOT_READY: 11,
  /** Discovery milestone lifecycle rejection (order, status, evidence, …). */
  MILESTONE_ERROR: 12,
  /** Task sync / parse / completion / projection failures. */
  TASKS_ERROR: 13,
  /** Agent Session rail guard / start failures. */
  SESSION_ERROR: 14,
} as const;

export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];

const ERROR_CODE_MAP: ReadonlyMap<string, ExitCode> = new Map([
  ['FORBIDDEN_TRANSITION', ExitCode.FORBIDDEN_TRANSITION],
  ['STAGE_GUARD_BLOCKED', ExitCode.STAGE_GUARD_BLOCKED],
  ['GATE_REJECTED', ExitCode.GATE_REJECTED],
  ['CORRUPTED_STATE', ExitCode.CORRUPTED_STATE],
  ['SCHEMA_VALIDATION', ExitCode.SCHEMA_VALIDATION],
  ['NOT_INITIALIZED', ExitCode.NOT_INITIALIZED],
  ['DEPENDENCIES_NOT_MET', ExitCode.DEPENDENCIES_NOT_MET],
  ['MILESTONE_NOT_FOUND', ExitCode.MILESTONE_ERROR],
  ['MILESTONE_ORDER', ExitCode.MILESTONE_ERROR],
  ['MILESTONE_STATUS_TRANSITION', ExitCode.MILESTONE_ERROR],
  ['MILESTONE_EVIDENCE_REQUIRED', ExitCode.MILESTONE_ERROR],
  ['MILESTONE_PLAN_INCOMPLETE', ExitCode.MILESTONE_ERROR],
  ['MILESTONE_RATIONALE_REQUIRED', ExitCode.MILESTONE_ERROR],
  ['MILESTONE_NOT_CONDITIONAL', ExitCode.MILESTONE_ERROR],
  ['WAIVER_REASON_REQUIRED', ExitCode.MILESTONE_ERROR],
  ['INVALID_STAGE_TRANSITION', ExitCode.DISCOVERY_NOT_READY],
  ['SESSION_FORCE_REASON_REQUIRED', ExitCode.FORCE_REASON_REQUIRED],
  ['FORCE_REASON_REQUIRED', ExitCode.FORCE_REASON_REQUIRED],
  ['TASKS_FILE_NOT_FOUND', ExitCode.TASKS_ERROR],
  ['TASKS_TABLE_MISSING', ExitCode.TASKS_ERROR],
  ['TASKS_COLUMN_MISSING', ExitCode.TASKS_ERROR],
  ['TASKS_INVALID_ID', ExitCode.TASKS_ERROR],
  ['TASKS_DUPLICATE_ID', ExitCode.TASKS_ERROR],
  ['TASKS_UNKNOWN_DEPENDENCY', ExitCode.TASKS_ERROR],
  ['TASKS_INVALID_STATUS', ExitCode.TASKS_ERROR],
  ['TASKS_STATUS_COLUMN_MISSING', ExitCode.TASKS_ERROR],
  ['TASKS_TASK_NOT_FOUND', ExitCode.TASKS_ERROR],
  ['TASKS_PROJECTION_EMPTY', ExitCode.TASKS_ERROR],
  ['TASKS_INCOMPLETE', ExitCode.TASKS_ERROR],
  ['SESSION_OFF_ROAD', ExitCode.SESSION_ERROR],
  ['SESSION_ALREADY_CLOSED', ExitCode.SESSION_ERROR],
  ['SESSION_DEPENDENCY_UNMET', ExitCode.SESSION_ERROR],
  ['SESSION_NOT_ACTIVE', ExitCode.SESSION_ERROR],
  ['SESSION_END_EVIDENCE_REQUIRED', ExitCode.SESSION_ERROR],
]);

/**
 * Extract a stable domain error code from an Error, GateRejectedError, or
 * plain `{ code }` object used by Result err values.
 */
function extractDomainCode(error: unknown): string | undefined {
  if (error instanceof GateRejectedError) {
    // Condition failures pass their stable code as rejectedBy.
    if (
      error.rejectedBy.startsWith('TASKS_') ||
      error.rejectedBy.startsWith('SESSION_')
    ) {
      return error.rejectedBy;
    }
    return error.code;
  }
  if (error instanceof L1dderError) {
    return error.code;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code;
  }
  return undefined;
}

/**
 * Map a domain error to a structured exit code.
 *
 * Known L1dderError subclasses and task/session domain codes map to
 * specific codes (3–14). Unknown errors map to GENERIC_ERROR (1).
 */
export function mapErrorToExitCode(error: unknown): ExitCode {
  const domainCode = extractDomainCode(error);
  if (domainCode !== undefined) {
    const mapped = ERROR_CODE_MAP.get(domainCode);
    if (mapped !== undefined) return mapped;
  }
  if (error instanceof L1dderError) {
    return ExitCode.GENERIC_ERROR;
  }
  return ExitCode.GENERIC_ERROR;
}

/**
 * Map a domain error to a machine-readable error code string.
 */
export function errorToCode(error: unknown): string {
  const domainCode = extractDomainCode(error);
  if (domainCode !== undefined) return domainCode;
  return 'GENERIC_ERROR';
}

/**
 * Derive a user-actionable hint from an error, if applicable.
 */
export function errorToHint(error: unknown): string | undefined {
  const domainCode = extractDomainCode(error);

  if (domainCode === 'TASKS_PROJECTION_EMPTY') {
    return 'Run `l1dder task sync` to project tasks.md into state.';
  }
  if (domainCode === 'TASKS_INCOMPLETE') {
    return 'Mark remaining tasks done (`l1dder task complete <T-NN>`) or skipped, then retry.';
  }
  if (domainCode === 'TASKS_FILE_NOT_FOUND') {
    return 'Create specs/current/tasks.md (or pass --file <path>) then run `l1dder task sync`.';
  }
  if (
    domainCode === 'TASKS_TABLE_MISSING' ||
    domainCode === 'TASKS_COLUMN_MISSING' ||
    domainCode === 'TASKS_STATUS_COLUMN_MISSING' ||
    domainCode === 'TASKS_INVALID_ID' ||
    domainCode === 'TASKS_DUPLICATE_ID' ||
    domainCode === 'TASKS_UNKNOWN_DEPENDENCY' ||
    domainCode === 'TASKS_INVALID_STATUS' ||
    domainCode === 'TASKS_TASK_NOT_FOUND'
  ) {
    return 'Fix the Task List table in tasks.md (id / Status / depends_on), then retry.';
  }
  if (domainCode === 'SESSION_OFF_ROAD') {
    return 'Start the next eligible session (`l1dder session status`) or bypass with --force --reason "...".';
  }
  if (domainCode === 'SESSION_ALREADY_CLOSED') {
    return 'Pick an open session from `l1dder session status` (pending / in_progress).';
  }
  if (domainCode === 'SESSION_DEPENDENCY_UNMET') {
    const blocking =
      typeof error === 'object' &&
      error !== null &&
      'blockingIds' in error &&
      Array.isArray((error as { blockingIds?: unknown }).blockingIds)
        ? ((error as { blockingIds: readonly string[] }).blockingIds).join(', ')
        : undefined;
    return blocking !== undefined && blocking.length > 0
      ? `Close blocking sessions first: ${blocking}. Or bypass with --force --reason "...".`
      : 'Close blocking dependency sessions first, or bypass with --force --reason "...".';
  }
  if (domainCode === 'SESSION_NOT_ACTIVE') {
    return 'Start a session first: `l1dder session start <SESSION-ID>`.';
  }
  if (domainCode === 'SESSION_END_EVIDENCE_REQUIRED') {
    return 'Pass at least one --evidence "<what was done>" for --outcome completed.';
  }
  if (
    domainCode === 'SESSION_FORCE_REASON_REQUIRED' ||
    domainCode === 'FORCE_REASON_REQUIRED'
  ) {
    return 'Provide a reason: --force --reason "..."';
  }

  if (error instanceof NotInitializedError) {
    return "Run 'l1dder init' to initialize a project.";
  }
  if (error instanceof ForbiddenTransitionError) {
    return `Available transitions: ${error.available.map((r) => r.to).join(', ') || 'none'}`;
  }
  if (error instanceof StageGuardError) {
    return "Run 'l1dder stage advance' to switch project stage.";
  }
  if (error instanceof GateRejectedError) {
    return 'Resolve gate requirements before proceeding.';
  }
  if (error instanceof CorruptedStateError) {
    return "Run 'l1dder doctor' to diagnose state issues.";
  }
  if (error instanceof SchemaValidationError) {
    return 'Check state.yml / config.yml for schema errors.';
  }
  if (error instanceof DependenciesNotMetError) {
    return (
      `Complete or skip blocking tasks first (${error.unmetDependencies.join(', ')}), ` +
      'then retry: l1dder task complete <T-NN>'
    );
  }
  if (error instanceof MilestoneOrderError) {
    return `Complete or skip "${error.blockedBy}" before advancing "${error.milestoneId}".`;
  }
  if (
    error instanceof MilestoneStatusTransitionError ||
    error instanceof MilestoneEvidenceRequiredError ||
    error instanceof MilestonePlanIncompleteError ||
    error instanceof MilestoneRationaleRequiredError ||
    error instanceof MilestoneNotConditionalError ||
    error instanceof MilestoneNotFoundError ||
    error instanceof WaiverReasonRequiredError
  ) {
    return "Run 'l1dder discovery status' to see the ordered checklist and blockers.";
  }
  return undefined;
}
