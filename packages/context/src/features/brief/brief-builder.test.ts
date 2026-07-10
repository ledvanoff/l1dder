import { describe, expect, it } from 'vitest';
import { buildBrief } from './brief-builder.js';
import { MockTokenCounter, InMemoryContextFs, FixedContextClock } from '../../testing.js';

const clock = new FixedContextClock('2026-05-11T12:00:00.000Z');
const counter = new MockTokenCounter(3);

describe('buildBrief', () => {
  it('generates brief with all available sections', async () => {
    const fs = new InMemoryContextFs({
      'knowledge/idea.md': '## Summary\n\nA great project idea.',
      'knowledge/roadmap.md': '## Summary\n\nRoadmap overview here.',
      'knowledge/to-be/architecture.md': '## Summary\n\nTarget architecture.',
      '.l1dder/state.yml': [
        'project:',
        '  stage: delivery',
        'workflow:',
        '  current_phase: implement',
        '  current_status: in_progress',
        '  mode: main',
        '  iteration: 3',
      ].join('\n'),
    });

    const result = await buildBrief(fs, counter, clock, '');

    expect(result.content).toContain('Idea');
    expect(result.content).toContain('Roadmap');
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
    expect(result.content).not.toContain('Roadmap');
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
      '.l1dder/state.yml': [
        'project:',
        '  stage: delivery',
        'workflow:',
        '  current_phase: implement',
        '  current_status: in_progress',
        '  mode: main',
        '  iteration: 3',
      ].join('\n'),
    });

    const result = await buildBrief(fs, counter, clock, '');

    const stateSection = result.sections.find((s) => s.title === 'Workflow Status');
    expect(stateSection).toBeTruthy();
    expect(stateSection?.content).toContain('**Stage:** delivery');
    expect(stateSection?.content).toContain('**Phase:** implement');
  });

  it('brief is phase-independent', async () => {
    const fs = new InMemoryContextFs({
      'knowledge/idea.md': '## Summary\n\nIdea.',
      'knowledge/roadmap.md': '## Summary\n\nRoadmap.',
    });

    const result = await buildBrief(fs, counter, clock, '');

    expect(result.sections.some((s) => s.title === 'Idea')).toBe(true);
    expect(result.sections.some((s) => s.title === 'Roadmap')).toBe(true);
  });

  it('handles project root path correctly', async () => {
    const fs = new InMemoryContextFs({
      'my-project/knowledge/idea.md': '## Summary\n\nIdea with root.',
    });

    const result = await buildBrief(fs, counter, clock, 'my-project');

    expect(result.content).toContain('Idea with root.');
  });
});
