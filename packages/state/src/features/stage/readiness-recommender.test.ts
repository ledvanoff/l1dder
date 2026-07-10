import { describe, expect, it } from 'vitest';

import { recommend } from './readiness-recommender.js';
import type { DeliveryCriteriaResult } from './delivery-criteria.js';

function makeCriterion(id: string, order: number, label: string, met: boolean, detail?: string) {
  return { id, order, label, met, detail: detail ?? (met ? 'ok' : 'missing') };
}

const ALL_MET: DeliveryCriteriaResult = [
  makeCriterion('idea', 1, 'Idea', true),
  makeCriterion('roadmap', 2, 'Roadmap', true),
  makeCriterion('architecture', 3, 'Architecture', true),
  makeCriterion('data_model', 4, 'Data model', true),
  makeCriterion('usecases', 5, 'Use cases', true),
  makeCriterion('design', 6, 'Design specs', true),
  makeCriterion('no_skeleton_markers', 7, 'No skeleton markers', true),
];

const ONLY_IDEA_MET: DeliveryCriteriaResult = [
  makeCriterion('idea', 1, 'Idea', true),
  makeCriterion('roadmap', 2, 'Roadmap', false),
  makeCriterion('architecture', 3, 'Architecture', false),
  makeCriterion('data_model', 4, 'Data model', false),
  makeCriterion('usecases', 5, 'Use cases', false),
];

const FIRST_THREE_MET: DeliveryCriteriaResult = [
  makeCriterion('idea', 1, 'Idea', true),
  makeCriterion('roadmap', 2, 'Roadmap', true),
  makeCriterion('architecture', 3, 'Architecture', true),
  makeCriterion('data_model', 4, 'Data model', false),
  makeCriterion('usecases', 5, 'Use cases', false),
];

describe('recommend', () => {
  describe('all milestones met', () => {
    it('returns ready === true', () => {
      expect(recommend(ALL_MET).ready).toBe(true);
    });

    it('returns empty gaps', () => {
      expect(recommend(ALL_MET).gaps).toHaveLength(0);
    });

    it('returns nextMilestone undefined', () => {
      expect(recommend(ALL_MET).nextMilestone).toBeUndefined();
    });

    it('returns advisory message about delivery readiness', () => {
      const { message } = recommend(ALL_MET);
      expect(message).toMatch(/ready.*delivery/i);
    });

    it('returns score "5/5" (only milestone criteria counted)', () => {
      expect(recommend(ALL_MET).score).toBe('5/5');
    });
  });

  describe('idea/roadmap met, architecture is next', () => {
    it('returns nextMilestone === architecture', () => {
      expect(recommend(FIRST_THREE_MET).nextMilestone).toBe('data_model');
    });

    it('returns score "3/5"', () => {
      expect(recommend(FIRST_THREE_MET).score).toBe('3/5');
    });

    it('gaps contains missing milestones', () => {
      const { gaps } = recommend(FIRST_THREE_MET);
      expect(gaps).toContain('Data model');
      expect(gaps).toContain('Use cases');
      expect(gaps).not.toContain('Idea');
    });
  });

  describe('only idea met, roadmap is next', () => {
    it('returns nextMilestone === roadmap', () => {
      expect(recommend(ONLY_IDEA_MET).nextMilestone).toBe('roadmap');
    });

    it('message advises working on roadmap + plan-roadmap skill', () => {
      const { message } = recommend(ONLY_IDEA_MET);
      expect(message).toMatch(/roadmap/i);
      expect(message).toMatch(/plan-roadmap/i);
    });

    it('returns ready === false', () => {
      expect(recommend(ONLY_IDEA_MET).ready).toBe(false);
    });
  });

  describe('milestone ordering', () => {
    it('milestones are always in canonical order (idea→usecases)', () => {
      const { milestones } = recommend(ONLY_IDEA_MET);
      const ids = milestones.map((m) => m.id);
      expect(ids).toEqual(['idea', 'roadmap', 'architecture', 'data_model', 'usecases']);
    });
  });

  describe('M2 — conditional milestones (disabled flags)', () => {
    it('omits erd when data_model criterion is absent from result', () => {
      const withoutErd: DeliveryCriteriaResult = [
        makeCriterion('idea', 1, 'Idea', true),
        makeCriterion('roadmap', 2, 'Roadmap', true),
        makeCriterion('architecture', 3, 'Architecture', true),
        makeCriterion('usecases', 5, 'Use cases', true),
      ];

      const { milestones, gaps, score } = recommend(withoutErd);

      const ids = milestones.map((m) => m.id);
      expect(ids).not.toContain('data_model');
      expect(gaps).toHaveLength(0);
      expect(score).toBe('4/4');
    });

    it('does not count disabled erd as a gap', () => {
      const withoutErd: DeliveryCriteriaResult = [
        makeCriterion('idea', 1, 'Idea', true),
        makeCriterion('roadmap', 2, 'Roadmap', false),
        makeCriterion('architecture', 3, 'Architecture', false),
        makeCriterion('usecases', 5, 'Use cases', false),
      ];

      const { gaps } = recommend(withoutErd);
      expect(gaps).not.toContain('data_model');
    });
  });

  describe('milestones detail field', () => {
    it('met milestones have no detail', () => {
      const { milestones } = recommend(ALL_MET);
      milestones.forEach((m) => {
        if (m.met) expect(m.detail).toBeUndefined();
      });
    });

    it('unmet milestones have detail string', () => {
      const { milestones } = recommend(ONLY_IDEA_MET);
      milestones.filter((m) => !m.met).forEach((m) => {
        expect(typeof m.detail).toBe('string');
      });
    });
  });
});
