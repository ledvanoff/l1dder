import { describe, it, expect, vi } from 'vitest';
import type { FileSystemPort, ShellPort } from '@l1dder/core';
import type { HookResult } from '@l1dder/schemas';

import { sessionClosureReminderHandler } from './session-closure-reminder.js';

function makeShell(): ShellPort {
  return {
    exec: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
  };
}

function makeFs(overrides?: Partial<FileSystemPort>): FileSystemPort {
  return {
    readFile: vi.fn().mockRejectedValue(new Error('not found')),
    writeFile: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn().mockResolvedValue(false),
    rename: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn().mockRejectedValue(new Error('not found')),
    mkdir: vi.fn().mockResolvedValue(undefined),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    readDir: vi.fn().mockResolvedValue([]),
    removeDir: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const NOW = '2026-08-10T19:00:00Z';

function makeStateYml(session: string | null): string {
  const sessionBlock =
    session === null
      ? '  session: null'
      : [
          '  session:',
          '    iteration: ITER-001',
          `    session: ${session}`,
          '    profile: delivery',
          `    started_at: "${NOW}"`,
          '    waiver: null',
        ].join('\n');

  return `schema_version: 4
project:
  name: "closure-hook-test"
  stage: delivery
  stage_history: []
  created_at: "${NOW}"
  updated_at: "${NOW}"
workflow:
  current_phase: implement
  current_status: in_progress
  mode: main
  profile: delivery
${sessionBlock}
  session_history: []
  iteration: 1
  phase_history: []
  gate_history: []
discovery:
  milestones: []
  current: null
  waivers: []
tasks:
  items: []
quick_tasks: []
knowledge_updates: []
decisions: []
`;
}

const baseDeps = {
  projectRoot: '/project',
  shell: makeShell(),
  fs: makeFs(),
};

describe('sessionClosureReminderHandler', () => {
  it('returns a follow-up mentioning session closure when an active session is open', async () => {
    const fs = makeFs({
      readFile: vi.fn().mockResolvedValue(makeStateYml('HARD-6')),
    });

    const result: HookResult = await sessionClosureReminderHandler(
      {
        event: 'Stop',
        raw: { status: 'completed', loop_count: 0 },
      },
      { ...baseDeps, fs },
    );

    expect(result.outcome).toBe('warn');
    const text = result.messages.join('\n');
    expect(text).toMatch(/session end|handoff/i);
    expect(text).toMatch(/Done \/ Next/);
    expect(text).toMatch(/HARD-6/);
  });

  it('does not nag when there is no active session', async () => {
    const fs = makeFs({
      readFile: vi.fn().mockResolvedValue(makeStateYml(null)),
    });

    const result: HookResult = await sessionClosureReminderHandler(
      {
        event: 'Stop',
        raw: { status: 'completed', loop_count: 0 },
      },
      { ...baseDeps, fs },
    );

    expect(result.outcome).toBe('allow');
    expect(result.messages).toEqual([]);
  });

  it('degrades to a doctor recommendation when state is unreadable', async () => {
    const fs = makeFs({
      readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
    });

    const result: HookResult = await sessionClosureReminderHandler(
      {
        event: 'Stop',
        raw: { status: 'completed', loop_count: 0 },
      },
      { ...baseDeps, fs },
    );

    expect(result.outcome).toBe('warn');
    expect(result.outcome).not.toBe('block');
    const text = result.messages.join('\n');
    expect(text).toMatch(/l1dder doctor/);
    expect(text).not.toMatch(/successfully closed|session ended successfully/i);
  });

  it('degrades to doctor when state YAML is invalid', async () => {
    const fs = makeFs({
      readFile: vi.fn().mockResolvedValue('schema_version: [\n  - broken'),
    });

    const result: HookResult = await sessionClosureReminderHandler(
      { event: 'Stop', raw: { status: 'completed', loop_count: 0 } },
      { ...baseDeps, fs },
    );

    expect(result.outcome).toBe('warn');
    expect(result.messages.join('\n')).toMatch(/l1dder doctor/);
  });

  it('allows when the IDE reports an aborted stop', async () => {
    const fs = makeFs({
      readFile: vi.fn().mockResolvedValue(makeStateYml('HARD-6')),
    });

    const result: HookResult = await sessionClosureReminderHandler(
      { event: 'Stop', raw: { status: 'aborted', loop_count: 0 } },
      { ...baseDeps, fs },
    );

    expect(result.outcome).toBe('allow');
    expect(result.messages).toEqual([]);
  });
});
