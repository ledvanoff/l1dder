import { describe, expect, it } from 'vitest';

import { v4Migration } from './v4.js';

describe('v4Migration', () => {
  it('adds workflow.session_history [] for a v3 record', () => {
    const input: Record<string, unknown> = {
      schema_version: 3,
      project: { name: 'legacy' },
      workflow: {
        current_phase: 'idle',
        current_status: 'in_progress',
        mode: 'main',
        profile: null,
        session: null,
        iteration: 0,
      },
    };

    const result = v4Migration.migrate(input);

    expect(result['schema_version']).toBe(4);
    expect(result['workflow']).toEqual({
      current_phase: 'idle',
      current_status: 'in_progress',
      mode: 'main',
      profile: null,
      session: null,
      iteration: 0,
      session_history: [],
    });
  });

  it('preserves an existing workflow.session_history value', () => {
    const history = [
      {
        iteration: 'ITER-001',
        session: 'HARD-5',
        profile: 'delivery',
        started_at: '2026-08-10T12:00:00Z',
        ended_at: '2026-08-10T14:00:00Z',
        outcome: 'completed',
        evidence: ['shipped T-15'],
        next_action: null,
        waiver: null,
      },
    ];
    const input: Record<string, unknown> = {
      schema_version: 3,
      workflow: {
        current_phase: 'implement',
        profile: 'delivery',
        session: null,
        session_history: history,
      },
    };

    const result = v4Migration.migrate(input);

    expect(result['schema_version']).toBe(4);
    expect(
      (result['workflow'] as Record<string, unknown>)['session_history'],
    ).toEqual(history);
    expect(
      (result['workflow'] as Record<string, unknown>)['session_history'],
    ).toBe(history);
  });

  it('does not mutate its input', () => {
    const input: Record<string, unknown> = {
      schema_version: 3,
      workflow: { current_phase: 'idle', session: null },
    };
    const frozenWorkflow = { ...(input['workflow'] as object) };

    v4Migration.migrate(input);

    expect(input['schema_version']).toBe(3);
    expect(input['workflow']).toEqual(frozenWorkflow);
    expect(
      (input['workflow'] as Record<string, unknown>)['session_history'],
    ).toBeUndefined();
  });
});
