import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { readFile as readFileAsync } from 'node:fs/promises';

import { runCli } from '../../src/index.js';
import type { CliContextOverrides } from '../../src/cli/context.js';

let testDir: string;
const TEST_ROOT = join(process.cwd(), '.tmp');

function createOverrides(): CliContextOverrides {
  return {
    prompt: {
      confirm: () => Promise.resolve(true),
      input: () => Promise.resolve('cross-harness'),
      select: <T extends string>(_m: string, choices: readonly { value: T }[]) =>
        Promise.resolve(choices[0]?.value ?? ('en' as T)),
    },
  };
}

function capturedRunCli(args: string[], overrides?: CliContextOverrides): Promise<number> {
  const baseArgs = ['node', 'l1dder', '--cwd', testDir, '--no-prompt', '--no-color'];
  return runCli([...baseArgs, ...args], overrides);
}

describe('E2E: cross-harness dual-target init/sync', () => {
  beforeEach(() => {
    mkdirSync(TEST_ROOT, { recursive: true });
    testDir = mkdtempSync(join(TEST_ROOT, 'l1dder-e2e-cross-harness-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('init --ai cursor --ai claude persists adapters and universal AGENTS.md', async () => {
    const overrides = createOverrides();

    const exitCode = await capturedRunCli(
      ['init', '--name', 'cross-harness', '--ai', 'cursor', '--ai', 'claude'],
      overrides,
    );

    expect(exitCode).toBe(0);
    expect(existsSync(join(testDir, '.l1dder', 'state.yml'))).toBe(true);
    expect(existsSync(join(testDir, 'AGENTS.md'))).toBe(true);

    const config = await readFileAsync(join(testDir, '.l1dder', 'config.yml'), 'utf-8');
    expect(config).toContain('- cursor');
    expect(config).toContain('- claude');

    const gitignore = await readFileAsync(join(testDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.l1dder/install-state.yml');
  });

  it('sync --dry-run reports plan for configured dual targets', async () => {
    const overrides = createOverrides();

    await capturedRunCli(
      ['init', '--name', 'cross-harness', '--ai', 'cursor,claude'],
      overrides,
    );

    const syncCode = await capturedRunCli(['sync', '--dry-run'], overrides);
    expect(syncCode).toBe(0);
  });

  it('repeat sync dry-run stays idempotent after dual-target init', async () => {
    const overrides = createOverrides();

    await capturedRunCli(
      ['init', '--name', 'cross-harness', '--ai', 'cursor', '--ai', 'claude'],
      overrides,
    );

    const first = await capturedRunCli(['sync', '--dry-run'], overrides);
    const second = await capturedRunCli(['sync', '--dry-run'], overrides);
    expect(first).toBe(0);
    expect(second).toBe(0);
  });
});
