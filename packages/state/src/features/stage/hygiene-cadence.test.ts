import { describe, expect, it } from 'vitest';
import type { PhaseHistoryEntry } from '@l1dder/schemas';

import { evaluateHygieneCadence } from './hygiene-cadence.js';

const NOW = '2026-07-05T12:00:00.000Z';

function hygieneEntry(overrides: Partial<PhaseHistoryEntry> = {}): PhaseHistoryEntry {
  return {
    phase: 'hygiene',
    status: 'completed',
    started_at: '2026-06-01T00:00:00.000Z',
    completed_at: '2026-06-01T01:00:00.000Z',
    actor: { kind: 'ai', model: 'test-model' },
    trigger: { kind: 'cli', command: 'transition' },
    ...overrides,
  };
}

describe('evaluateHygieneCadence', () => {
  it('is overdue when no hygiene session has ever run', () => {
    const result = evaluateHygieneCadence([], 30, NOW);
    expect(result.overdue).toBe(true);
    expect(result.daysSinceLastHygiene).toBeNull();
  });

  it('is not overdue when the last hygiene session is within the cadence window', () => {
    const history = [hygieneEntry({ completed_at: '2026-06-20T00:00:00.000Z' })];
    const result = evaluateHygieneCadence(history, 30, NOW);
    expect(result.overdue).toBe(false);
    expect(result.daysSinceLastHygiene).toBe(15);
  });

  it('is overdue when the last hygiene session predates the cadence window', () => {
    const history = [hygieneEntry({ completed_at: '2026-05-01T00:00:00.000Z' })];
    const result = evaluateHygieneCadence(history, 30, NOW);
    expect(result.overdue).toBe(true);
    expect(result.daysSinceLastHygiene).toBeGreaterThanOrEqual(30);
  });

  it('uses started_at when completed_at is absent (in-progress entry)', () => {
    const history = [
      hygieneEntry({ started_at: '2026-06-20T00:00:00.000Z', completed_at: undefined }),
    ];
    const result = evaluateHygieneCadence(history, 30, NOW);
    expect(result.daysSinceLastHygiene).toBe(15);
  });

  it('picks the most recent hygiene entry when multiple exist', () => {
    const history = [
      hygieneEntry({ completed_at: '2026-01-01T00:00:00.000Z' }),
      hygieneEntry({ completed_at: '2026-07-01T00:00:00.000Z' }),
    ];
    const result = evaluateHygieneCadence(history, 30, NOW);
    expect(result.daysSinceLastHygiene).toBe(4);
    expect(result.overdue).toBe(false);
  });

  it('ignores non-hygiene phase history entries', () => {
    const history: PhaseHistoryEntry[] = [
      {
        phase: 'complete',
        status: 'completed',
        started_at: '2026-07-01T00:00:00.000Z',
        completed_at: '2026-07-04T00:00:00.000Z',
        actor: { kind: 'ai', model: 'test-model' },
        trigger: { kind: 'cli', command: 'transition' },
      },
    ];
    const result = evaluateHygieneCadence(history, 30, NOW);
    expect(result.overdue).toBe(true);
    expect(result.daysSinceLastHygiene).toBeNull();
  });

  it('disables the advisory when cadenceDays is 0', () => {
    const result = evaluateHygieneCadence([], 0, NOW);
    expect(result.overdue).toBe(false);
    expect(result.daysSinceLastHygiene).toBeNull();
  });
});
