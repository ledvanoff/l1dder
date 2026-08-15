import { describe, expect, it } from 'vitest';

import { BacklogItemSchema, DebtItemSchema } from './debt-backlog.js';

const NOW = '2026-01-15T10:00:00Z';

describe('DebtItemSchema', () => {
  it('defaults status to open and links to empty', () => {
    const result = DebtItemSchema.parse({
      id: 'DEBT-001',
      title: 'Weak delivery criteria',
      severity: 'high',
      source: 'knowledge/roadmap.md#debt-001',
    });

    expect(result.status).toBe('open');
    expect(result.links).toEqual([]);
    expect(result.nomination).toBeUndefined();
  });

  it('rejects ids that are not DEBT-NNN', () => {
    const result = DebtItemSchema.safeParse({
      id: 'DEBT-1',
      title: 'bad id',
      severity: 'low',
      source: 'knowledge/roadmap.md',
    });

    expect(result.success).toBe(false);
  });

  it('keeps an approved nomination', () => {
    const result = DebtItemSchema.parse({
      id: 'DEBT-002',
      title: 'Migrate loader',
      severity: 'medium',
      source: 'knowledge/roadmap.md#debt-002',
      status: 'scheduled',
      nomination: {
        iteration: 'HARD',
        session: 'HARD-4',
        approved_by: 'maintainer',
        approved_at: NOW,
      },
    });

    expect(result.nomination?.session).toBe('HARD-4');
  });
});

describe('BacklogItemSchema', () => {
  it('requires priority and kind', () => {
    const result = BacklogItemSchema.safeParse({
      id: 'BL-001',
      title: 'Autopilot runtime',
      source: 'knowledge/roadmap.md#bl-001',
    });

    expect(result.success).toBe(false);
  });

  it('rejects ids that are not BL-NNN', () => {
    const result = BacklogItemSchema.safeParse({
      id: 'BACKLOG-001',
      title: 'bad id',
      priority: 'low',
      kind: 'feature',
      source: 'knowledge/roadmap.md',
    });

    expect(result.success).toBe(false);
  });

  it('parses a minimal open backlog item', () => {
    const result = BacklogItemSchema.parse({
      id: 'BL-002',
      title: 'LangGraph autopilot',
      priority: 'low',
      kind: 'research',
      source: 'knowledge/roadmap.md#bl-002',
    });

    expect(result.status).toBe('open');
  });
});
