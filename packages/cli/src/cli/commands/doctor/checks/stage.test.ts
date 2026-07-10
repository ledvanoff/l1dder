import { describe, expect, it } from 'vitest';
import { InMemoryFileSystem } from '@l1dder/core/testing';
import { createTestConfig, createTestState } from '@l1dder/state/testing';

import { checkStage } from './stage.js';

const NOW = '2026-07-05T12:00:00.000Z';

describe('checkStage — maintenance Hygiene cadence advisory (DEC-6-5)', () => {
  it('does not evaluate cadence outside the maintenance stage', async () => {
    const fs = new InMemoryFileSystem();
    const state = createTestState({ project: { stage: 'discovery' } });
    const config = createTestConfig();

    const checks = await checkStage(state, config, fs, '/project', NOW);

    expect(checks.some((c) => c.id === 'stage-hygiene-cadence')).toBe(false);
  });

  it('flags overdue advisory (info) when no hygiene session has ever run in maintenance', async () => {
    const fs = new InMemoryFileSystem();
    const state = createTestState({ project: { stage: 'maintenance' } });
    const config = createTestConfig();

    const checks = await checkStage(state, config, fs, '/project', NOW);

    const cadenceCheck = checks.find((c) => c.id === 'stage-hygiene-cadence');
    expect(cadenceCheck?.level).toBe('info');
    expect(cadenceCheck?.message).toContain('No Hygiene session on record');
  });

  it('passes when the last hygiene session is within the cadence window', async () => {
    const fs = new InMemoryFileSystem();
    const state = createTestState({
      project: { stage: 'maintenance' },
      workflow: {
        phase_history: [
          {
            phase: 'hygiene',
            status: 'completed',
            started_at: '2026-06-25T00:00:00.000Z',
            completed_at: '2026-06-25T01:00:00.000Z',
            actor: { kind: 'ai', model: 'test-model' },
            trigger: { kind: 'cli', command: 'transition' },
          },
        ],
      },
    });
    const config = createTestConfig();

    const checks = await checkStage(state, config, fs, '/project', NOW);

    const cadenceCheck = checks.find((c) => c.id === 'stage-hygiene-cadence');
    expect(cadenceCheck?.level).toBe('pass');
  });

  it('flags overdue advisory when the last hygiene session predates the cadence window', async () => {
    const fs = new InMemoryFileSystem();
    const state = createTestState({
      project: { stage: 'maintenance' },
      workflow: {
        phase_history: [
          {
            phase: 'hygiene',
            status: 'completed',
            started_at: '2026-01-01T00:00:00.000Z',
            completed_at: '2026-01-01T01:00:00.000Z',
            actor: { kind: 'ai', model: 'test-model' },
            trigger: { kind: 'cli', command: 'transition' },
          },
        ],
      },
    });
    const config = createTestConfig();

    const checks = await checkStage(state, config, fs, '/project', NOW);

    const cadenceCheck = checks.find((c) => c.id === 'stage-hygiene-cadence');
    expect(cadenceCheck?.level).toBe('info');
    expect(cadenceCheck?.message).toContain('day(s) ago');
  });

  it('disables the advisory when maintenance_cadence_days is 0', async () => {
    const fs = new InMemoryFileSystem();
    const state = createTestState({ project: { stage: 'maintenance' } });
    const config = createTestConfig({ hygiene: { maintenance_cadence_days: 0 } });

    const checks = await checkStage(state, config, fs, '/project', NOW);

    expect(checks.some((c) => c.id === 'stage-hygiene-cadence')).toBe(false);
  });

  it('skips cadence evaluation when `now` is not provided (back-compat)', async () => {
    const fs = new InMemoryFileSystem();
    const state = createTestState({ project: { stage: 'maintenance' } });
    const config = createTestConfig();

    const checks = await checkStage(state, config, fs, '/project');

    expect(checks.some((c) => c.id === 'stage-hygiene-cadence')).toBe(false);
  });
});

describe('checkStage — semantic DC1-DC4 readiness (discovery stage only)', () => {
  it('reports an overall warn plus a per-milestone check for each missing discovery artifact', async () => {
    const fs = new InMemoryFileSystem();
    const state = createTestState({ project: { stage: 'discovery' } });
    const config = createTestConfig();

    const checks = await checkStage(state, config, fs, '/project');

    const overall = checks.find((c) => c.id === 'stage-dc-readiness');
    expect(overall?.level).toBe('warn');
    expect(overall?.message).toContain('NOT READY');

    const ideaMilestone = checks.find((c) => c.id === 'stage-dc-idea');
    expect(ideaMilestone?.level).toBe('warn');
    expect(ideaMilestone?.message).toContain('not ready');
  });

  it('reports an overall pass with no warn milestones once every discovery artifact is authored', async () => {
    const fs = new InMemoryFileSystem();
    const state = createTestState({ project: { stage: 'discovery' } });
    const config = createTestConfig();

    const longSummary = 'Real content describing the project in depth. '.repeat(10);
    await fs.writeFile('/project/knowledge/idea.md', `## Summary\n\n${longSummary}`);
    await fs.writeFile('/project/knowledge/roadmap.md', `## Summary\n\n${longSummary}`);
    await fs.writeFile(
      '/project/knowledge/to-be/architecture.md',
      `## Summary\n\n${longSummary}\n\n## Details\n\nArchitecture details.`,
    );
    await fs.writeFile('/project/knowledge/to-be/erd.md', '## Summary\n\nerDiagram\n  A ||--o{ B : has\n');
    await fs.writeFile('/project/knowledge/to-be/usecases.md', `## Summary\n\n${longSummary}`);
    await fs.writeFile('/project/design/component.md', '# Component design\n');

    const checks = await checkStage(state, config, fs, '/project');

    const overall = checks.find((c) => c.id === 'stage-dc-readiness');
    expect(overall?.level).toBe('pass');
    expect(overall?.message).toContain('READY');

    const milestoneChecks = checks.filter((c) => c.id.startsWith('stage-dc-') && c.id !== 'stage-dc-readiness');
    expect(milestoneChecks.length).toBeGreaterThan(0);
    expect(milestoneChecks.every((c) => c.level === 'pass')).toBe(true);
  });

  it('does not evaluate DC1-DC4 outside the discovery stage', async () => {
    const fs = new InMemoryFileSystem();
    const state = createTestState({ project: { stage: 'delivery' } });
    const config = createTestConfig();

    const checks = await checkStage(state, config, fs, '/project');

    expect(checks.some((c) => c.id.startsWith('stage-dc-'))).toBe(false);
  });
});
