import { describe, expect, it } from 'vitest';

import {
  ActorSchema,
  CURRENT_SCHEMA_VERSION,
  PhaseSchema,
  PhaseStatusSchema,
  SkillRunSchema,
  SkillVersionSchema,
  StateSchema,
  TriggerSourceSchema,
  WorkflowModeSchema,
} from './state.js';

// ─── Test fixtures ───

const NOW = '2026-01-15T10:00:00Z';

const humanActor = { kind: 'human' as const, id: 'user@example.com' };
const cliTrigger = { kind: 'cli' as const, command: 'init' };

const greenfieldState = {
  schema_version: 1,
  project: {
    name: 'my-project',
    stage: 'delivery',
    stage_history: [],
    created_at: NOW,
    updated_at: NOW,
  },
  workflow: {
    current_phase: 'idle',
    current_status: 'in_progress',
    mode: 'main',
    iteration: 0,
    phase_history: [],
    gate_history: [],
  },
  tasks: {
    items: [],
  },
  quick_tasks: [],
  knowledge_updates: [],
};

const brownfieldState = {
  ...greenfieldState,
  project: {
    ...greenfieldState.project,
    name: 'existing-project',
  },
};

const minimalState = {
  project: {
    name: 'minimal',
    created_at: NOW,
    updated_at: NOW,
  },
};

describe('PhaseSchema', () => {
  it('accepts all 15 valid phase values', () => {
    const phases = [
      'idle', 'specify', 'plan', 'update_tobe', 'tasks',
      'implement', 'update_asis', 'complete', 'review', 'hygiene',
      'quick_plan', 'quick_implement', 'quick_complete',
      'fast_implement', 'fast_complete',
    ];
    for (const phase of phases) {
      expect(PhaseSchema.parse(phase)).toBe(phase);
    }
  });

  it('rejects invalid phase value', () => {
    expect(() => PhaseSchema.parse('invalid')).toThrow();
  });

  it('has exactly 15 options', () => {
    expect(PhaseSchema.options).toHaveLength(15);
  });
});

describe('PhaseStatusSchema', () => {
  it('accepts all 6 valid status values', () => {
    const statuses = [
      'in_progress', 'awaiting_gate', 'blocked',
      'completed', 'revisited', 'interrupted',
    ];
    for (const status of statuses) {
      expect(PhaseStatusSchema.parse(status)).toBe(status);
    }
  });
});

describe('WorkflowModeSchema', () => {
  it('accepts all 3 workflow modes', () => {
    for (const mode of ['main', 'quick', 'fast']) {
      expect(WorkflowModeSchema.parse(mode)).toBe(mode);
    }
  });
});

describe('TriggerSourceSchema', () => {
  it('parses cli trigger', () => {
    const result = TriggerSourceSchema.parse(cliTrigger);
    expect(result).toEqual(cliTrigger);
  });

  it('parses slash trigger', () => {
    const result = TriggerSourceSchema.parse({ kind: 'slash', command: 'specify' });
    expect(result.kind).toBe('slash');
  });

  it('parses auto trigger', () => {
    const result = TriggerSourceSchema.parse({ kind: 'auto', reason: 'completed all tasks' });
    expect(result.kind).toBe('auto');
  });

  it('parses recovery trigger', () => {
    const result = TriggerSourceSchema.parse({ kind: 'recovery', original_phase: 'implement' });
    expect(result.kind).toBe('recovery');
  });

  it('rejects unknown trigger kind', () => {
    expect(() => TriggerSourceSchema.parse({ kind: 'unknown' })).toThrow();
  });
});

describe('ActorSchema', () => {
  it('parses human actor', () => {
    expect(ActorSchema.parse(humanActor)).toEqual(humanActor);
  });

  it('parses ai actor with optional session_id', () => {
    const ai = { kind: 'ai' as const, model: 'claude-opus-4', session_id: 'sess-123' };
    expect(ActorSchema.parse(ai)).toEqual(ai);
  });

  it('parses ai actor without session_id', () => {
    const ai = { kind: 'ai' as const, model: 'claude-opus-4' };
    expect(ActorSchema.parse(ai).kind).toBe('ai');
  });

  it('parses system actor', () => {
    expect(ActorSchema.parse({ kind: 'system' })).toEqual({ kind: 'system' });
  });
});

describe('StateSchema', () => {
  it('parses greenfield init state', () => {
    const result = StateSchema.parse(greenfieldState);
    expect(result.project.name).toBe('my-project');
    expect(result.workflow.current_phase).toBe('idle');
    expect(result.schema_version).toBe(1);
  });

  it('parses brownfield init state', () => {
    const result = StateSchema.parse(brownfieldState);
    expect(result.project.name).toBe('existing-project');
    expect(result.workflow.mode).toBe('main');
  });

  it('parses minimal state with defaults', () => {
    const result = StateSchema.parse(minimalState);
    expect(result.schema_version).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.workflow.current_phase).toBe('idle');
    expect(result.workflow.current_status).toBe('in_progress');
    expect(result.workflow.mode).toBe('main');
    expect(result.workflow.iteration).toBe(0);
    expect(result.tasks.items).toEqual([]);
    expect(result.quick_tasks).toEqual([]);
    expect(result.knowledge_updates).toEqual([]);
  });

  it('parses state with phase_history entries', () => {
    const stateWithHistory = {
      ...greenfieldState,
      workflow: {
        ...greenfieldState.workflow,
        phase_history: [{
          phase: 'specify',
          status: 'completed',
          started_at: NOW,
          completed_at: NOW,
          actor: humanActor,
          trigger: cliTrigger,
          transition_kind: 'forward',
        }],
      },
    };
    const result = StateSchema.parse(stateWithHistory);
    expect(result.workflow.phase_history).toHaveLength(1);
    expect(result.workflow.phase_history[0]?.phase).toBe('specify');
  });

  it('parses state with _in_flight_transition', () => {
    const stateWithFlight = {
      ...greenfieldState,
      _in_flight_transition: {
        from: 'idle',
        to: 'specify',
        started_at: NOW,
        actor: humanActor,
        trigger: cliTrigger,
      },
    };
    const result = StateSchema.parse(stateWithFlight);
    expect(result._in_flight_transition).toBeDefined();
    expect(result._in_flight_transition?.from).toBe('idle');
  });

  it('rejects state without required project fields', () => {
    expect(() => StateSchema.parse({})).toThrow();
    expect(() => StateSchema.parse({ project: {} })).toThrow();
  });

  it('defaults skillRuns/skillVersions to [] for a legacy state without telemetry (T-08)', () => {
    const result = StateSchema.parse(minimalState);
    expect(result.skillRuns).toEqual([]);
    expect(result.skillVersions).toEqual([]);
  });

  it('round-trips a recorded skillRun', () => {
    const stateWithRun = {
      ...greenfieldState,
      skillRuns: [{
        skillId: 'specify-feature',
        phase: 'specify',
        outcome: 'success',
        tokensUsed: 1200,
        durationMs: 45_000,
        timestamp: NOW,
      }],
    };
    const result = StateSchema.parse(stateWithRun);
    expect(result.skillRuns).toHaveLength(1);
    expect(result.skillRuns[0]).toMatchObject({ skillId: 'specify-feature', outcome: 'success' });
  });

  it('round-trips a recorded skillVersion with contentHash', () => {
    const stateWithVersion = {
      ...greenfieldState,
      skillVersions: [{ skillId: 'specify-feature', contentHash: 'abc123', timestamp: NOW }],
    };
    const result = StateSchema.parse(stateWithVersion);
    expect(result.skillVersions).toHaveLength(1);
    expect(result.skillVersions[0]).toEqual({ skillId: 'specify-feature', contentHash: 'abc123', timestamp: NOW });
  });
});

describe('SkillRunSchema', () => {
  it('requires skillId, phase, outcome, timestamp; other fields optional', () => {
    const result = SkillRunSchema.parse({
      skillId: 'hygiene-audit',
      phase: 'hygiene',
      outcome: 'failure',
      timestamp: NOW,
    });
    expect(result.outcome).toBe('failure');
    expect(result.tokensUsed).toBeUndefined();
  });

  it('rejects an invalid outcome value', () => {
    expect(() =>
      SkillRunSchema.parse({ skillId: 'x', phase: 'idle', outcome: 'maybe', timestamp: NOW }),
    ).toThrow();
  });
});

describe('SkillVersionSchema', () => {
  it('parses a minimal skill version record', () => {
    const result = SkillVersionSchema.parse({ skillId: 'x', contentHash: 'deadbeef', timestamp: NOW });
    expect(result.contentHash).toBe('deadbeef');
  });
});
