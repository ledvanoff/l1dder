import { describe, expect, it } from 'vitest';
import { FixedClock, NullLogger } from '@l1dder/core/testing';

import { createTestState } from '../../testing.js';
import { TaskManager } from './task-manager.js';

const NOW = '2026-05-11T12:00:00Z';

function createManager() {
  return new TaskManager(new FixedClock(NOW), new NullLogger());
}

function stateWithTasks(
  tasks: Array<{ id: string; title?: string; depends_on?: string[]; status?: string }>,
) {
  return createTestState({
    tasks: {
      items: tasks.map((t) => ({
        id: t.id,
        title: t.title ?? `Task ${t.id}`,
        status: t.status ?? 'pending',
        depends_on: t.depends_on ?? [],
      })),
    },
  });
}

describe('TaskManager', () => {
  describe('addTask', () => {
    it('adds task with pending status', () => {
      const manager = createManager();
      const state = createTestState();

      const result = manager.addTask(state, { id: 'T-01', title: 'First task' });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const task = result.value.tasks.items.find((t) => t.id === 'T-01');
      expect(task).toBeDefined();
      if (!task) return;
      expect(task.status).toBe('pending');
      expect(task.depends_on).toEqual([]);
    });

    it('adds task with depends_on', () => {
      const manager = createManager();
      const state = stateWithTasks([{ id: 'T-01' }]);

      const result = manager.addTask(state, {
        id: 'T-02',
        title: 'Second task',
        depends_on: ['T-01'],
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const task = result.value.tasks.items.find((t) => t.id === 'T-02');
      expect(task).toBeDefined();
      if (!task) return;
      expect(task.depends_on).toEqual(['T-01']);
    });

    it('rejects duplicate task id', () => {
      const manager = createManager();
      const state = stateWithTasks([{ id: 'T-01' }]);

      const result = manager.addTask(state, { id: 'T-01', title: 'Dup' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('TASK_ALREADY_EXISTS');
      }
    });
  });

  describe('startTask', () => {
    it('transitions pending → in_progress', () => {
      const manager = createManager();
      const state = stateWithTasks([{ id: 'A' }]);

      const result = manager.startTask(state, 'A');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const task = result.value.tasks.items.find((t) => t.id === 'A');
      expect(task).toBeDefined();
      if (!task) return;
      expect(task.status).toBe('in_progress');
      expect(task.started_at).toBe(NOW);
    });

    it('checks dependencies before starting', () => {
      const manager = createManager();
      const state = stateWithTasks([
        { id: 'A' },
        { id: 'B', depends_on: ['A'] },
      ]);

      const result = manager.startTask(state, 'B');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DEPENDENCIES_NOT_MET');
      }
    });

    it('allows start when dependencies are done', () => {
      const manager = createManager();
      const state = stateWithTasks([
        { id: 'A', status: 'done' },
        { id: 'B', depends_on: ['A'] },
      ]);

      const result = manager.startTask(state, 'B');

      expect(result.ok).toBe(true);
    });

    it('allows start when dependency is skipped', () => {
      const manager = createManager();
      const state = stateWithTasks([
        { id: 'A', status: 'skipped' },
        { id: 'B', depends_on: ['A'] },
      ]);

      const result = manager.startTask(state, 'B');

      expect(result.ok).toBe(true);
    });

    it('returns error for unknown task', () => {
      const manager = createManager();
      const state = createTestState();

      const result = manager.startTask(state, 'UNKNOWN');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('TASK_NOT_FOUND');
      }
    });

    it('rejects starting an already done task', () => {
      const manager = createManager();
      const state = stateWithTasks([{ id: 'A', status: 'done' }]);

      const result = manager.startTask(state, 'A');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_TASK_STATUS_TRANSITION');
      }
    });
  });

  describe('completeTask', () => {
    it('transitions in_progress → done', () => {
      const manager = createManager();
      const state = stateWithTasks([{ id: 'A', status: 'in_progress' }]);

      const result = manager.completeTask(state, 'A');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const task = result.value.tasks.items.find((t) => t.id === 'A');
      expect(task).toBeDefined();
      if (!task) return;
      expect(task.status).toBe('done');
      expect(task.completed_at).toBe(NOW);
    });

    it('rejects completing a pending task', () => {
      const manager = createManager();
      const state = stateWithTasks([{ id: 'A', status: 'pending' }]);

      const result = manager.completeTask(state, 'A');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_TASK_STATUS_TRANSITION');
      }
    });

    it('returns error for unknown task', () => {
      const manager = createManager();
      const state = createTestState();

      const result = manager.completeTask(state, 'UNKNOWN');

      expect(result.ok).toBe(false);
    });
  });

  describe('skipTask', () => {
    it('skips pending task', () => {
      const manager = createManager();
      const state = stateWithTasks([{ id: 'A' }]);

      const result = manager.skipTask(state, 'A');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const task = result.value.tasks.items.find((t) => t.id === 'A');
      expect(task).toBeDefined();
      if (!task) return;
      expect(task.status).toBe('skipped');
    });

    it('skips in_progress task', () => {
      const manager = createManager();
      const state = stateWithTasks([{ id: 'A', status: 'in_progress' }]);

      const result = manager.skipTask(state, 'A');

      expect(result.ok).toBe(true);
    });

    it('rejects skipping a done task', () => {
      const manager = createManager();
      const state = stateWithTasks([{ id: 'A', status: 'done' }]);

      const result = manager.skipTask(state, 'A');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_TASK_STATUS_TRANSITION');
      }
    });
  });

  describe('nextTask', () => {
    it('returns first pending with met deps', () => {
      const manager = createManager();
      const state = stateWithTasks([
        { id: 'A', status: 'done' },
        { id: 'B', depends_on: ['A'] },
        { id: 'C', depends_on: ['B'] },
      ]);

      const result = manager.nextTask(state);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('B');
      }
    });

    it('returns null when all done', () => {
      const manager = createManager();
      const state = stateWithTasks([
        { id: 'A', status: 'done' },
        { id: 'B', status: 'done', depends_on: ['A'] },
      ]);

      const result = manager.nextTask(state);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });

    it('returns null for empty tasks', () => {
      const manager = createManager();
      const state = createTestState();

      const result = manager.nextTask(state);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });

    it('skips tasks with unmet deps', () => {
      const manager = createManager();
      const state = stateWithTasks([
        { id: 'A' },
        { id: 'B', depends_on: ['A'] },
      ]);

      const result = manager.nextTask(state);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('A');
      }
    });

    it('returns error on cyclic dependencies', () => {
      const manager = createManager();
      const state = stateWithTasks([
        { id: 'A', depends_on: ['B'] },
        { id: 'B', depends_on: ['A'] },
      ]);

      const result = manager.nextTask(state);

      expect(result.ok).toBe(false);
    });
  });

  describe('listTasks', () => {
    it('returns all tasks', () => {
      const manager = createManager();
      const state = stateWithTasks([
        { id: 'A' },
        { id: 'B' },
      ]);

      const tasks = manager.listTasks(state);

      expect(tasks).toHaveLength(2);
      expect(tasks.map((t) => t.id)).toEqual(['A', 'B']);
    });

    it('returns empty array when no tasks', () => {
      const manager = createManager();
      const state = createTestState();

      expect(manager.listTasks(state)).toEqual([]);
    });
  });
});
