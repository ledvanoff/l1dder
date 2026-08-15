import { describe, expect, it } from 'vitest';
import { DISCOVERY_MILESTONE_ORDER } from '@l1dder/core';

import { recommend } from './readiness-recommender.js';
import type { DeliveryCriteriaResult } from './delivery-criteria.js';

function makeCriterion(
  id: string,
  order: number,
  label: string,
  met: boolean,
  detail?: string,
) {
  return { id, order, label, met, detail: detail ?? (met ? 'ok' : 'missing') };
}

const ALL_MET: DeliveryCriteriaResult = DISCOVERY_MILESTONE_ORDER.map((id, i) =>
  makeCriterion(id, i + 1, id, true),
);

const ONLY_IDEA_MET: DeliveryCriteriaResult = DISCOVERY_MILESTONE_ORDER.map(
  (id, i) => makeCriterion(id, i + 1, id, id === 'idea'),
);

describe('recommend', () => {
  it('returns ready when all 7 milestones are met', () => {
    const rec = recommend(ALL_MET);
    expect(rec.ready).toBe(true);
    expect(rec.score).toBe('7/7');
    expect(rec.gaps).toHaveLength(0);
    expect(rec.nextMilestone).toBeUndefined();
  });

  it('ignores legacy roadmap criterion ids', () => {
    const withRoadmap: DeliveryCriteriaResult = [
      ...ALL_MET,
      makeCriterion('roadmap', 99, 'Roadmap', false),
    ];
    const rec = recommend(withRoadmap);
    expect(rec.milestones.map((m) => m.id)).toEqual([...DISCOVERY_MILESTONE_ORDER]);
    expect(rec.milestones.some((m) => m.id === 'roadmap')).toBe(false);
    expect(rec.ready).toBe(true);
  });

  it('points nextMilestone at the first unmet id', () => {
    const rec = recommend(ONLY_IDEA_MET);
    expect(rec.nextMilestone).toBe('product');
    expect(rec.score).toBe('1/7');
    expect(rec.ready).toBe(false);
  });

  it('never treats roadmap as a readiness milestone', () => {
    const onlyLegacy: DeliveryCriteriaResult = [
      makeCriterion('roadmap', 1, 'Roadmap', true),
      makeCriterion('usecases', 2, 'Use cases', true),
      makeCriterion('data_model', 3, 'Data model', true),
    ];
    const rec = recommend(onlyLegacy);
    expect(rec.milestones).toHaveLength(0);
    expect(rec.ready).toBe(false);
  });
});
