import { describe, expect, it } from 'vitest';
import { DISCOVERY_MILESTONE_ORDER } from '@l1dder/core';
import { FixedClock, NullLogger } from '@l1dder/core/testing';
import type { State } from '@l1dder/schemas';

import { createTestState, createTestConfig } from '../../testing.js';
import { DiscoveryOrchestrator } from '../discovery/discovery-orchestrator.js';
import { StageManager } from './stage-manager.js';

const NOW = '2026-05-11T12:00:00Z';
const ACTOR = { kind: 'human' as const, id: 'tester' };

function createManager(): StageManager {
  const orch = new DiscoveryOrchestrator(new FixedClock(NOW));
  return new StageManager(new FixedClock(NOW), new NullLogger(), orch);
}

function discoveryState(): State {
  return createTestState({ project: { stage: 'discovery' } });
}

function deliveryState(): State {
  return createTestState({ project: { stage: 'delivery' } });
}

function maintenanceState(): State {
  return createTestState({ project: { stage: 'maintenance' } });
}

/** Close every discovery milestone via waive (test setup). */
function allMilestonesClosed(): State {
  const orch = new DiscoveryOrchestrator(new FixedClock(NOW));
  const state = orch.initialize(discoveryState());
  expect(state.ok).toBe(true);
  if (!state.ok) throw new Error('init failed');
  let current = state.value;
  for (const id of DISCOVERY_MILESTONE_ORDER) {
    const waived = orch.waive(current, id, {
      reason: `close ${id}`,
      actor: ACTOR,
    });
    expect(waived.ok).toBe(true);
    if (!waived.ok) throw new Error(`waive ${id} failed`);
    current = waived.value;
  }
  return current;
}

describe('StageManager', () => {
  describe('currentStage', () => {
    it('returns current stage', () => {
      const manager = createManager();
      expect(manager.currentStage(discoveryState())).toBe('discovery');
      expect(manager.currentStage(deliveryState())).toBe('delivery');
    });
  });

  describe('advanceStage', () => {
    it('advances discovery→delivery when all milestones are closed', async () => {
      const manager = createManager();
      const state = allMilestonesClosed();
      const config = createTestConfig();

      const result = await manager.advanceStage(state, config);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.project.stage).toBe('delivery');
      expect(result.value.project.stage_history).toHaveLength(1);
      const entry = result.value.project.stage_history[0];
      expect(entry?.from).toBe('discovery');
      expect(entry?.to).toBe('delivery');
    });

    it('rejects discovery→delivery when milestones are incomplete (hard gate)', async () => {
      const manager = createManager();
      const state = discoveryState();
      const config = createTestConfig({
        stage: { enforcement: { restrict_phases: 'advisory' } },
      });

      const result = await manager.advanceStage(state, config);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_STAGE_TRANSITION');
      }
    });

    it('advances delivery→maintenance', async () => {
      const manager = createManager();
      const state = deliveryState();
      const config = createTestConfig();

      const result = await manager.advanceStage(state, config);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.project.stage).toBe('maintenance');
      }
    });

    it('rejects advancing past maintenance', async () => {
      const manager = createManager();
      const state = maintenanceState();
      const config = createTestConfig();

      const result = await manager.advanceStage(state, config);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('ALREADY_AT_STAGE');
      }
    });
  });

  describe('requiresForceWaiver', () => {
    it('returns true when leaving discovery with incomplete milestones', () => {
      const manager = createManager();
      expect(manager.requiresForceWaiver(discoveryState(), 'delivery')).toBe(true);
      expect(manager.requiresForceWaiver(discoveryState(), 'maintenance')).toBe(true);
    });

    it('returns false when discovery milestones are closed', () => {
      const manager = createManager();
      expect(manager.requiresForceWaiver(allMilestonesClosed(), 'delivery')).toBe(false);
    });

    it('returns false for delivery→maintenance and for backward/same-stage', () => {
      const manager = createManager();
      expect(manager.requiresForceWaiver(deliveryState(), 'maintenance')).toBe(false);
      expect(manager.requiresForceWaiver(deliveryState(), 'discovery')).toBe(false);
      expect(manager.requiresForceWaiver(discoveryState(), 'discovery')).toBe(false);
    });
  });

  describe('setStage', () => {
    it('force-sets stage with reason', () => {
      const manager = createManager();
      const state = discoveryState();

      const result = manager.setStage(state, 'delivery', 'Forced by admin');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.project.stage).toBe('delivery');
      const entry = result.value.project.stage_history[0];
      expect(entry?.reason).toBe('Forced by admin');
    });

    it('rejects setting same stage', () => {
      const manager = createManager();
      const state = discoveryState();

      const result = manager.setStage(state, 'discovery', 'No reason');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('ALREADY_AT_STAGE');
      }
    });

    it('rejects backward stage transition', () => {
      const manager = createManager();
      const state = maintenanceState();

      const result = manager.setStage(state, 'discovery', 'Go back');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_STAGE_TRANSITION');
      }
    });

    it('allows skipping stage (discovery→maintenance)', () => {
      const manager = createManager();
      const state = discoveryState();

      const result = manager.setStage(state, 'maintenance', 'Skip delivery');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.project.stage).toBe('maintenance');
      }
    });
  });

  describe('canAdvance', () => {
    it('returns the ordered 7-milestone checklist without roadmap', async () => {
      const manager = createManager();
      const state = discoveryState();
      const config = createTestConfig();

      const result = await manager.canAdvance(state, config);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.nextStage).toBe('delivery');
      const ids = result.value.criteria.map((c) => c.id);
      expect(ids).toEqual([...DISCOVERY_MILESTONE_ORDER]);
      expect(ids).not.toContain('roadmap');
      expect(result.value.criteria.every((c) => !c.met)).toBe(true);
    });

    it('returns all criteria met when milestones are closed', async () => {
      const manager = createManager();
      const state = allMilestonesClosed();
      const config = createTestConfig();

      const result = await manager.canAdvance(state, config);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.criteria.every((c) => c.met)).toBe(true);
      }
    });

    it('returns error when at maintenance', async () => {
      const manager = createManager();
      const state = maintenanceState();
      const config = createTestConfig();

      const result = await manager.canAdvance(state, config);

      expect(result.ok).toBe(false);
    });
  });
});
