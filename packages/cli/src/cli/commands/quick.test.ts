import { describe, it, expect, vi } from 'vitest';

import { executeQuick } from './quick.js';
import type { CliContext } from '../context.js';
import { ExitCode } from '../output/exit-codes.js';

function createQuickCtx(stateOverrides?: {
  phase?: string;
  mode?: string;
  quickTasks?: unknown[];
}): CliContext {
  const phase = stateOverrides?.phase ?? 'idle';
  const mode = stateOverrides?.mode ?? 'main';
  const quickTasks = stateOverrides?.quickTasks ?? [];

  const state = {
    schema_version: 1,
    project: { name: 'test', stage: 'delivery', created_at: '2026-01-01', updated_at: '2026-01-01' },
    workflow: { current_phase: phase, current_status: 'in_progress', mode, iteration: 0 },
    tasks: { items: [] },
    quick_tasks: quickTasks,
    phase_history: [],
    stage_history: [],
    knowledge_updates: [],
    _in_flight_transition: null,
    sessions: [],
  };

  const smMock = {
    stateSnapshot: () => structuredClone(state),
    configSnapshot: () => ({}),
    quick: {
      startQuick: vi.fn((_s: unknown, _slug: string, desc: string) => ({
        ok: true,
        value: {
          ...state,
          workflow: { ...state.workflow, current_phase: 'quick_plan', mode: 'quick' },
          quick_tasks: [
            ...quickTasks,
            { id: `quick-test-123`, description: desc, status: 'in_progress', created_at: '2026-05-24T12:00:00Z', knowledge_drift_warning: false },
          ],
        },
      })),
      startFast: vi.fn((_s: unknown, _slug: string, desc: string) => ({
        ok: true,
        value: {
          ...state,
          workflow: { ...state.workflow, current_phase: 'fast_implement', mode: 'fast' },
          quick_tasks: [
            ...quickTasks,
            { id: `fast-test-123`, description: desc, status: 'in_progress', created_at: '2026-05-24T12:00:00Z', knowledge_drift_warning: false },
          ],
        },
      })),
      commitQuick: vi.fn((_s: unknown, taskId: string) => Promise.resolve({
        ok: true,
        value: {
          ...state,
          workflow: { ...state.workflow, current_phase: 'idle', mode: 'main' },
          quick_tasks: quickTasks.map((t: unknown) =>
            (t as { id: string }).id === taskId
              ? { ...(t as object), status: 'done', completed_at: '2026-05-24T13:00:00Z', knowledge_drift_warning: false }
              : t,
          ),
        },
      })),
      commitFast: vi.fn((_s: unknown, taskId: string) => Promise.resolve({
        ok: true,
        value: {
          ...state,
          workflow: { ...state.workflow, current_phase: 'idle', mode: 'main' },
          quick_tasks: quickTasks.map((t: unknown) =>
            (t as { id: string }).id === taskId
              ? { ...(t as object), status: 'done', completed_at: '2026-05-24T13:00:00Z', knowledge_drift_warning: false }
              : t,
          ),
        },
      })),
    },
    _updateState: vi.fn((fn: (s: unknown) => unknown) => { fn(state); }),
    save: vi.fn(() => Promise.resolve({ ok: true, value: undefined })),
    applyAndSave: vi.fn((fn: (s: unknown) => unknown) => { fn(state); return Promise.resolve({ ok: true, value: undefined }); }),
  };

  return {
    cwd: '/project',
    fs: {
      readFile: () => Promise.resolve(''),
      writeFile: () => Promise.resolve(),
      rename: () => Promise.resolve(),
      exists: () => Promise.resolve(true),
      stat: () => Promise.resolve({ size: 0, mtimeMs: 0, isFile: true, isDirectory: false }),
      mkdir: () => Promise.resolve(),
      deleteFile: () => Promise.resolve(),
      readDir: () => Promise.resolve([] as string[]),
      removeDir: () => Promise.resolve(),
    },
    clock: { now: () => '2026-05-24T12:00:00.000Z' },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    prompt: {
      confirm: () => Promise.resolve(true),
      input: () => Promise.resolve(''),
      select: <T extends string>() => Promise.resolve('' as T),
    },
    globals: {
      cwd: '/project',
      json: false,
      color: false,
      quiet: false,
      verbose: false,
      noPrompt: true,
      noRecover: false,
    },
    output: { render: () => {}, error: () => {} },
    colors: {
      success: (t: string) => t,
      warning: (t: string) => t,
      error: (t: string) => t,
      info: (t: string) => t,
      dim: (t: string) => t,
      bold: (t: string) => t,
      glyph: { pass: '[OK]', warn: '[WARN]', fail: '[FAIL]', info: '[i]', arrow: '→' },
    },
    shell: undefined,
    state: () => Promise.resolve(smMock),
    knowledge: () => { throw new Error('not used'); },
    contextEngine: () => { throw new Error('not used'); },
  } as unknown as CliContext;
}

describe('executeQuick', () => {
  it('starts quick task and transitions to QUICK_PLAN', async () => {
    const ctx = createQuickCtx();
    const result = await executeQuick(ctx, 'quick', 'fix null check', {});

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data?.quick_task.mode).toBe('quick');
    expect(result.data?.transition?.to).toBe('quick_plan');
  });

  it('starts fast task and transitions to FAST_IMPLEMENT', async () => {
    const ctx = createQuickCtx();
    const result = await executeQuick(ctx, 'fast', 'fix typo', {});

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data?.quick_task.mode).toBe('fast');
    expect(result.data?.transition?.to).toBe('fast_implement');
  });

  it('rejects missing description', async () => {
    const ctx = createQuickCtx();
    const result = await executeQuick(ctx, 'quick', undefined, {});

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
  });

  it('rejects description longer than 200 chars', async () => {
    const ctx = createQuickCtx();
    const result = await executeQuick(ctx, 'quick', 'x'.repeat(201), {});

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
  });

  it('--finish completes active task and returns to IDLE', async () => {
    const ctx = createQuickCtx({
      phase: 'quick_implement',
      mode: 'quick',
      quickTasks: [
        { id: 'quick-fix-123', description: 'fix', status: 'in_progress', created_at: '2026-05-24T10:00:00Z', knowledge_drift_warning: false },
      ],
    });

    const result = await executeQuick(ctx, 'quick', undefined, { finish: true });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data?.quick_task.status).toBe('done');
    expect(result.data?.transition?.to).toBe('idle');
  });

  it('--finish rejects when no active task', async () => {
    const ctx = createQuickCtx({ phase: 'idle', mode: 'main', quickTasks: [] });
    const result = await executeQuick(ctx, 'quick', undefined, { finish: true });

    expect(result.exitCode).toBe(ExitCode.GENERIC_ERROR);
    expect(result.error?.code).toBe('TASK_NOT_FOUND');
  });
});
