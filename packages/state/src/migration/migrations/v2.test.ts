import { describe, expect, it } from 'vitest';

import { v2Migration } from './v2.js';

describe('v2Migration', () => {
  it('adds empty discovery defaults and workflow.profile null for a v1 record', () => {
    const input: Record<string, unknown> = {
      schema_version: 1,
      project: { name: 'legacy' },
      workflow: {
        current_phase: 'idle',
        current_status: 'in_progress',
        mode: 'main',
        iteration: 0,
      },
    };

    const result = v2Migration.migrate(input);

    expect(result['schema_version']).toBe(2);
    expect(result['discovery']).toEqual({
      milestones: [],
      current: null,
      waivers: [],
    });
    expect(result['workflow']).toEqual({
      current_phase: 'idle',
      current_status: 'in_progress',
      mode: 'main',
      iteration: 0,
      profile: null,
    });
    expect(
      (result['discovery'] as { milestones: unknown[] }).milestones,
    ).toHaveLength(0);
  });

  it('preserves an existing discovery section', () => {
    const discovery = {
      milestones: [
        {
          id: 'idea',
          status: 'complete',
          required: true,
          planned_sessions: [],
          evidence: [],
        },
      ],
      current: 'product',
      waivers: [],
    };
    const input: Record<string, unknown> = {
      schema_version: 1,
      discovery,
      workflow: { current_phase: 'idle', profile: 'product_discovery' },
    };

    const result = v2Migration.migrate(input);

    expect(result['discovery']).toEqual(discovery);
    expect(result['discovery']).toBe(discovery);
    expect((result['workflow'] as Record<string, unknown>)['profile']).toBe(
      'product_discovery',
    );
  });

  it('does not mutate its input', () => {
    const input: Record<string, unknown> = {
      schema_version: 1,
      workflow: { current_phase: 'idle' },
    };
    const frozenWorkflow = { ...(input['workflow'] as object) };

    v2Migration.migrate(input);

    expect(input['schema_version']).toBe(1);
    expect(input['discovery']).toBeUndefined();
    expect(input['workflow']).toEqual(frozenWorkflow);
    expect(
      (input['workflow'] as Record<string, unknown>)['profile'],
    ).toBeUndefined();
  });
});
