import { describe, it, expect, vi } from 'vitest';
import type { ShellResult, ShellPort, FileSystemPort } from '@l1dder/core';
import type { HookResult } from '@l1dder/schemas';
import { preCommitGuardHandler } from './pre-commit-guard.js';
import { docFileGuardHandler } from './doc-file-guard.js';
import { formatAfterEditHandler } from './format-after-edit.js';
import { strategicCompactReminderHandler } from './strategic-compact-reminder.js';

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

const baseDeps = {
  projectRoot: '/project',
  shell: makeShell(),
  fs: makeFs(),
};

// ─── pre-commit-guard ─────────────────────────────────────────────────────────

describe('preCommitGuardHandler', () => {
  it('allows non-git commands', async () => {
    const result: HookResult = await preCommitGuardHandler(
      { event: 'PreToolUse', command: 'npm install' },
      baseDeps,
    );
    expect(result.outcome).toBe('allow');
  });

  it('blocks --no-verify bypass', async () => {
    const result: HookResult = await preCommitGuardHandler(
      { event: 'PreToolUse', command: 'git commit --no-verify -m "x"' },
      baseDeps,
    );
    expect(result.outcome).toBe('block');
    expect(result.messages.some((m: string) => m.includes('--no-verify'))).toBe(true);
  });

  it('blocks when staged diff contains a secret', async () => {
    const shell = makeShell((cmd) =>
      Promise.resolve(
        cmd.includes('diff --cached')
          ? { stdout: 'export KEY=sk-abcdefghijklmnopqrstuvwxyz12345', stderr: '', exitCode: 0 }
          : { stdout: '', stderr: '', exitCode: 0 },
      ),
    );

    const result: HookResult = await preCommitGuardHandler(
      { event: 'PreToolUse', command: 'git commit -m "feat: x"' },
      { ...baseDeps, shell },
    );
    expect(result.outcome).toBe('block');
    expect(result.messages.some((m: string) => m.includes('secret'))).toBe(true);
  });

  it('warns on non-conventional commit message', async () => {
    const shell = makeShell((cmd) =>
      Promise.resolve(
        cmd.includes('diff --cached')
          ? { stdout: '', stderr: '', exitCode: 0 }
          : { stdout: '', stderr: '', exitCode: 0 },
      ),
    );

    const result: HookResult = await preCommitGuardHandler(
      { event: 'PreToolUse', command: 'git commit -m "updated stuff"' },
      { ...baseDeps, shell },
    );
    expect(result.outcome).toBe('warn');
    expect(result.messages.some((m: string) => m.includes('Conventional Commits'))).toBe(true);
  });

  it('allows clean conventional commit', async () => {
    const shell = makeShell((cmd) =>
      Promise.resolve(
        cmd.includes('diff --cached')
          ? { stdout: '+ const x = 1;', stderr: '', exitCode: 0 }
          : { stdout: '', stderr: '', exitCode: 0 },
      ),
    );

    const result: HookResult = await preCommitGuardHandler(
      { event: 'PreToolUse', command: 'git commit -m "feat: add hooks"' },
      { ...baseDeps, shell },
    );
    expect(result.outcome).toBe('allow');
  });
});

// ─── doc-file-guard ───────────────────────────────────────────────────────────

describe('docFileGuardHandler', () => {
  it('warns on PostToolUse for protected path', async () => {
    const result: HookResult = await docFileGuardHandler(
      { event: 'PostToolUse', filePath: 'knowledge/roadmap.md' },
      baseDeps,
    );
    expect(result.outcome).toBe('warn');
    expect(result.messages.some((m: string) => m.includes('knowledge/'))).toBe(true);
  });

  it('allows PostToolUse for non-protected path', async () => {
    const result: HookResult = await docFileGuardHandler(
      { event: 'PostToolUse', filePath: 'packages/core/src/index.ts' },
      baseDeps,
    );
    expect(result.outcome).toBe('allow');
  });

  it('blocks commit touching protected file', async () => {
    const shell = makeShell((cmd) =>
      Promise.resolve(
        cmd.includes('name-only')
          ? { stdout: 'knowledge/roadmap.md\npackages/core/index.ts', stderr: '', exitCode: 0 }
          : { stdout: '', stderr: '', exitCode: 0 },
      ),
    );

    const result: HookResult = await docFileGuardHandler(
      { event: 'PreToolUse', command: 'git commit -m "feat: x"' },
      { ...baseDeps, shell },
    );
    expect(result.outcome).toBe('block');
    expect(result.messages.some((m: string) => m.includes('knowledge/roadmap.md'))).toBe(true);
  });

  it('allows commit that does not touch protected files', async () => {
    const shell = makeShell((cmd) =>
      Promise.resolve(
        cmd.includes('name-only')
          ? { stdout: 'packages/core/src/index.ts', stderr: '', exitCode: 0 }
          : { stdout: '', stderr: '', exitCode: 0 },
      ),
    );

    const result: HookResult = await docFileGuardHandler(
      { event: 'PreToolUse', command: 'git commit -m "feat: x"' },
      { ...baseDeps, shell },
    );
    expect(result.outcome).toBe('allow');
  });
});

// ─── format-after-edit ────────────────────────────────────────────────────────

describe('formatAfterEditHandler', () => {
  it('allows non-ts/md files', async () => {
    const result: HookResult = await formatAfterEditHandler(
      { event: 'PostToolUse', filePath: 'package.json' },
      baseDeps,
    );
    expect(result.outcome).toBe('allow');
  });

  it('warns on .ts file when tsc finds issues', async () => {
    const shell = makeShell((cmd) =>
      Promise.resolve(
        cmd.includes('tsc')
          ? { stdout: 'src/index.ts(1,1): error TS2345: ...\n', stderr: '', exitCode: 1 }
          : { stdout: '', stderr: '', exitCode: 0 },
      ),
    );

    const result: HookResult = await formatAfterEditHandler(
      { event: 'PostToolUse', filePath: 'packages/core/src/index.ts' },
      { ...baseDeps, shell },
    );
    expect(result.outcome).toBe('warn');
  });

  it('allows .ts file when no issues found', async () => {
    const shell = makeShell(() => Promise.resolve({ stdout: '', stderr: '', exitCode: 0 }));

    const result: HookResult = await formatAfterEditHandler(
      { event: 'PostToolUse', filePath: 'packages/core/src/index.ts' },
      { ...baseDeps, shell },
    );
    expect(result.outcome).toBe('allow');
  });
});

// ─── strategic-compact-reminder ───────────────────────────────────────────────

describe('strategicCompactReminderHandler', () => {
  it('allows when count is below threshold', async () => {
    const fs = makeFs({
      readFile: vi.fn().mockResolvedValue(JSON.stringify({ count: 5, lastWarned: 0 })),
    });

    const result: HookResult = await strategicCompactReminderHandler(
      { event: 'UserPromptSubmit', conversationId: 'test-session' },
      { ...baseDeps, fs },
    );
    expect(result.outcome).toBe('allow');
  });

  it('warns when count reaches threshold', async () => {
    const fs = makeFs({
      readFile: vi.fn().mockResolvedValue(JSON.stringify({ count: 29, lastWarned: 0 })),
    });

    const result: HookResult = await strategicCompactReminderHandler(
      { event: 'UserPromptSubmit', conversationId: 'test-session' },
      { ...baseDeps, fs },
    );
    expect(result.outcome).toBe('warn');
    expect(result.messages.some((m: string) => m.includes('prompts'))).toBe(true);
  });

  it('allows when already warned at the same threshold', async () => {
    const fs = makeFs({
      readFile: vi.fn().mockResolvedValue(JSON.stringify({ count: 35, lastWarned: 30 })),
    });

    const result: HookResult = await strategicCompactReminderHandler(
      { event: 'UserPromptSubmit', conversationId: 'test-session' },
      { ...baseDeps, fs },
    );
    // count becomes 36, lastWarned=30, diff=6 < 30 → no warn.
    expect(result.outcome).toBe('allow');
  });
});
