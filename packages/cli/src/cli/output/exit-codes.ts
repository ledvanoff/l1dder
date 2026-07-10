import {
  L1dderError,
  ForbiddenTransitionError,
  StageGuardError,
  GateRejectedError,
  CorruptedStateError,
  SchemaValidationError,
  NotInitializedError,
  DependenciesNotMetError,
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
]);

/**
 * Map a domain error to a structured exit code.
 *
 * Known L1dderError subclasses map to specific codes (3–9).
 * Unknown errors map to GENERIC_ERROR (1).
 */
export function mapErrorToExitCode(error: unknown): ExitCode {
  if (error instanceof L1dderError) {
    const code = (error as { code?: string }).code;
    if (code) {
      const mapped = ERROR_CODE_MAP.get(code);
      if (mapped !== undefined) return mapped;
    }
    return ExitCode.GENERIC_ERROR;
  }
  return ExitCode.GENERIC_ERROR;
}

/**
 * Map a domain error to a machine-readable error code string.
 */
export function errorToCode(error: unknown): string {
  if (error instanceof L1dderError) {
    return (error as { code?: string }).code ?? 'GENERIC_ERROR';
  }
  return 'GENERIC_ERROR';
}

/**
 * Derive a user-actionable hint from an error, if applicable.
 */
export function errorToHint(error: unknown): string | undefined {
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
    return `Complete dependencies first: ${error.unmetDependencies.join(', ')}`;
  }
  return undefined;
}
