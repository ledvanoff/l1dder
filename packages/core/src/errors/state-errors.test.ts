import { describe, expect, it } from 'vitest';

import { Phase, ProjectStage, WorkflowMode } from '../domain/phase.js';
import { L1dderError } from './l1dder-error.js';
import {
  AlreadyAtStageError,
  CorruptedStateError,
  DependenciesNotMetError,
  ForbiddenTransitionError,
  GateRejectedError,
  InvalidStageTransitionError,
  InvalidTaskStatusTransitionError,
  NotInitializedError,
  SchemaValidationError,
  StageGuardError,
  TaskAlreadyExistsError,
  TaskNotFoundError,
} from './state-errors.js';

const ALL_ERROR_CLASSES = [
  { Class: ForbiddenTransitionError, code: 'FORBIDDEN_TRANSITION' },
  { Class: StageGuardError, code: 'STAGE_GUARD_BLOCKED' },
  { Class: GateRejectedError, code: 'GATE_REJECTED' },
  { Class: DependenciesNotMetError, code: 'DEPENDENCIES_NOT_MET' },
  { Class: CorruptedStateError, code: 'CORRUPTED_STATE' },
  { Class: SchemaValidationError, code: 'SCHEMA_VALIDATION' },
  { Class: NotInitializedError, code: 'NOT_INITIALIZED' },
  { Class: TaskNotFoundError, code: 'TASK_NOT_FOUND' },
  { Class: TaskAlreadyExistsError, code: 'TASK_ALREADY_EXISTS' },
  { Class: InvalidTaskStatusTransitionError, code: 'INVALID_TASK_STATUS_TRANSITION' },
  { Class: InvalidStageTransitionError, code: 'INVALID_STAGE_TRANSITION' },
  { Class: AlreadyAtStageError, code: 'ALREADY_AT_STAGE' },
] as const;

describe('Error hierarchy', () => {
  it('all error codes are unique strings', () => {
    const codes = ALL_ERROR_CLASSES.map((e) => e.code);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });
});

describe('ForbiddenTransitionError', () => {
  const error = new ForbiddenTransitionError(
    Phase.IDLE,
    Phase.IMPLEMENT,
    WorkflowMode.MAIN,
    [{ from: Phase.IDLE, to: Phase.SPECIFY, kind: 'forward', trigger: 'slash:specify', gates: [], mode: WorkflowMode.MAIN }],
    'Start with SPECIFY first',
  );

  it('is instanceof L1dderError', () => {
    expect(error).toBeInstanceOf(L1dderError);
  });

  it('is instanceof Error', () => {
    expect(error).toBeInstanceOf(Error);
  });

  it('has code FORBIDDEN_TRANSITION', () => {
    expect(error.code).toBe('FORBIDDEN_TRANSITION');
  });

  it('includes from, to, mode in message', () => {
    expect(error.message).toContain('idle');
    expect(error.message).toContain('implement');
    expect(error.message).toContain('main');
  });

  it('includes hint in message', () => {
    expect(error.message).toContain('Start with SPECIFY first');
  });

  it('stores contextual fields', () => {
    expect(error.from).toBe(Phase.IDLE);
    expect(error.to).toBe(Phase.IMPLEMENT);
    expect(error.mode).toBe(WorkflowMode.MAIN);
    expect(error.available).toHaveLength(1);
  });
});

describe('StageGuardError', () => {
  const error = new StageGuardError(Phase.IMPLEMENT, ProjectStage.DISCOVERY);

  it('is instanceof L1dderError', () => {
    expect(error).toBeInstanceOf(L1dderError);
  });

  it('has code STAGE_GUARD_BLOCKED', () => {
    expect(error.code).toBe('STAGE_GUARD_BLOCKED');
  });

  it('includes phase and stage in message', () => {
    expect(error.message).toContain('implement');
    expect(error.message).toContain('discovery');
  });
});

describe('GateRejectedError', () => {
  const error = new GateRejectedError('spec-gate', Phase.SPECIFY, 'reviewer@co.com');

  it('is instanceof L1dderError', () => {
    expect(error).toBeInstanceOf(L1dderError);
  });

  it('has code GATE_REJECTED', () => {
    expect(error.code).toBe('GATE_REJECTED');
  });

  it('includes gate and phase info', () => {
    expect(error.message).toContain('spec-gate');
    expect(error.message).toContain('specify');
  });
});

describe('DependenciesNotMetError', () => {
  const error = new DependenciesNotMetError('T-03', ['T-01', 'T-02']);

  it('is instanceof L1dderError', () => {
    expect(error).toBeInstanceOf(L1dderError);
  });

  it('has code DEPENDENCIES_NOT_MET', () => {
    expect(error.code).toBe('DEPENDENCIES_NOT_MET');
  });

  it('lists unmet dependencies', () => {
    expect(error.message).toContain('T-01');
    expect(error.message).toContain('T-02');
  });
});

describe('CorruptedStateError', () => {
  const error = new CorruptedStateError('.l1dder/state.yml', 'unexpected EOF');

  it('is instanceof L1dderError', () => {
    expect(error).toBeInstanceOf(L1dderError);
  });

  it('has code CORRUPTED_STATE', () => {
    expect(error.code).toBe('CORRUPTED_STATE');
  });

  it('includes file path and reason', () => {
    expect(error.message).toContain('.l1dder/state.yml');
    expect(error.message).toContain('unexpected EOF');
  });
});

describe('SchemaValidationError', () => {
  const error = new SchemaValidationError('.l1dder/state.yml', [{ path: ['project', 'name'] }]);

  it('is instanceof L1dderError', () => {
    expect(error).toBeInstanceOf(L1dderError);
  });

  it('has code SCHEMA_VALIDATION', () => {
    expect(error.code).toBe('SCHEMA_VALIDATION');
  });

  it('includes issue count', () => {
    expect(error.message).toContain('1 issue');
  });
});

describe('NotInitializedError', () => {
  const error = new NotInitializedError('/home/user/project');

  it('is instanceof L1dderError', () => {
    expect(error).toBeInstanceOf(L1dderError);
  });

  it('has code NOT_INITIALIZED', () => {
    expect(error.code).toBe('NOT_INITIALIZED');
  });

  it('includes cwd in message', () => {
    expect(error.message).toContain('/home/user/project');
  });

  it('suggests l1dder init', () => {
    expect(error.message).toContain('l1dder init');
  });
});

describe('TaskNotFoundError', () => {
  const error = new TaskNotFoundError('T-99');

  it('is instanceof L1dderError', () => {
    expect(error).toBeInstanceOf(L1dderError);
  });

  it('has code TASK_NOT_FOUND', () => {
    expect(error.code).toBe('TASK_NOT_FOUND');
  });
});

describe('TaskAlreadyExistsError', () => {
  const error = new TaskAlreadyExistsError('T-01');

  it('is instanceof L1dderError', () => {
    expect(error).toBeInstanceOf(L1dderError);
  });

  it('has code TASK_ALREADY_EXISTS', () => {
    expect(error.code).toBe('TASK_ALREADY_EXISTS');
  });

  it('includes taskId in message', () => {
    expect(error.message).toContain('T-01');
  });
});

describe('InvalidTaskStatusTransitionError', () => {
  const error = new InvalidTaskStatusTransitionError('T-01', 'done', 'in_progress');

  it('is instanceof L1dderError', () => {
    expect(error).toBeInstanceOf(L1dderError);
  });

  it('has code INVALID_TASK_STATUS_TRANSITION', () => {
    expect(error.code).toBe('INVALID_TASK_STATUS_TRANSITION');
  });

  it('includes taskId and from/to statuses in message', () => {
    expect(error.message).toContain('T-01');
    expect(error.message).toContain('done');
    expect(error.message).toContain('in_progress');
  });
});

describe('InvalidStageTransitionError', () => {
  const error = new InvalidStageTransitionError(ProjectStage.DISCOVERY, ProjectStage.MAINTENANCE);

  it('is instanceof L1dderError', () => {
    expect(error).toBeInstanceOf(L1dderError);
  });

  it('has code INVALID_STAGE_TRANSITION', () => {
    expect(error.code).toBe('INVALID_STAGE_TRANSITION');
  });
});

describe('AlreadyAtStageError', () => {
  const error = new AlreadyAtStageError(ProjectStage.DELIVERY);

  it('is instanceof L1dderError', () => {
    expect(error).toBeInstanceOf(L1dderError);
  });

  it('has code ALREADY_AT_STAGE', () => {
    expect(error.code).toBe('ALREADY_AT_STAGE');
  });
});
