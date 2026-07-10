import { describe, expect, it } from 'vitest';
import type { ShellPort, ShellResult } from '@l1dder/core';
import type { State } from '@l1dder/schemas';

import { checkDrift } from './drift.js';

function shellStub(stdout: string, exitCode = 0): ShellPort {
  return {
    exec: (): Promise<ShellResult> => Promise.resolve({ stdout, stderr: '', exitCode }),
  };
}

function baseState(overrides: Partial<State> = {}): State {
  return {
    schema_version: 1,
    project: { name: 'test', stage: 'delivery', stage_history: [], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    workflow: { current_phase: 'idle', current_status: 'in_progress', mode: 'main', iteration: 0, phase_history: [], gate_history: [] },
    tasks: { items: [] },
    quick_tasks: [],
    knowledge_updates: [],
    decisions: [],
    skillRuns: [],
    skillVersions: [],
    ...overrides,
  };
}

describe('checkDrift', () => {
  it('runs the same checks without --deep regardless of git diff (back-compat)', async () => {
    const state = baseState();
    const checks = await checkDrift(state);
    expect(checks.some((c) => c.id.startsWith('drift-orphan'))).toBe(false);
  });

  it('--deep flags an orphan drift when a knowledge/ file changed without a knowledge_updates[] record', async () => {
    const state = baseState({ knowledge_updates: [] });
    const shell = shellStub('knowledge/to-be/architecture.md\n');

    const checks = await checkDrift(state, { deep: true, shell, projectRoot: '/project' });

    const orphanCheck = checks.find((c) => c.id.startsWith('drift-orphan-'));
    expect(orphanCheck?.level).toBe('warn');
    expect(orphanCheck?.message).toContain('knowledge/to-be/architecture.md');
  });

  it('--deep passes when the changed knowledge file has a matching knowledge_updates[] record', async () => {
    const state = baseState({
      knowledge_updates: [
        {
          file: 'knowledge/to-be/architecture.md',
          operation: 'update',
          timestamp: '2026-01-01T00:00:00Z',
          actor: { kind: 'human', id: 'user' },
          summary: 'Updated architecture',
        },
      ],
    });
    const shell = shellStub('knowledge/to-be/architecture.md\n');

    const checks = await checkDrift(state, { deep: true, shell, projectRoot: '/project' });

    expect(checks.find((c) => c.id === 'drift-orphan-none')?.level).toBe('pass');
  });

  it('--deep ignores changed files outside knowledge/ and standards/', async () => {
    const state = baseState();
    const shell = shellStub('packages/cli/src/index.ts\n');

    const checks = await checkDrift(state, { deep: true, shell, projectRoot: '/project' });

    expect(checks.some((c) => c.id.startsWith('drift-orphan'))).toBe(false);
  });

  it('--deep without a shell skips orphan drift silently', async () => {
    const state = baseState();
    const checks = await checkDrift(state, { deep: true, projectRoot: '/project' });
    expect(checks.some((c) => c.id.startsWith('drift-orphan'))).toBe(false);
  });
});
