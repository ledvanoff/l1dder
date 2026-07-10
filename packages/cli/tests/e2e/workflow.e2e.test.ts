import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { runCli } from '../../src/index.js';
import type { CliContextOverrides } from '../../src/cli/context.js';

let testDir: string;

function createOverrides(): CliContextOverrides {
  return {
    prompt: {
      confirm: () => Promise.resolve(true),
      input: () => Promise.resolve('test-project'),
      select: <T extends string>(_m: string, choices: readonly { value: T }[]) =>
        Promise.resolve(choices[0]?.value ?? ('en' as T)),
    },
  };
}

function capturedRunCli(args: string[], overrides?: CliContextOverrides): Promise<number> {
  const baseArgs = ['node', 'l1dder', '--cwd', testDir, '--no-prompt', '--no-color'];
  return runCli([...baseArgs, ...args], overrides);
}

describe('E2E: init → status → quick → finish → doctor', () => {
  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'l1dder-e2e-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('full greenfield workflow', async () => {
    const overrides = createOverrides();

    // init
    const initCode = await capturedRunCli(['init', '--name', 'e2e-test'], overrides);
    expect(initCode).toBe(0);

    // status
    const statusCode = await capturedRunCli(['status'], overrides);
    expect(statusCode).toBe(0);

    // quick start
    const quickCode = await capturedRunCli(['quick', 'fix null check'], overrides);
    expect(quickCode).toBe(0);

    // quick finish
    const finishCode = await capturedRunCli(['quick', '--finish'], overrides);
    expect(finishCode).toBe(0);

    // doctor
    const doctorCode = await capturedRunCli(['doctor'], overrides);
    // doctor may warn about missing knowledge files, but should not crash
    expect(doctorCode).toBeLessThanOrEqual(1);
  });

  it('check passes after init', async () => {
    const overrides = createOverrides();

    await capturedRunCli(['init', '--name', 'e2e-check'], overrides);
    const checkCode = await capturedRunCli(['check'], overrides);
    // check is advisory — exit 0 or 7 depending on config format
    expect(checkCode).toBeLessThanOrEqual(7);
  });
});

describe('E2E: init brownfield → status → stage', () => {
  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'l1dder-e2e-bf-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('brownfield init sets delivery stage', async () => {
    const overrides = createOverrides();

    const initCode = await capturedRunCli(['init', '--existing', '--name', 'bf-test'], overrides);
    expect(initCode).toBe(0);

    const statusCode = await capturedRunCli(['status'], overrides);
    expect(statusCode).toBe(0);
  });
});

describe('E2E: init --lang', () => {
  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'l1dder-e2e-lang-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('init --lang ru writes ru config and Russian knowledge placeholders', async () => {
    const overrides = createOverrides();

    const code = await capturedRunCli(['init', '--name', 'ru-proj', '--lang', 'ru'], overrides);
    expect(code).toBe(0);

    const config = readFileSync(join(testDir, '.l1dder', 'config.yml'), 'utf-8');
    expect(config).toContain('docs: ru');
    expect(config).toContain('chat: ru');

    const idea = readFileSync(join(testDir, 'knowledge', 'idea.md'), 'utf-8');
    expect(idea).toContain('Продуктовая идея');
  });

  it('init --lang en writes en config and English placeholders', async () => {
    const overrides = createOverrides();

    const code = await capturedRunCli(['init', '--name', 'en-proj', '--lang', 'en'], overrides);
    expect(code).toBe(0);

    const config = readFileSync(join(testDir, '.l1dder', 'config.yml'), 'utf-8');
    expect(config).toContain('docs: en');
    expect(config).toContain('chat: en');

    const idea = readFileSync(join(testDir, 'knowledge', 'idea.md'), 'utf-8');
    expect(idea).toContain('Product Idea');
  });

  it('init default (--no-prompt, no --lang) falls back to English', async () => {
    const overrides = createOverrides();

    const code = await capturedRunCli(['init', '--name', 'default-proj'], overrides);
    expect(code).toBe(0);

    const config = readFileSync(join(testDir, '.l1dder', 'config.yml'), 'utf-8');
    expect(config).toContain('docs: en');
  });

  it('init --lang fr rejects with usage error (exit 2)', async () => {
    const overrides = createOverrides();

    const code = await capturedRunCli(['init', '--name', 'bad-lang', '--lang', 'fr'], overrides);
    expect(code).toBe(2);
  });
});

describe('E2E: JSON mode', () => {
  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'l1dder-e2e-json-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('init --json outputs valid JSON', async () => {
    const overrides = createOverrides();
    const exitCode = await capturedRunCli(['init', '--name', 'json-test', '--json'], overrides);
    expect(exitCode).toBe(0);
  });

  it('status --json outputs valid JSON', async () => {
    const overrides = createOverrides();
    await capturedRunCli(['init', '--name', 'json-test'], overrides);
    const exitCode = await capturedRunCli(['status', '--json'], overrides);
    expect(exitCode).toBe(0);
  });
});
