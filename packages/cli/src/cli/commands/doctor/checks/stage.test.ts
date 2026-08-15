import { describe, expect, it } from 'vitest';
import { DISCOVERY_MILESTONE_ORDER } from '@l1dder/core';
import { InMemoryFileSystem } from '@l1dder/core/testing';
import { createTestConfig, createTestState } from '@l1dder/state/testing';
import { checkStage } from './stage.js';

const NOW = '2026-07-05T12:00:00.000Z';
const ACTOR = { kind: 'human' as const, id: 'tester' };

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

describe('checkStage — forced stage waiver', () => {
  it('passes when no DEC-STAGE-FORCE Decision exists', async () => {
    const fs = new InMemoryFileSystem();
    const state = createTestState({ project: { stage: 'delivery' } });
    const config = createTestConfig();

    const checks = await checkStage(state, config, fs, '/project');

    const waiver = checks.find((c) => c.id === 'stage-forced-waiver');
    expect(waiver?.level).toBe('pass');
    expect(waiver?.message).toContain('No forced stage waivers');
  });

  it('warns with reason and date when a forced stage Decision is present', async () => {
    const fs = new InMemoryFileSystem();
    const state = createTestState({
      project: { stage: 'delivery' },
      decisions: [
        {
          id: 'DEC-STAGE-FORCE-2026-07-05T12:00:00.000Z',
          title: 'Forced stage advance discovery → delivery',
          rationale: 'Demo deployment',
          alternatives: ['Wait until discovery checklist is READY'],
          status: 'accepted',
          timestamp: '2026-07-05T12:00:00.000Z',
        },
      ],
    });
    const config = createTestConfig();

    const checks = await checkStage(state, config, fs, '/project');

    const waiver = checks.find((c) => c.id === 'stage-forced-waiver');
    expect(waiver?.level).toBe('warn');
    expect(waiver?.message).toContain('Demo deployment');
    expect(waiver?.message).toContain('2026-07-05T12:00:00.000Z');
    expect(waiver?.hint).toBe('Demo deployment');
  });
});

describe('checkStage — discovery checklist from projection', () => {
  it('reports warn plus per-milestone checks for the ordered 7 ids (no roadmap)', async () => {
    const fs = new InMemoryFileSystem();
    const state = createTestState({ project: { stage: 'discovery' } });
    const config = createTestConfig();

    const checks = await checkStage(state, config, fs, '/project');

    const overall = checks.find((c) => c.id === 'stage-dc-readiness');
    expect(overall?.level).toBe('warn');
    expect(overall?.message).toContain('NOT READY');

    for (const id of DISCOVERY_MILESTONE_ORDER) {
      expect(checks.some((c) => c.id === `stage-dc-${id}`)).toBe(true);
    }
    expect(checks.some((c) => c.id === 'stage-dc-roadmap')).toBe(false);
  });

  it('reports READY when every milestone is closed in state', async () => {
    const fs = new InMemoryFileSystem();
    const { DiscoveryOrchestrator } = await import('@l1dder/state');
    const { FixedClock } = await import('@l1dder/core/testing');
    const orch = new DiscoveryOrchestrator(new FixedClock(NOW));
    const state = orch.initialize(
      createTestState({ project: { stage: 'discovery' } }),
    );
    expect(state.ok).toBe(true);
    if (!state.ok) return;
    let current = state.value;
    for (const id of DISCOVERY_MILESTONE_ORDER) {
      const waived = orch.waive(current, id, {
        reason: `close ${id}`,
        actor: ACTOR,
      });
      expect(waived.ok).toBe(true);
      if (!waived.ok) return;
      current = waived.value;
    }

    const config = createTestConfig();
    const checks = await checkStage(current, config, fs, '/project');

    const overall = checks.find((c) => c.id === 'stage-dc-readiness');
    expect(overall?.level).toBe('pass');
    expect(overall?.message).toContain('READY');

    const milestoneChecks = checks.filter(
      (c) => c.id.startsWith('stage-dc-') && c.id !== 'stage-dc-readiness',
    );
    expect(milestoneChecks).toHaveLength(7);
    expect(milestoneChecks.every((c) => c.level === 'pass')).toBe(true);
  });

  it('does not evaluate discovery checklist outside the discovery stage', async () => {
    const fs = new InMemoryFileSystem();
    const state = createTestState({ project: { stage: 'delivery' } });
    const config = createTestConfig();

    const checks = await checkStage(state, config, fs, '/project');

    expect(checks.some((c) => c.id.startsWith('stage-dc-'))).toBe(false);
  });
});
