import { describe, expect, it } from 'vitest';
import { SchemaValidationError } from '@l1dder/core';
import { stringifyYaml } from '@l1dder/yaml';
import { StateSchema } from '@l1dder/schemas';

import { buildBrief } from './brief-builder.js';
import { MockTokenCounter, InMemoryContextFs, FixedContextClock } from '../../testing.js';

const clock = new FixedContextClock('2026-05-11T12:00:00.000Z');
const counter = new MockTokenCounter(3);

function validStateYaml(overrides?: Record<string, unknown>): string {
  const base = {
    schema_version: 1,
    project: {
      name: 'test',
      stage: 'delivery',
      stage_history: [],
      created_at: '2026-05-11T00:00:00Z',
      updated_at: '2026-05-11T00:00:00Z',
    },
    workflow: {
      current_phase: 'implement',
      current_status: 'in_progress',
      mode: 'main',
      iteration: 3,
      phase_history: [],
      gate_history: [],
    },
    tasks: { items: [] },
    quick_tasks: [],
    knowledge_updates: [],
    decisions: [],
    skillRuns: [],
    skillVersions: [],
  };
  return stringifyYaml(StateSchema.parse({ ...base, ...overrides }));
}

describe('buildBrief', () => {
  it('generates brief with all available sections', async () => {
    const fs = new InMemoryContextFs({
      'knowledge/idea.md': '## Summary\n\nA great project idea.',
      'knowledge/roadmap.md': '## Summary\n\nRoadmap overview here.',
      'knowledge/to-be/architecture.md': '## Summary\n\nTarget architecture.',
      '.l1dder/state.yml': validStateYaml(),
    });

    const result = await buildBrief(fs, counter, clock, '');

    expect(result.content).toContain('Idea');
    expect(result.content).toContain('Roadmap (narrative)');
    expect(result.content).toContain('Target State');
    expect(result.content).toContain('Workflow Status');
    expect(result.content).toContain('**Stage:** delivery');
    expect(result.content).toContain('**Phase:** implement');
    expect(result.sections.length).toBeGreaterThanOrEqual(4);
  });

  it('skips missing files gracefully', async () => {
    const fs = new InMemoryContextFs({
      'knowledge/idea.md': '## Summary\n\nJust the idea.',
    });

    const result = await buildBrief(fs, counter, clock, '');

    expect(result.content).toContain('Idea');
    expect(result.content).not.toContain('Roadmap (narrative)');
    expect(result.sections.length).toBe(1);
  });

  it('includes token estimate', async () => {
    const fs = new InMemoryContextFs({
      'knowledge/idea.md': '## Summary\n\nIdea content.',
    });

    const result = await buildBrief(fs, counter, clock, '');

    expect(result.tokenEstimate).toBeGreaterThan(0);
    expect(result.tokenEstimate).toBe(counter.count(result.content));
  });

  it('state snapshot is compact', async () => {
    const fs = new InMemoryContextFs({
      '.l1dder/state.yml': validStateYaml(),
    });

    const result = await buildBrief(fs, counter, clock, '');
    const stateSection = result.sections.find((s) => s.title === 'Workflow Status');

    expect(stateSection).toBeDefined();
    expect(stateSection?.content.split('\n').length).toBeLessThanOrEqual(6);
  });

  it('fails closed on schema-invalid state and never emits a misleading brief (DF-027)', async () => {
    const fs = new InMemoryContextFs({
      'knowledge/idea.md': '## Summary\n\nShould not appear in a successful brief.',
      '.l1dder/state.yml': [
        'schema_version: 1',
        'project:',
        '  name: broken',
        '  stage: delivery',
        '  stage_history: []',
        '  created_at: "2026-05-11T00:00:00Z"',
        '  updated_at: "2026-05-11T00:00:00Z"',
        'workflow:',
        '  current_phase: totally_invalid_phase',
        '  current_status: in_progress',
        '  mode: main',
        '  iteration: 0',
        '  phase_history: []',
        '  gate_history: []',
        'tasks:',
        '  items: []',
        'quick_tasks: []',
        'knowledge_updates: []',
        'decisions: []',
        'skillRuns: []',
        'skillVersions: []',
      ].join('\n'),
    });

    await expect(buildBrief(fs, counter, clock, '')).rejects.toBeInstanceOf(
      SchemaValidationError,
    );

    try {
      await buildBrief(fs, counter, clock, '');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      if (error instanceof SchemaValidationError) {
        expect(error.message).toContain('workflow.current_phase');
      }
    }
  });

  it('brief is phase-independent', async () => {
    const fs = new InMemoryContextFs({
      'knowledge/idea.md': '## Summary\n\nIdea.',
      'knowledge/roadmap.md': '## Summary\n\nRoadmap.',
    });

    const result = await buildBrief(fs, counter, clock, '');

    expect(result.sections.some((s) => s.title === 'Idea')).toBe(true);
    expect(result.sections.some((s) => s.title === 'Roadmap (narrative)')).toBe(
      true,
    );
  });

  it('handles project root path correctly', async () => {
    const fs = new InMemoryContextFs({
      'my-project/knowledge/idea.md': '## Summary\n\nIdea with root.',
    });

    const result = await buildBrief(fs, counter, clock, 'my-project');

    expect(result.content).toContain('Idea with root.');
  });

  it('given projection delivery and roadmap claiming discovery, brief shows delivery only (DF-025)', async () => {
    const fs = new InMemoryContextFs({
      'knowledge/roadmap.md': [
        '## Summary',
        '',
        'Project stage: discovery',
        'Next: finish PRODUCT milestone.',
        'Roadmap overview for planning.',
      ].join('\n'),
      '.l1dder/state.yml': validStateYaml({
        project: {
          name: 'test',
          stage: 'discovery',
          stage_history: [],
          created_at: '2026-05-11T00:00:00Z',
          updated_at: '2026-05-11T00:00:00Z',
        },
      }),
    });

    const result = await buildBrief(fs, counter, clock, '', {
      projection: {
        stage: 'delivery',
        phase: 'implement',
        phase_status: 'in_progress',
        profile: 'delivery',
        session: 'HARD-7',
        milestone: null,
        gate: null,
        primary_action: {
          kind: 'transition_phase',
          command: 'l1dder transition --to update_asis',
          reason: 'All tasks done',
        },
      },
    });

    expect(result.content).toContain('**Stage:** delivery');
    expect(result.content).toContain('**Primary Action:**');
    expect(result.content).toContain('l1dder transition --to update_asis');
    expect(result.content).not.toMatch(/Project stage:\s*discovery/i);
    expect(result.content).not.toContain('**Stage:** discovery');
    const roadmap = result.sections.find((s) => s.title === 'Roadmap (narrative)');
    expect(roadmap?.content).toContain('Narrative excerpt');
    expect(roadmap?.content).toContain('Roadmap overview for planning');
  });

  it('given no projection, brief stays valid and does not treat roadmap stage as fact (DF-025)', async () => {
    const fs = new InMemoryContextFs({
      'knowledge/idea.md': '## Summary\n\nIdea.',
      'knowledge/roadmap.md': [
        '## Summary',
        '',
        'Project stage: discovery',
        'Planning narrative remains.',
      ].join('\n'),
    });

    const result = await buildBrief(fs, counter, clock, '');

    expect(result.content).toContain('Idea');
    expect(result.content).toContain('Roadmap (narrative)');
    expect(result.content).toContain('Planning narrative remains');
    expect(result.content).not.toMatch(/Project stage:\s*discovery/i);
    expect(result.sections.some((s) => s.title === 'Workflow Status')).toBe(
      false,
    );
  });

  it('keeps roadmap prose that merely mentions a stage without claiming status', async () => {
    const fs = new InMemoryContextFs({
      'knowledge/roadmap.md': [
        '## Summary',
        '',
        'Stage 2 of the rollout covers the public mirror.',
        'Phases of delivery are planned per iteration.',
      ].join('\n'),
    });

    const result = await buildBrief(fs, counter, clock, '');

    expect(result.content).toContain('Stage 2 of the rollout');
    expect(result.content).toContain('Phases of delivery are planned');
  });
});
