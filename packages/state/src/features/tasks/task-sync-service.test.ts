import { describe, expect, it } from 'vitest';
import {
  FixedClock,
  InMemoryFileSystem,
  NullLogger,
} from '@l1dder/core/testing';

import { createTestState } from '../../testing.js';
import { TaskSyncService } from './task-sync-service.js';

const NOW = '2026-08-10T12:00:00Z';
const TASKS_PATH = '/project/specs/feat/tasks.md';

const DOC = `## Task List

| id | Task | depends_on | Status |
|----|------|------------|--------|
| T-01 | Scaffold | — | pending |
| T-02 | Domain | T-01 | in_progress |
| T-03 | CLI | T-01 | done |
`;

function createService(fs: InMemoryFileSystem = new InMemoryFileSystem()): {
  service: TaskSyncService;
  fs: InMemoryFileSystem;
} {
  const service = new TaskSyncService({
    fs,
    clock: new FixedClock(NOW),
    logger: new NullLogger(),
  });
  return { service, fs };
}

describe('TaskSyncService', () => {
  it('returns err TASKS_FILE_NOT_FOUND when the file is missing', async () => {
    const { service } = createService();
    const result = await service.sync(createTestState(), TASKS_PATH);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('TASKS_FILE_NOT_FOUND');
  });

  it('projects markdown rows into state.tasks.items with sync counts', async () => {
    const { service, fs } = createService();
    await fs.mkdir('/project/specs/feat');
    await fs.writeFile(TASKS_PATH, DOC);

    const result = await service.sync(createTestState(), TASKS_PATH);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.added).toBe(3);
    expect(result.value.updated).toBe(0);
    expect(result.value.removed).toBe(0);
    expect(result.value.unchanged).toBe(0);
    expect(result.value.items.map((t) => t.id)).toEqual(['T-01', 'T-02', 'T-03']);
    expect(result.value.items[1]).toMatchObject({
      status: 'in_progress',
      started_at: NOW,
    });
    expect(result.value.items[2]).toMatchObject({
      status: 'done',
      completed_at: NOW,
    });
    expect(result.value.state.tasks.items).toEqual(result.value.items);
  });

  it('preserves timestamps when status is unchanged and clears them on pending', async () => {
    const { service, fs } = createService();
    await fs.mkdir('/project/specs/feat');
    await fs.writeFile(
      TASKS_PATH,
      `## Task List

| id | Task | Status |
|----|------|--------|
| T-01 | Scaffold | pending |
`,
    );

    const prior = createTestState({
      tasks: {
        items: [
          {
            id: 'T-01',
            title: 'Scaffold',
            status: 'in_progress',
            depends_on: [],
            started_at: '2026-01-01T00:00:00Z',
          },
          {
            id: 'T-99',
            title: 'Gone',
            status: 'pending',
            depends_on: [],
          },
        ],
      },
    });

    const result = await service.sync(prior, TASKS_PATH);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.removed).toBe(1);
    expect(result.value.updated).toBe(1);
    expect(result.value.items).toHaveLength(1);
    expect(result.value.items[0]).toMatchObject({
      id: 'T-01',
      status: 'pending',
      started_at: undefined,
      completed_at: undefined,
    });
  });

  it('returns err when the markdown dependency graph contains a cycle', async () => {
    const { service, fs } = createService();
    await fs.mkdir('/project/specs/feat');
    await fs.writeFile(
      TASKS_PATH,
      `## Task List

| id | Task | depends_on | Status |
|----|------|------------|--------|
| T-01 | A | T-02 | pending |
| T-02 | B | T-01 | pending |
`,
    );

    const result = await service.sync(createTestState(), TASKS_PATH);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('DEPENDENCIES_NOT_MET');
  });

  it('does not mutate the input state on success', async () => {
    const { service, fs } = createService();
    await fs.mkdir('/project/specs/feat');
    await fs.writeFile(TASKS_PATH, DOC);
    const state = createTestState();
    const before = structuredClone(state);

    await service.sync(state, TASKS_PATH);

    expect(state).toEqual(before);
  });
});
