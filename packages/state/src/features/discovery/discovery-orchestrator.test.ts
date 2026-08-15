import { describe, expect, it } from 'vitest';
import { DISCOVERY_MILESTONE_ORDER } from '@l1dder/core';
import { FixedClock } from '@l1dder/core/testing';
import type { DiscoveryMilestone, DiscoveryMilestoneId, State } from '@l1dder/schemas';

import { createTestState } from '../../testing.js';
import { DiscoveryOrchestrator } from './discovery-orchestrator.js';

const NOW = '2026-05-11T12:00:00Z';
const ACTOR = { kind: 'human' as const, id: 'dev' };

function createOrchestrator(now = NOW): DiscoveryOrchestrator {
  return new DiscoveryOrchestrator(new FixedClock(now));
}

function initialized(orch: DiscoveryOrchestrator): State {
  const result = orch.initialize(createTestState());
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error('initialize failed');
  }
  return result.value;
}

/** Close every milestone before `id` so `id` may leave pending. */
function closeBefore(
  orch: DiscoveryOrchestrator,
  state: State,
  id: DiscoveryMilestoneId,
): State {
  let current = state;
  for (const mid of DISCOVERY_MILESTONE_ORDER) {
    if (mid === id) break;
    const m = current.discovery.milestones.find((x) => x.id === mid);
    if (!m || m.status === 'complete' || m.status === 'not_applicable') {
      continue;
    }
    // Force-close via waive for test setup speed.
    const waived = orch.waive(current, mid, {
      reason: `test close ${mid}`,
      actor: ACTOR,
    });
    expect(waived.ok).toBe(true);
    if (!waived.ok) {
      throw new Error(`failed to close ${mid}`);
    }
    current = waived.value;
  }
  return current;
}

function setMilestone(
  state: State,
  id: DiscoveryMilestoneId,
  patch: Partial<DiscoveryMilestone>,
): State {
  return {
    ...state,
    discovery: {
      ...state.discovery,
      milestones: state.discovery.milestones.map((m) =>
        m.id === id ? { ...m, ...patch } : m,
      ),
    },
  };
}

describe('DiscoveryOrchestrator', () => {
  describe('initialize / list', () => {
    it('list returns 7 rows in canonical order for an uninitialized project', () => {
      const orch = createOrchestrator();
      const state = createTestState();
      const rows = orch.list(state);

      expect(rows).toHaveLength(7);
      expect(rows.map((r) => r.id)).toEqual([...DISCOVERY_MILESTONE_ORDER]);
      expect(rows.every((r) => r.status === 'pending')).toBe(true);
    });

    it('initialize is idempotent and does not wipe existing progress', () => {
      const orch = createOrchestrator();
      let state = initialized(orch);

      const started = orch.startBrainstorm(state, 'idea');
      expect(started.ok).toBe(true);
      if (!started.ok) return;
      state = started.value;

      const again = orch.initialize(state);
      expect(again.ok).toBe(true);
      if (!again.ok) return;

      expect(again.value).toBe(state);
      const idea = again.value.discovery.milestones.find((m) => m.id === 'idea');
      expect(idea?.status).toBe('brainstorming');
    });
  });

  describe('order and lifecycle', () => {
    it('rejects starting architecture while product is pending', () => {
      const orch = createOrchestrator();
      const state = initialized(orch);
      const before = structuredClone(state);

      const result = orch.startBrainstorm(state, 'architecture');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('MILESTONE_ORDER');
      }
      expect(state).toEqual(before);
    });

    it('allows starting data when integrations is not_applicable with rationale', () => {
      const orch = createOrchestrator();
      let state = initialized(orch);
      state = closeBefore(orch, state, 'integrations');

      const na = orch.markNotApplicable(
        state,
        'integrations',
        'No external systems in MVP',
      );
      expect(na.ok).toBe(true);
      if (!na.ok) return;
      state = na.value;

      const startData = orch.startBrainstorm(state, 'data');
      expect(startData.ok).toBe(true);
      if (startData.ok) {
        const data = startData.value.discovery.milestones.find(
          (m) => m.id === 'data',
        );
        expect(data?.status).toBe('brainstorming');
      }
    });

    it('given a completed architecture that is reopened, ready becomes incomplete', () => {
      const orch = createOrchestrator();
      let state = initialized(orch);
      // Close IDEA→STANDARDS so architecture is complete and READY can be marked complete.
      state = closeBefore(orch, state, 'ready');
      state = setMilestone(state, 'ready', {
        status: 'complete',
        evidence: ['knowledge/roadmap.md'],
        completed_at: NOW,
      });
      state = {
        ...state,
        discovery: { ...state.discovery, current: null },
      };

      expect(
        state.discovery.milestones.find((m) => m.id === 'architecture')?.status,
      ).toBe('complete');

      const reopened = orch.reopen(state, 'architecture', 'Need to revise NFR');
      expect(reopened.ok).toBe(true);
      if (!reopened.ok) return;

      const ready = reopened.value.discovery.milestones.find(
        (m) => m.id === 'ready',
      );
      expect(ready?.status).toBe('pending');
      expect(ready?.evidence).toEqual([]);
      expect(ready?.completed_at).toBeUndefined();
      expect(reopened.value.discovery.current).toBe('architecture');
      expect(
        reopened.value.decisions.some((d) => d.rationale.includes('revise NFR')),
      ).toBe(true);
    });

    it('rejects plan without summary or without sessions', () => {
      const orch = createOrchestrator();
      let state = initialized(orch);

      const brainstorm = orch.startBrainstorm(state, 'idea');
      expect(brainstorm.ok).toBe(true);
      if (!brainstorm.ok) return;
      state = brainstorm.value;

      const noSummary = orch.plan(state, 'idea', {
        summary: '   ',
        sessions: ['AS-1'],
      });
      expect(noSummary.ok).toBe(false);
      if (!noSummary.ok) {
        expect(noSummary.error.code).toBe('MILESTONE_PLAN_INCOMPLETE');
      }

      const noSessions = orch.plan(state, 'idea', {
        summary: 'MVP boundary',
        sessions: [],
      });
      expect(noSessions.ok).toBe(false);
      if (!noSessions.ok) {
        expect(noSessions.error.code).toBe('MILESTONE_PLAN_INCOMPLETE');
      }
    });

    it('rejects complete without evidence; waive with reason succeeds and appends a waiver', () => {
      const orch = createOrchestrator();
      let state = initialized(orch);

      // Drive idea to in_progress without evidence.
      let step = orch.startBrainstorm(state, 'idea');
      expect(step.ok).toBe(true);
      if (!step.ok) return;
      state = step.value;

      step = orch.plan(state, 'idea', {
        summary: 'Problem and audience',
        sessions: ['AS-1'],
      });
      expect(step.ok).toBe(true);
      if (!step.ok) return;
      state = step.value;

      step = orch.startWork(state, 'idea');
      expect(step.ok).toBe(true);
      if (!step.ok) return;
      state = step.value;

      const noEvidence = orch.complete(state, 'idea', []);
      expect(noEvidence.ok).toBe(false);
      if (!noEvidence.ok) {
        expect(noEvidence.error.code).toBe('MILESTONE_EVIDENCE_REQUIRED');
      }

      const waived = orch.waive(state, 'idea', {
        reason: 'Bootstrap exception',
        actor: ACTOR,
        decisionId: 'DEC-1',
      });
      expect(waived.ok).toBe(true);
      if (!waived.ok) return;

      const idea = waived.value.discovery.milestones.find((m) => m.id === 'idea');
      expect(idea?.status).toBe('complete');
      expect(idea?.evidence).toEqual([]);
      expect(waived.value.discovery.waivers).toHaveLength(1);
      expect(waived.value.discovery.waivers[0]?.reason).toBe('Bootstrap exception');
      expect(waived.value.discovery.waivers[0]?.decision_id).toBe('DEC-1');
    });

    it('rejects markNotApplicable on a non-conditional milestone', () => {
      const orch = createOrchestrator();
      const state = initialized(orch);

      const result = orch.markNotApplicable(state, 'product', 'not needed');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('MILESTONE_NOT_CONDITIONAL');
      }
    });
  });
});
