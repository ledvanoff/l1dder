import { describe, it, expect } from 'vitest';
import { InMemoryFileSystem, FixedClock, NullLogger } from '@l1dder/core/testing';

import { executeTask } from './task.js';
import { executeTransition } from '../transition.js';
import { ExitCode } from '../../output/exit-codes.js';
import { createColorPalette } from '../../output/colors.js';
import { createFormatter } from '../../output/formatter.js';
import { parseGlobals } from '../../globals.js';
import { buildContext } from '../../context.js';
import { NonInteractiveAdapter } from '../../prompt/non-interactive-adapter.js';
import type { CliContext } from '../../context.js';

const NOW = '2026-08-10T18:00:00Z';
const CWD = '/test-project';
const TASKS_PATH = `${CWD}/specs/current/tasks.md`;

const SAMPLE_TASKS_MD = `# Feature — Task Decomposition

## Summary

Two sample tasks for CLI tests.

## Task List

| id | Task | depends_on | Complexity | Status |
|----|------|------------|------------|--------|
| T-01 | First task | — | S | pending |
| T-02 | Second task | T-01 | M | pending |

## Task Details

### T-01: First task

Keep this section intact for byte-for-byte tests.
`;

function makeStateYml(overrides?: {
  phase?: string;
  tasksYaml?: string;
}): string {
  const phase = overrides?.phase ?? 'implement';
  const tasks = overrides?.tasksYaml ?? '    []';
  return `schema_version: 3
project:
  name: "task-cli-test"
  stage: delivery
  stage_history: []
  created_at: "${NOW}"
  updated_at: "${NOW}"
workflow:
  current_phase: ${phase}
  current_status: in_progress
  mode: main
  profile: null
  session: null
  iteration: 1
  phase_history: []
  gate_history: []
discovery:
  milestones: []
  current: null
  waivers: []
tasks:
  items:
${tasks}
quick_tasks: []
knowledge_updates: []
decisions: []
`;
}

const CONFIG_YML = `schema_version: 1
role_mode: solo
`;

async function createTestCtx(opts?: {
  stateOverrides?: Parameters<typeof makeStateYml>[0];
  withTasksFile?: boolean;
}): Promise<CliContext & { fs: InMemoryFileSystem }> {
  const fs = new InMemoryFileSystem();
  const clock = new FixedClock(NOW);
  const logger = new NullLogger();
  const prompt = new NonInteractiveAdapter();
  const colors = createColorPalette(false);
  const output = createFormatter('human', colors);
  const globals = parseGlobals({ cwd: CWD });

  await fs.mkdir(`${CWD}/.l1dder`);
  await fs.mkdir(`${CWD}/specs/current`);
  await fs.writeFile(
    `${CWD}/.l1dder/state.yml`,
    makeStateYml(opts?.stateOverrides),
  );
  await fs.writeFile(`${CWD}/.l1dder/config.yml`, CONFIG_YML);
  if (opts?.withTasksFile !== false) {
    await fs.writeFile(TASKS_PATH, SAMPLE_TASKS_MD);
  }

  const ctx = buildContext(globals, { fs, clock, logger, prompt, output, colors });
  return Object.assign(ctx, { fs });
}

describe('l1dder task (DF-026)', () => {
  it('DF-020: task sync fills state.tasks.items from tasks.md', async () => {
    const ctx = await createTestCtx();
    const result = await executeTask(ctx, 'sync', undefined, {});

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    const data = result.data as {
      counts: { added: number; updated: number; removed: number; unchanged: number };
      tasks: Array<{ id: string; status: string }>;
    };
    expect(data.counts.added).toBe(2);
    expect(data.tasks.map((t) => t.id)).toEqual(['T-01', 'T-02']);

    const sm = await ctx.state();
    expect(sm.stateSnapshot().tasks.items).toHaveLength(2);
    expect(sm.stateSnapshot().tasks.items[0]?.id).toBe('T-01');
  });

  it('task sync is idempotent on a second run', async () => {
    const ctx = await createTestCtx();
    await executeTask(ctx, 'sync', undefined, {});
    const second = await executeTask(ctx, 'sync', undefined, {});

    expect(second.exitCode).toBe(ExitCode.SUCCESS);
    const data = second.data as {
      counts: { added: number; updated: number; removed: number; unchanged: number };
    };
    expect(data.counts).toEqual({
      added: 0,
      updated: 0,
      removed: 0,
      unchanged: 2,
    });
  });

  it('task list renders projection and points at sync when empty', async () => {
    const ctx = await createTestCtx();
    const empty = await executeTask(ctx, 'list', undefined, {});
    expect(empty.exitCode).toBe(ExitCode.SUCCESS);
    expect(empty.humanText).toContain('l1dder task sync');

    await executeTask(ctx, 'sync', undefined, {});
    const listed = await executeTask(ctx, 'list', undefined, {});
    expect(listed.exitCode).toBe(ExitCode.SUCCESS);
    expect(listed.humanText).toContain('T-01');
    expect(listed.humanText).toContain('0/2 done');
    const data = listed.data as {
      tasks: Array<{ id: string; title: string; status: string; depends_on: string[] }>;
      summary: { done: number; total: number };
    };
    expect(data.summary).toEqual({ done: 0, total: 2 });
    expect(data.tasks[0]?.depends_on).toEqual([]);
    expect(data.tasks[1]?.depends_on).toEqual(['T-01']);
  });

  it('task complete marks Status done, syncs state, and preserves surrounding markdown', async () => {
    const ctx = await createTestCtx();
    await executeTask(ctx, 'sync', undefined, {});

    const before = await ctx.fs.readFile(TASKS_PATH);
    const result = await executeTask(ctx, 'complete', 'T-01', {});
    expect(result.exitCode).toBe(ExitCode.SUCCESS);

    const after = await ctx.fs.readFile(TASKS_PATH);
    expect(after).toMatch(/\| T-01 \| First task \| — \| S \| done\s*\|/);
    expect(after).toContain('Keep this section intact for byte-for-byte tests.');
    // Only the Status cell on the T-01 row changes — every other line is byte-identical.
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    expect(afterLines).toHaveLength(beforeLines.length);
    for (let i = 0; i < beforeLines.length; i++) {
      const prev = beforeLines[i] ?? '';
      const next = afterLines[i] ?? '';
      if (/^\| T-01 \|/.test(prev.trim())) {
        expect(prev).toContain('pending');
        expect(next).toContain('done');
      } else {
        expect(next).toBe(prev);
      }
    }

    const sm = await ctx.state();
    expect(sm.stateSnapshot().tasks.items.find((t) => t.id === 'T-01')?.status).toBe(
      'done',
    );
  });

  it('task complete on an already-done task is a no-op success', async () => {
    const ctx = await createTestCtx();
    await executeTask(ctx, 'sync', undefined, {});
    await executeTask(ctx, 'complete', 'T-01', {});
    const again = await executeTask(ctx, 'complete', 'T-01', {});

    expect(again.exitCode).toBe(ExitCode.SUCCESS);
    expect((again.data as { noop: boolean }).noop).toBe(true);
  });

  it('rejects task complete when depends_on entries are not done or skipped', async () => {
    const ctx = await createTestCtx();
    await executeTask(ctx, 'sync', undefined, {});
    const before = await ctx.fs.readFile(TASKS_PATH);

    const result = await executeTask(ctx, 'complete', 'T-02', {});
    expect(result.exitCode).toBe(ExitCode.DEPENDENCIES_NOT_MET);
    expect(result.error?.code).toBe('DEPENDENCIES_NOT_MET');
    expect(result.error?.message).toContain('T-01');
    expect(result.error?.hint).toContain('T-01');

    const after = await ctx.fs.readFile(TASKS_PATH);
    expect(after).toBe(before);

    const sm = await ctx.state();
    expect(sm.stateSnapshot().tasks.items.find((t) => t.id === 'T-02')?.status).toBe(
      'pending',
    );
  });
});

describe('DF-021: implementation-gate via l1dder transition', () => {
  it('rejects implement → update_asis when tasks are pending', async () => {
    const ctx = await createTestCtx({
      stateOverrides: {
        phase: 'implement',
        tasksYaml: `    - id: T-01
      title: A
      status: pending
      depends_on: []
    - id: T-02
      title: B
      status: pending
      depends_on: []`,
      },
    });

    const result = await executeTransition(ctx, { to: 'update_asis' });
    expect(result.exitCode).toBe(ExitCode.TASKS_ERROR);
    expect(result.error?.code).toBe('TASKS_INCOMPLETE');
    expect(result.error?.hint).toContain('task complete');
  });

  it('allows implement → update_asis when all tasks are done', async () => {
    const ctx = await createTestCtx({
      stateOverrides: {
        phase: 'implement',
        tasksYaml: `    - id: T-01
      title: A
      status: done
      depends_on: []
    - id: T-02
      title: B
      status: skipped
      depends_on: []`,
      },
      withTasksFile: false,
    });

    const result = await executeTransition(ctx, { to: 'update_asis' });
    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toMatchObject({ from: 'implement', to: 'update_asis' });
  });

  it('fails closed when tasks.md exists but projection is empty', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { phase: 'implement', tasksYaml: '    []' },
      withTasksFile: true,
    });

    const result = await executeTransition(ctx, { to: 'update_asis' });
    expect(result.exitCode).toBe(ExitCode.TASKS_ERROR);
    expect(result.error?.code).toBe('TASKS_PROJECTION_EMPTY');
    expect(result.error?.hint).toContain('l1dder task sync');
  });

  it('records the synced document so --file survives into the gate', async () => {
    const ctx = await createTestCtx({ withTasksFile: false });
    await ctx.fs.mkdir(`${CWD}/specs/other`);
    await ctx.fs.writeFile(`${CWD}/specs/other/tasks.md`, SAMPLE_TASKS_MD);

    const synced = await executeTask(ctx, 'sync', undefined, {
      file: 'specs/other/tasks.md',
    });
    expect(synced.exitCode).toBe(ExitCode.SUCCESS);

    const sm = await ctx.state();
    expect(sm.stateSnapshot().tasks.source_path).toBe('specs/other/tasks.md');
  });

  it('fails closed when the only tasks.md lives outside the default path', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { phase: 'implement', tasksYaml: '    []' },
      withTasksFile: false,
    });
    await ctx.fs.mkdir(`${CWD}/specs/other`);
    await ctx.fs.writeFile(`${CWD}/specs/other/tasks.md`, SAMPLE_TASKS_MD);

    const result = await executeTransition(ctx, { to: 'update_asis' });

    expect(result.exitCode).toBe(ExitCode.TASKS_ERROR);
    expect(result.error?.code).toBe('TASKS_PROJECTION_EMPTY');
    expect(result.error?.message).toContain('specs/other/tasks.md');
  });
});
