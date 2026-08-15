import { describe, expect, it } from 'vitest';
import type { State } from '@l1dder/schemas';
import { generateHandoff } from './handoff-generator.js';
import { validateHandoff } from './handoff-detector.js';

const BASE_STATE: State = {
  schema_version: 4,
  project: {
    name: 'test-project',
    stage: 'delivery',
    stage_history: [],
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-23T00:00:00Z',
  },
  workflow: {
    current_phase: 'implement',
    current_status: 'in_progress',
    mode: 'main',
    profile: null,
    session: null,
    session_history: [],
    iteration: 3,
    phase_history: [],
    gate_history: [],
  },
  tasks: { items: [] },
  quick_tasks: [],
  knowledge_updates: [],
  decisions: [],
  discovery: { milestones: [], current: null, waivers: [] },
  skillRuns: [],
  skillVersions: [],
};

describe('generateHandoff', () => {
  it('generates content with all 3 required sections', () => {
    const result = generateHandoff(BASE_STATE);

    const validation = validateHandoff(result.content);
    expect(validation.valid).toBe(true);
    expect(validation.missing).toHaveLength(0);
  });

  it('includes project name and stage in session context', () => {
    const result = generateHandoff(BASE_STATE);

    expect(result.content).toContain('test-project');
    expect(result.content).toContain('delivery');
  });

  it('includes current phase and iteration in current state', () => {
    const result = generateHandoff(BASE_STATE);

    expect(result.content).toContain('implement');
    expect(result.content).toContain('3');
  });

  it('lists in-progress tasks in next steps', () => {
    const state: State = {
      ...BASE_STATE,
      tasks: {
        items: [
          {
            id: 'T-06',
            title: 'Adapter hooks generation',
            status: 'in_progress',
            depends_on: [],
          },
        ],
      },
    };

    const result = generateHandoff(state);
    expect(result.content).toContain('T-06');
    expect(result.content).toContain('Adapter hooks generation');
  });

  it('respects maxChars limit — content length does not exceed it', () => {
    const result = generateHandoff(BASE_STATE, { maxChars: 100 });

    expect(result.truncated).toBe(true);
    expect(result.content.length).toBeLessThanOrEqual(300); // truncated + stubs
  });

  it('still passes validateHandoff after truncation', () => {
    const result = generateHandoff(BASE_STATE, { maxChars: 50 });

    expect(result.truncated).toBe(true);
    const validation = validateHandoff(result.content);
    expect(validation.valid).toBe(true);
  });

  it('does not truncate when content is within maxChars', () => {
    const result = generateHandoff(BASE_STATE, { maxChars: 100000 });

    expect(result.truncated).toBe(false);
  });

  it('does not truncate when maxChars is 0 (unlimited)', () => {
    const result = generateHandoff(BASE_STATE, { maxChars: 0 });

    expect(result.truncated).toBe(false);
  });

  it('marks truncated=false for generated content under default 8000 char limit', () => {
    const result = generateHandoff(BASE_STATE);
    expect(result.truncated).toBe(false);
  });

  it('omits rich Decisions block when Decision Ledger is empty', () => {
    const result = generateHandoff(BASE_STATE);
    expect(result.content).not.toContain('## Решения');
    expect(result.content).not.toContain('## Decisions');
  });

  it('emits Decisions rich block only from Decision Ledger facts', () => {
    const state: State = {
      ...BASE_STATE,
      decisions: [
        {
          id: 'DEC-1',
          title: 'Use Zod 4',
          rationale: 'Schemas package already on Zod 4',
          alternatives: [],
          status: 'accepted',
          timestamp: '2026-06-01T00:00:00Z',
        },
      ],
    };

    const result = generateHandoff(state);
    expect(result.content).toContain('## Решения');
    expect(result.content).toContain('DEC-1');
    expect(result.content).toContain('Use Zod 4');
  });

  it('emits Recommended First Command only from session_history.next_action', () => {
    const state: State = {
      ...BASE_STATE,
      workflow: {
        ...BASE_STATE.workflow,
        session_history: [
          {
            iteration: 'ITER-001',
            session: 'HARD-6',
            profile: 'delivery',
            started_at: '2026-08-10T10:00:00Z',
            ended_at: '2026-08-10T12:00:00Z',
            outcome: 'handed_off',
            evidence: [],
            next_action: 'l1dder session status',
            waiver: null,
          },
        ],
      },
    };

    const result = generateHandoff(state);
    expect(result.content).toContain('## Рекомендуемая первая команда');
    expect(result.content).toContain('l1dder session status');
  });
});
