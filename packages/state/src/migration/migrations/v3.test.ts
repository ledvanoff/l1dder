import { describe, expect, it } from 'vitest';

import { v3Migration } from './v3.js';

describe('v3Migration', () => {
  it('adds workflow.session null for a v2 record', () => {
    const input: Record<string, unknown> = {
      schema_version: 2,
      project: { name: 'legacy' },
      workflow: {
        current_phase: 'idle',
        current_status: 'in_progress',
        mode: 'main',
        profile: null,
        iteration: 0,
      },
    };

    const result = v3Migration.migrate(input);

    expect(result['schema_version']).toBe(3);
    expect(result['workflow']).toEqual({
      current_phase: 'idle',
      current_status: 'in_progress',
      mode: 'main',
      profile: null,
      iteration: 0,
      session: null,
    });
  });

  it('preserves an existing workflow.session value', () => {
    const session = {
      iteration: 'ITER-001',
      session: 'HARD-5',
      profile: 'delivery',
      started_at: '2026-08-10T12:00:00Z',
      waiver: null,
    };
    const input: Record<string, unknown> = {
      schema_version: 2,
      workflow: {
        current_phase: 'implement',
        profile: 'delivery',
        session,
      },
    };

    const result = v3Migration.migrate(input);

    expect(result['schema_version']).toBe(3);
    expect((result['workflow'] as Record<string, unknown>)['session']).toEqual(
      session,
    );
    expect((result['workflow'] as Record<string, unknown>)['session']).toBe(
      session,
    );
  });

  it('does not mutate its input', () => {
    const input: Record<string, unknown> = {
      schema_version: 2,
      workflow: { current_phase: 'idle' },
    };
    const frozenWorkflow = { ...(input['workflow'] as object) };

    v3Migration.migrate(input);

    expect(input['schema_version']).toBe(2);
    expect(input['workflow']).toEqual(frozenWorkflow);
    expect(
      (input['workflow'] as Record<string, unknown>)['session'],
    ).toBeUndefined();
  });
});
