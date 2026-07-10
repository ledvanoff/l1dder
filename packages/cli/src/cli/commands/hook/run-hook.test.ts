import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ShellResult, ShellPort, FileSystemPort } from '@l1dder/core';
import { runHook, parseStdinPayload } from './run-hook.js';

// ─── Fake ports ───────────────────────────────────────────────────────────────

function makeShell(
  execImpl?: (cmd: string) => Promise<ShellResult>,
): ShellPort {
  return {
    exec: execImpl
      ? vi.fn().mockImplementation(execImpl)
      : vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('parseStdinPayload', () => {
  it('returns minimal payload for empty stdin', () => {
    const payload = parseStdinPayload('PreCompact', '');
    expect(payload.event).toBe('PreCompact');
  });

  it('normalises Cursor stdin fields', () => {
    const stdin = JSON.stringify({
      command: 'git commit -m "feat: x"',
      conversation_id: 'abc-123',
      workspace_roots: ['/workspace'],
    });
    const payload = parseStdinPayload('PreToolUse', stdin);
    expect(payload.command).toBe('git commit -m "feat: x"');
    expect(payload.conversationId).toBe('abc-123');
  });

  it('returns minimal payload on malformed JSON', () => {
    const payload = parseStdinPayload('Stop', 'NOT JSON {{{{');
    expect(payload.event).toBe('Stop');
  });

  it('falls back to Stop for unknown event name', () => {
    const payload = parseStdinPayload('afterFileEdit', '{}');
    expect(payload.event).toBe('Stop');
  });
});

describe('runHook — basic flow', () => {
  let stdoutData: string;
  let stderrData: string;

  beforeEach(() => {
    stdoutData = '';
    stderrData = '';
    vi.spyOn(process.stdout, 'write').mockImplementation((data) => {
      stdoutData += String(data);
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation((data) => {
      stderrData += String(data);
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exits 0 and echoes stdin for event with no active hooks (minimal profile + SessionEnd)', async () => {
    const shell = makeShell();
    const fs = makeFs();
    const stdin = '{"foo":"bar"}';

    const exitCode = await runHook('SessionEnd', stdin, {
      projectRoot: '/project',
      shell,
      fs,
    }, { hooksGlobal: undefined, profile: 'minimal', disabledHooks: undefined });

    expect(exitCode).toBe(0);
    expect(stdoutData).toContain(stdin);
  });

  it('exits 0 (no-op) when L1DDER_HOOKS=off', async () => {
    const shell = makeShell();
    const fs = makeFs();
    const stdin = '{"command":"git commit -m x"}';

    const exitCode = await runHook('PreToolUse', stdin, {
      projectRoot: '/project',
      shell,
      fs,
    }, { hooksGlobal: 'off' });

    expect(exitCode).toBe(0);
    expect(stdoutData).toContain(stdin);
  });

  it('exits 2 on pre-commit with --no-verify', async () => {
    const shell = makeShell();
    const fs = makeFs();
    const stdin = JSON.stringify({ command: 'git commit --no-verify -m "x"' });

    const exitCode = await runHook('PreToolUse', stdin, {
      projectRoot: '/project',
      shell,
      fs,
    }, { hooksGlobal: undefined, profile: 'minimal', disabledHooks: undefined });

    expect(exitCode).toBe(2);
    expect(stderrData).toContain('[L1DDER]');
  });

  it('exits 0 with warn (stderr) for doc-file-guard on protected path', async () => {
    const shell = makeShell();
    const fs = makeFs();
    const stdin = JSON.stringify({ path: 'knowledge/roadmap.md' });

    const exitCode = await runHook('PostToolUse', stdin, {
      projectRoot: '/project',
      shell,
      fs,
    }, { hooksGlobal: undefined, profile: 'standard', disabledHooks: undefined });

    expect(exitCode).toBe(0);
    expect(stderrData).toContain('[L1DDER]');
    expect(stdoutData.length).toBeGreaterThan(0);
  });
});
