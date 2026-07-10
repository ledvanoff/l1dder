import { describe, expect, it } from 'vitest';

import {
  ForbiddenTransitionError,
  StageGuardError,
  GateRejectedError,
  CorruptedStateError,
  SchemaValidationError,
  NotInitializedError,
  DependenciesNotMetError,
  TaskNotFoundError,
} from '@l1dder/core';

import { ExitCode, mapErrorToExitCode, errorToCode, errorToHint } from './exit-codes.js';

describe('mapErrorToExitCode', () => {
  it('maps ForbiddenTransitionError to exit code 3', () => {
    const error = new ForbiddenTransitionError('idle', 'complete', 'main', []);
    expect(mapErrorToExitCode(error)).toBe(ExitCode.FORBIDDEN_TRANSITION);
  });

  it('maps StageGuardError to exit code 4', () => {
    const error = new StageGuardError('implement', 'discovery');
    expect(mapErrorToExitCode(error)).toBe(ExitCode.STAGE_GUARD_BLOCKED);
  });

  it('maps GateRejectedError to exit code 5', () => {
    const error = new GateRejectedError('gate-1', 'plan', 'user');
    expect(mapErrorToExitCode(error)).toBe(ExitCode.GATE_REJECTED);
  });

  it('maps CorruptedStateError to exit code 6', () => {
    const error = new CorruptedStateError('state.yml', 'bad data');
    expect(mapErrorToExitCode(error)).toBe(ExitCode.CORRUPTED_STATE);
  });

  it('maps SchemaValidationError to exit code 7', () => {
    const error = new SchemaValidationError('config.yml', [{ path: 'x' }]);
    expect(mapErrorToExitCode(error)).toBe(ExitCode.SCHEMA_VALIDATION);
  });

  it('maps NotInitializedError to exit code 8', () => {
    const error = new NotInitializedError('/tmp/project');
    expect(mapErrorToExitCode(error)).toBe(ExitCode.NOT_INITIALIZED);
  });

  it('maps DependenciesNotMetError to exit code 9', () => {
    const error = new DependenciesNotMetError('task-3', ['task-1', 'task-2']);
    expect(mapErrorToExitCode(error)).toBe(ExitCode.DEPENDENCIES_NOT_MET);
  });

  it('maps L1dderError without specific mapping to exit code 1', () => {
    const error = new TaskNotFoundError('task-x');
    expect(mapErrorToExitCode(error)).toBe(ExitCode.GENERIC_ERROR);
  });

  it('maps unknown Error to exit code 1', () => {
    expect(mapErrorToExitCode(new Error('something'))).toBe(ExitCode.GENERIC_ERROR);
  });

  it('maps non-Error to exit code 1', () => {
    expect(mapErrorToExitCode('string error')).toBe(ExitCode.GENERIC_ERROR);
  });
});

describe('errorToCode', () => {
  it('returns error code for known errors', () => {
    expect(errorToCode(new NotInitializedError('/tmp'))).toBe('NOT_INITIALIZED');
  });

  it('returns GENERIC_ERROR for unknown errors', () => {
    expect(errorToCode(new Error('oops'))).toBe('GENERIC_ERROR');
  });
});

describe('errorToHint', () => {
  it('returns hint for NotInitializedError', () => {
    expect(errorToHint(new NotInitializedError('/tmp'))).toContain('l1dder init');
  });

  it('returns hint for StageGuardError', () => {
    expect(errorToHint(new StageGuardError('implement', 'discovery'))).toContain('stage advance');
  });

  it('returns undefined for generic Error', () => {
    expect(errorToHint(new Error('oops'))).toBeUndefined();
  });
});
