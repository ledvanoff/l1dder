import { describe, expect, it, vi } from 'vitest';
import { FixedClock, NullLogger } from '@l1dder/core/testing';
import { ok } from '@l1dder/core';

import { createTestState } from '../../testing.js';
import { QuickTaskManager } from './quick-task-manager.js';
import type { DriftCheckerPort } from './drift-checker-port.js';

const NOW = '2026-05-11T12:00:00Z';

function createManager(driftChecker?: DriftCheckerPort) {
  return new QuickTaskManager(
    new FixedClock(NOW),
    new NullLogger(),
    driftChecker,
  );
}

function idleState() {
  return createTestState({
    workflow: { current_phase: 'idle', mode: 'main' },
  });
}

describe('QuickTaskManager', () => {
  describe('startQuick', () => {
    it('creates quick_task and sets quick mode', () => {
      const manager = createManager();
      const state = idleState();

      const result = manager.startQuick(state, 'fix-typo', 'Fix README typo');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.workflow.mode).toBe('quick');
      expect(result.value.workflow.current_phase).toBe('quick_plan');
      expect(result.value.quick_tasks).toHaveLength(1);
      const qt = result.value.quick_tasks[0];
      expect(qt).toBeDefined();
      if (!qt) return;
      expect(qt.description).toBe('Fix README typo');
      expect(qt.status).toBe('in_progress');
    });

    it('rejects when not at idle', () => {
      const manager = createManager();
      const state = createTestState({
        workflow: { current_phase: 'specify', mode: 'main' },
      });

      const result = manager.startQuick(state, 'slug', 'desc');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('FORBIDDEN_TRANSITION');
      }
    });

    it('rejects when already in quick mode', () => {
      const manager = createManager();
      const state = createTestState({
        workflow: { current_phase: 'idle', mode: 'quick' },
      });

      const result = manager.startQuick(state, 'slug', 'desc');

      expect(result.ok).toBe(false);
    });
  });

  describe('startFast', () => {
    it('creates quick_task and sets fast mode', () => {
      const manager = createManager();
      const state = idleState();

      const result = manager.startFast(state, 'hotfix', 'Hotfix production');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.workflow.mode).toBe('fast');
      expect(result.value.workflow.current_phase).toBe('fast_implement');
      expect(result.value.quick_tasks).toHaveLength(1);
    });
  });

  describe('commitQuick', () => {
    it('transitions back to idle/main', async () => {
      const manager = createManager();
      const state = idleState();

      const startResult = manager.startQuick(state, 'fix', 'Fix thing');
      expect(startResult.ok).toBe(true);
      if (!startResult.ok) return;

      const qt = startResult.value.quick_tasks[0];
      expect(qt).toBeDefined();
      if (!qt) return;
      const commitResult = await manager.commitQuick(startResult.value, qt.id);

      expect(commitResult.ok).toBe(true);
      if (!commitResult.ok) return;
      expect(commitResult.value.workflow.mode).toBe('main');
      expect(commitResult.value.workflow.current_phase).toBe('idle');
      const committed = commitResult.value.quick_tasks[0];
      expect(committed).toBeDefined();
      if (!committed) return;
      expect(committed.status).toBe('done');
      expect(committed.completed_at).toBe(NOW);
    });

    it('calls drift checker and sets warning on drift', async () => {
      const driftChecker: DriftCheckerPort = {
        checkDrift: vi.fn().mockResolvedValue(
          ok({
            hasDrift: true,
            affectedFiles: ['knowledge/to-be/architecture.md'],
            summary: 'Architecture drift detected',
          }),
        ),
      };

      const manager = createManager(driftChecker);
      const state = idleState();

      const startResult = manager.startQuick(state, 'fix', 'Fix');
      expect(startResult.ok).toBe(true);
      if (!startResult.ok) return;

      const qt = startResult.value.quick_tasks[0];
      expect(qt).toBeDefined();
      if (!qt) return;
      const commitResult = await manager.commitQuick(startResult.value, qt.id);

      expect(commitResult.ok).toBe(true);
      if (!commitResult.ok) return;
      const committed = commitResult.value.quick_tasks[0];
      expect(committed).toBeDefined();
      if (!committed) return;
      expect(committed.knowledge_drift_warning).toBe(true);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(driftChecker.checkDrift).toHaveBeenCalled();
    });

    it('skips drift check when no port provided', async () => {
      const manager = createManager();
      const state = idleState();

      const startResult = manager.startQuick(state, 'fix', 'Fix');
      expect(startResult.ok).toBe(true);
      if (!startResult.ok) return;

      const qt = startResult.value.quick_tasks[0];
      expect(qt).toBeDefined();
      if (!qt) return;
      const commitResult = await manager.commitQuick(startResult.value, qt.id);

      expect(commitResult.ok).toBe(true);
      if (!commitResult.ok) return;
      const committed = commitResult.value.quick_tasks[0];
      expect(committed).toBeDefined();
      if (!committed) return;
      expect(committed.knowledge_drift_warning).toBe(false);
    });

    it('returns error for unknown task', async () => {
      const manager = createManager();
      const state = idleState();

      const result = await manager.commitQuick(state, 'non-existent');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('TASK_NOT_FOUND');
      }
    });
  });

  describe('commitFast', () => {
    it('transitions back to idle/main', async () => {
      const manager = createManager();
      const state = idleState();

      const startResult = manager.startFast(state, 'hotfix', 'Hotfix');
      expect(startResult.ok).toBe(true);
      if (!startResult.ok) return;

      const qt = startResult.value.quick_tasks[0];
      expect(qt).toBeDefined();
      if (!qt) return;
      const commitResult = await manager.commitFast(startResult.value, qt.id);

      expect(commitResult.ok).toBe(true);
      if (!commitResult.ok) return;
      expect(commitResult.value.workflow.mode).toBe('main');
      expect(commitResult.value.workflow.current_phase).toBe('idle');
    });
  });

  describe('listQuickTasks', () => {
    it('returns all quick tasks', () => {
      const manager = createManager();
      const state = createTestState({
        quick_tasks: [
          {
            id: 'qt-1',
            description: 'Test',
            status: 'done',
            created_at: NOW,
            knowledge_drift_warning: false,
          },
        ],
      });

      const tasks = manager.listQuickTasks(state);

      expect(tasks).toHaveLength(1);
      const first = tasks[0];
      expect(first).toBeDefined();
      if (!first) return;
      expect(first.id).toBe('qt-1');
    });

    it('returns empty array when no quick tasks', () => {
      const manager = createManager();
      const state = createTestState();

      expect(manager.listQuickTasks(state)).toEqual([]);
    });
  });
});
