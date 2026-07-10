import { describe, expect, it } from 'vitest';

import {
  AdapterRegistry,
  AlreadyAtStageError,
  CorruptedStateError,
  DependenciesNotMetError,
  ForbiddenTransitionError,
  GateRejectedError,
  InvalidStageTransitionError,
  InvalidTaskStatusTransitionError,
  L1dderError,
  NotInitializedError,
  PHASE_TO_MODE,
  Phase,
  PhaseStatus,
  ProjectStage,
  SchemaValidationError,
  StageGuardError,
  TRANSITIONS,
  TaskAlreadyExistsError,
  TaskNotFoundError,
  ToolAlreadyRegisteredError,
  ToolRegistry,
  TransitionKind,
  WorkflowMode,
  err,
  findTransitionRule,
  isAllowedTransition,
  isErr,
  isOk,
  isRollbackAllowed,
  listAvailableTransitions,
  ok,
  requiredGatesFor,
} from './index.js';

describe('@l1dder/core barrel', () => {
  it('exports domain types', () => {
    expect(Phase).toBeDefined();
    expect(PhaseStatus).toBeDefined();
    expect(WorkflowMode).toBeDefined();
    expect(ProjectStage).toBeDefined();
    expect(TransitionKind).toBeDefined();
    expect(PHASE_TO_MODE).toBeDefined();
  });

  it('exports transition table and functions', () => {
    expect(TRANSITIONS).toBeDefined();
    expect(isAllowedTransition).toBeDefined();
    expect(findTransitionRule).toBeDefined();
    expect(requiredGatesFor).toBeDefined();
    expect(listAvailableTransitions).toBeDefined();
    expect(isRollbackAllowed).toBeDefined();
  });

  it('exports Result helpers', () => {
    expect(ok).toBeDefined();
    expect(err).toBeDefined();
    expect(isOk).toBeDefined();
    expect(isErr).toBeDefined();
  });

  it('exports error classes', () => {
    expect(L1dderError).toBeDefined();
    expect(ForbiddenTransitionError).toBeDefined();
    expect(StageGuardError).toBeDefined();
    expect(GateRejectedError).toBeDefined();
    expect(DependenciesNotMetError).toBeDefined();
    expect(CorruptedStateError).toBeDefined();
    expect(SchemaValidationError).toBeDefined();
    expect(NotInitializedError).toBeDefined();
    expect(TaskNotFoundError).toBeDefined();
    expect(TaskAlreadyExistsError).toBeDefined();
    expect(InvalidTaskStatusTransitionError).toBeDefined();
    expect(InvalidStageTransitionError).toBeDefined();
    expect(AlreadyAtStageError).toBeDefined();
  });

  it('exports extension classes', () => {
    expect(ToolRegistry).toBeDefined();
    expect(ToolAlreadyRegisteredError).toBeDefined();
  });

  it('exports integration classes', () => {
    expect(AdapterRegistry).toBeDefined();
  });
});
