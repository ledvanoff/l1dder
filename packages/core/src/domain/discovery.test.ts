import { describe, expect, it } from 'vitest';

import {
  CONDITIONAL_MILESTONES,
  DISCOVERY_MILESTONE_ORDER,
  DiscoveryMilestone,
  isConditionalMilestone,
  milestoneIndex,
  nextMilestoneAfter,
  previousMilestoneOf,
} from './discovery.js';

describe('DISCOVERY_MILESTONE_ORDER', () => {
  it('lists all 7 milestones in IDEA→READY order', () => {
    expect(DISCOVERY_MILESTONE_ORDER).toEqual([
      'idea',
      'product',
      'architecture',
      'integrations',
      'data',
      'standards',
      'ready',
    ]);
  });

  it('matches every DiscoveryMilestone const value exactly once', () => {
    const values = Object.values(DiscoveryMilestone);
    expect(DISCOVERY_MILESTONE_ORDER).toHaveLength(values.length);
    expect(new Set(DISCOVERY_MILESTONE_ORDER).size).toBe(values.length);
    for (const value of values) {
      expect(DISCOVERY_MILESTONE_ORDER).toContain(value);
    }
  });
});

describe('milestoneIndex', () => {
  it('returns 0 for idea and 6 for ready', () => {
    expect(milestoneIndex(DiscoveryMilestone.IDEA)).toBe(0);
    expect(milestoneIndex(DiscoveryMilestone.READY)).toBe(6);
  });
});

describe('nextMilestoneAfter', () => {
  it('returns product after idea', () => {
    expect(nextMilestoneAfter(DiscoveryMilestone.IDEA)).toBe('product');
  });

  it('returns undefined after ready', () => {
    expect(nextMilestoneAfter(DiscoveryMilestone.READY)).toBeUndefined();
  });
});

describe('previousMilestoneOf', () => {
  it('returns standards before ready', () => {
    expect(previousMilestoneOf(DiscoveryMilestone.READY)).toBe('standards');
  });

  it('returns undefined before idea', () => {
    expect(previousMilestoneOf(DiscoveryMilestone.IDEA)).toBeUndefined();
  });
});

describe('isConditionalMilestone', () => {
  it('returns true only for integrations and standards', () => {
    expect(CONDITIONAL_MILESTONES).toEqual(['integrations', 'standards']);
    expect(isConditionalMilestone(DiscoveryMilestone.INTEGRATIONS)).toBe(true);
    expect(isConditionalMilestone(DiscoveryMilestone.STANDARDS)).toBe(true);
    expect(isConditionalMilestone(DiscoveryMilestone.IDEA)).toBe(false);
    expect(isConditionalMilestone(DiscoveryMilestone.ARCHITECTURE)).toBe(false);
    expect(isConditionalMilestone(DiscoveryMilestone.READY)).toBe(false);
  });
});
