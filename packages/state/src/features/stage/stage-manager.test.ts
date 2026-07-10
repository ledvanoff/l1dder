import { describe, expect, it } from 'vitest';
import { FixedClock, InMemoryFileSystem, NullLogger } from '@l1dder/core/testing';

import { createTestState, createTestConfig } from '../../testing.js';
import { StageManager } from './stage-manager.js';

const NOW = '2026-05-11T12:00:00Z';
const PROJECT_ROOT = '/project';

/** Minimal mature content that passes skeleton check. */
const MATURE = `## Summary\n\n${'x'.repeat(250)}\n\n## Details\n\nFull details.`;

function createManager(fs?: InMemoryFileSystem) {
  return new StageManager(
    new FixedClock(NOW),
    new NullLogger(),
    fs ?? new InMemoryFileSystem(),
    PROJECT_ROOT,
  );
}

function discoveryState() {
  return createTestState({ project: { stage: 'discovery' } });
}

function deliveryState() {
  return createTestState({ project: { stage: 'delivery' } });
}

function maintenanceState() {
  return createTestState({ project: { stage: 'maintenance' } });
}

/** InMemoryFileSystem pre-populated with all mature discovery artifacts. */
function createMatureFs(): InMemoryFileSystem {
  const fs = new InMemoryFileSystem();
  void fs.writeFile(`${PROJECT_ROOT}/knowledge/idea.md`, MATURE);
  void fs.writeFile(`${PROJECT_ROOT}/knowledge/roadmap.md`, MATURE);
  void fs.writeFile(`${PROJECT_ROOT}/knowledge/to-be/architecture.md`, MATURE);
  void fs.writeFile(`${PROJECT_ROOT}/knowledge/to-be/erd.md`, 'erDiagram\n  User { string id }');
  void fs.writeFile(`${PROJECT_ROOT}/knowledge/to-be/usecases.md`, MATURE);
  void fs.writeFile(`${PROJECT_ROOT}/design/project-stage.md`, '# Stage spec');
  return fs;
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
    it('advances discovery→delivery when criteria met', async () => {
      const manager = createManager(createMatureFs());
      const state = discoveryState();
      const config = createTestConfig();

      const result = await manager.advanceStage(state, config);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.project.stage).toBe('delivery');
      expect(result.value.project.stage_history).toHaveLength(1);
      const entry = result.value.project.stage_history[0];
      expect(entry).toBeDefined();
      if (!entry) return;
      expect(entry.from).toBe('discovery');
      expect(entry.to).toBe('delivery');
    });

    it('rejects discovery→delivery when criteria not met and enforcement is enforced', async () => {
      const manager = createManager(new InMemoryFileSystem());
      const state = discoveryState();
      const config = createTestConfig({
        stage: { enforcement: { require_criteria: 'enforced' } },
      });

      const result = await manager.advanceStage(state, config);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_STAGE_TRANSITION');
      }
    });

    it('allows discovery→delivery with warning when advisory and criteria not met', async () => {
      const manager = createManager(new InMemoryFileSystem());
      const state = discoveryState();
      const config = createTestConfig({
        stage: { enforcement: { require_criteria: 'advisory' } },
      });

      const result = await manager.advanceStage(state, config);

      expect(result.ok).toBe(true);
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

  describe('setStage', () => {
    it('force-sets stage with reason', () => {
      const manager = createManager();
      const state = discoveryState();

      const result = manager.setStage(state, 'delivery', 'Forced by admin');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.project.stage).toBe('delivery');
      const entry = result.value.project.stage_history[0];
      expect(entry).toBeDefined();
      if (!entry) return;
      expect(entry.reason).toBe('Forced by admin');
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
    it('returns next stage and criteria status (discovery with empty fs → criteria not met)', async () => {
      const manager = createManager(new InMemoryFileSystem());
      const state = discoveryState();
      const config = createTestConfig();

      const result = await manager.canAdvance(state, config);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.nextStage).toBe('delivery');
        expect(result.value.criteria).toBeDefined();
        expect(Array.isArray(result.value.criteria)).toBe(true);
      }
    });

    it('returns criteria all met for mature project', async () => {
      const manager = createManager(createMatureFs());
      const state = discoveryState();
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
