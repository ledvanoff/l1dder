import { describe, expect, it } from 'vitest';

import {
  DiscoveryMilestoneIdSchema,
  DiscoveryMilestoneSchema,
  DiscoveryMilestoneStatusSchema,
  DiscoverySchema,
  DiscoveryWaiverSchema,
} from './discovery.js';
import { CURRENT_SCHEMA_VERSION, StateSchema } from './state.js';

const NOW = '2026-01-15T10:00:00Z';
const humanActor = { kind: 'human' as const, id: 'user@example.com' };

describe('DiscoveryMilestoneIdSchema', () => {
  it('accepts all 7 milestone ids', () => {
    for (const id of [
      'idea',
      'product',
      'architecture',
      'integrations',
      'data',
      'standards',
      'ready',
    ]) {
      expect(DiscoveryMilestoneIdSchema.parse(id)).toBe(id);
    }
  });

  it('rejects unknown milestone id', () => {
    expect(() => DiscoveryMilestoneIdSchema.parse('roadmap')).toThrow();
  });
});

describe('DiscoveryMilestoneStatusSchema', () => {
  it('rejects unknown status', () => {
    expect(() => DiscoveryMilestoneStatusSchema.parse('done')).toThrow();
  });
});

describe('DiscoveryMilestoneSchema', () => {
  it('defaults planned_sessions and evidence to empty arrays', () => {
    const result = DiscoveryMilestoneSchema.parse({
      id: 'idea',
      status: 'pending',
      required: true,
    });
    expect(result.planned_sessions).toEqual([]);
    expect(result.evidence).toEqual([]);
    expect(result.brainstorm_summary).toBeUndefined();
  });

  it('rejects empty brainstorm_summary', () => {
    expect(() =>
      DiscoveryMilestoneSchema.parse({
        id: 'idea',
        status: 'brainstorming',
        required: true,
        brainstorm_summary: '',
      }),
    ).toThrow();
  });

  it('rejects unknown id', () => {
    expect(() =>
      DiscoveryMilestoneSchema.parse({
        id: 'unknown',
        status: 'pending',
        required: true,
      }),
    ).toThrow();
  });

  it('rejects unknown status', () => {
    expect(() =>
      DiscoveryMilestoneSchema.parse({
        id: 'idea',
        status: 'finished',
        required: true,
      }),
    ).toThrow();
  });
});

describe('DiscoverySchema', () => {
  it('defaults milestones, current, and waivers when given empty object', () => {
    const result = DiscoverySchema.parse({});
    expect(result.milestones).toEqual([]);
    expect(result.current).toBeNull();
    expect(result.waivers).toEqual([]);
  });
});

describe('DiscoveryWaiverSchema', () => {
  it('parses a waiver with actor and timestamp', () => {
    const result = DiscoveryWaiverSchema.parse({
      milestone: 'integrations',
      reason: 'CLI tool with no external systems',
      actor: humanActor,
      timestamp: NOW,
    });
    expect(result.milestone).toBe('integrations');
    expect(result.actor.kind).toBe('human');
  });
});

describe('StateSchema discovery / profile backward compatibility', () => {
  it('parses a legacy state without discovery or workflow.profile and fills defaults', () => {
    const legacy = {
      project: {
        name: 'legacy',
        created_at: NOW,
        updated_at: NOW,
      },
    };
    const result = StateSchema.parse(legacy);
    expect(result.schema_version).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.discovery).toEqual({
      milestones: [],
      current: null,
      waivers: [],
    });
    expect(result.workflow.profile).toBeNull();
  });
});
