/**
 * E2E tests for EH-2 — hooks generation and dispatcher (T-09).
 *
 * Real-FS tests use runCli (in-process). Note: in the sandbox environment,
 * writes to `.cursor/` are blocked (EPERM). hooks.json structure is covered
 * in hooks-generator.test.ts (unit) and cursor-adapter.integration.test.ts.
 *
 * In-memory tests use runHook + InMemoryFileSystem and are unrestricted.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { runCli } from '../../src/index.js';
import { InMemoryFileSystem } from '@l1dder/core/testing';
import { runHook } from '../../src/cli/commands/hook/run-hook.js';
import type { ShellPort, ShellResult } from '@l1dder/core';

const TEST_ROOT = join(process.cwd(), '.tmp');

let testDir: string;

function capturedRunCli(args: string[]): Promise<number> {
  const baseArgs = ['node', 'l1dder', '--cwd', testDir, '--no-prompt', '--no-color'];
  return runCli([...baseArgs, ...args], {
    prompt: {
      confirm: () => Promise.resolve(true),
      input: () => Promise.resolve('hooks-e2e-project'),
      select: <T extends string>(_m: string, choices: readonly { value: T }[]) =>
        Promise.resolve(choices[0]?.value ?? ('en' as T)),
    },
  });
}

// ─── CLI lifecycle tests (real FS) ───────────────────────────────────────────

describe('E2E: hooks — init + sync lifecycle', () => {
  beforeEach(() => {
    mkdirSync(TEST_ROOT, { recursive: true });
    testDir = mkdtempSync(join(TEST_ROOT, 'l1dder-e2e-hooks-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('init --ai cursor succeeds (exit 0) even when sandbox blocks .cursor/ writes', async () => {
    // Adapter errors are non-fatal: init returns 0 regardless of .cursor/ write errors
    const exitCode = await capturedRunCli(['init', '--name', 'hooks-test', '--ai', 'cursor']);
    expect(exitCode).toBe(0);
    // .l1dder/ base structure is always created (sandbox allows this)
    expect(existsSync(join(testDir, '.l1dder', 'state.yml'))).toBe(true);
    expect(existsSync(join(testDir, '.l1dder', 'config.yml'))).toBe(true);
  });

  it('sync --dry-run with adapter config succeeds after init --ai cursor', async () => {
    await capturedRunCli(['init', '--name', 'hooks-test', '--ai', 'cursor']);

    const exitCode = await capturedRunCli(['sync', '--dry-run']);
    expect(exitCode).toBe(0);
  });

  it('init persists adapter: cursor in config.yml so sync can regenerate hooks', async () => {
    await capturedRunCli(['init', '--name', 'hooks-test', '--ai', 'cursor']);

    const config = readFileSync(join(testDir, '.l1dder', 'config.yml'), 'utf-8');
    expect(config).toContain('adapters:');
    expect(config).toContain('- cursor');
  });
});

// ─── In-memory dispatcher tests (no sandbox restriction) ─────────────────────

describe('E2E: hook PreCompact → generates handoff.md', () => {
  it('creates .l1dder/handoff.md on PreCompact dispatch', async () => {
    const fs = new InMemoryFileSystem();
    const shell = createFakeShell();

    const stateYml = [
      'schema_version: 1',
      'project:',
      '  name: e2e-hooks-test',
      '  stage: delivery',
      '  created_at: "2026-06-01T00:00:00Z"',
      '  updated_at: "2026-06-23T00:00:00Z"',
      'workflow:',
      '  current_phase: implement',
      '  current_status: in_progress',
      '',
    ].join('\n');
    await fs.writeFile('/project/.l1dder/state.yml', stateYml);

    const exitCode = await runHook(
      'PreCompact',
      '{}',
      { projectRoot: '/project', shell, fs },
      { hooksGlobal: undefined, profile: undefined, disabledHooks: undefined },
    );

    expect(exitCode).toBe(0);

    const handoffExists = await fs.exists('/project/.l1dder/handoff.md');
    expect(handoffExists).toBe(true);

    const content = await fs.readFile('/project/.l1dder/handoff.md');
    expect(content).toContain('## Контекст сессии');
    expect(content).toContain('## Текущее состояние');
    expect(content).toContain('## Следующие шаги');
    expect(content).toContain('e2e-hooks-test');
  });

  it('creates fallback handoff.md even when state.yml is missing', async () => {
    const fs = new InMemoryFileSystem();
    const shell = createFakeShell();

    const exitCode = await runHook(
      'PreCompact',
      '{}',
      { projectRoot: '/project', shell, fs },
      { hooksGlobal: undefined, profile: undefined, disabledHooks: undefined },
    );

    expect(exitCode).toBe(0);

    const handoffExists = await fs.exists('/project/.l1dder/handoff.md');
    expect(handoffExists).toBe(true);

    const content = await fs.readFile('/project/.l1dder/handoff.md');
    // Fallback always has 3 sections
    expect(content).toContain('## Контекст сессии');
    expect(content).toContain('## Текущее состояние');
    expect(content).toContain('## Следующие шаги');
  });
});

// ─── Pre-commit guard E2E tests ───────────────────────────────────────────────

describe('E2E: hook PreToolUse git commit with secret → exit 2', () => {
  it('blocks git commit with secret key in staged diff', async () => {
    const fs = new InMemoryFileSystem();
    const secretDiff = 'AKIA1234567890ABCDEF some aws key';
    const shell = createFakeShellWithDiff(secretDiff);

    const payload = JSON.stringify({
      command: 'git commit -m "feat: add feature"',
    });

    const exitCode = await runHook(
      'PreToolUse',
      payload,
      { projectRoot: '/project', shell, fs },
      { hooksGlobal: undefined, profile: 'standard', disabledHooks: undefined },
    );

    expect(exitCode).toBe(2);
  });

  it('allows clean git commit with no secrets', async () => {
    const fs = new InMemoryFileSystem();
    const shell = createFakeShellWithDiff('console.log("hello world");\n');

    const payload = JSON.stringify({
      command: 'git commit -m "feat: add feature"',
    });

    const exitCode = await runHook(
      'PreToolUse',
      payload,
      { projectRoot: '/project', shell, fs },
      { hooksGlobal: undefined, profile: 'standard', disabledHooks: undefined },
    );

    expect(exitCode).toBe(0);
  });

  it('blocks git commit --no-verify bypass', async () => {
    const fs = new InMemoryFileSystem();
    const shell = createFakeShellWithDiff('safe content');

    const payload = JSON.stringify({
      command: 'git commit --no-verify -m "bypass"',
    });

    const exitCode = await runHook(
      'PreToolUse',
      payload,
      { projectRoot: '/project', shell, fs },
      { hooksGlobal: undefined, profile: 'standard', disabledHooks: undefined },
    );

    expect(exitCode).toBe(2);
  });
});

// ─── Kill-switch ──────────────────────────────────────────────────────────────

describe('E2E: L1DDER_HOOKS=off disables all hooks', () => {
  it('passes through even a commit with secret when L1DDER_HOOKS=off', async () => {
    const fs = new InMemoryFileSystem();
    const secretDiff = 'AKIA1234567890ABCDEF some aws key';
    const shell = createFakeShellWithDiff(secretDiff);

    const payload = JSON.stringify({ command: 'git commit -m "feat: test"' });

    const exitCode = await runHook(
      'PreToolUse',
      payload,
      { projectRoot: '/project', shell, fs },
      { hooksGlobal: 'off', profile: 'standard', disabledHooks: undefined },
    );

    expect(exitCode).toBe(0);
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createFakeShell(): ShellPort {
  return {
    exec: (_cmd: string): Promise<ShellResult> =>
      Promise.resolve({ exitCode: 0, stdout: '', stderr: '' }),
  };
}

function createFakeShellWithDiff(diffOutput: string): ShellPort {
  return {
    exec: (cmd: string): Promise<ShellResult> => {
      if (cmd.includes('diff --staged') || cmd.includes('diff --cached')) {
        return Promise.resolve({ exitCode: 0, stdout: diffOutput, stderr: '' });
      }
      return Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });
    },
  };
}
