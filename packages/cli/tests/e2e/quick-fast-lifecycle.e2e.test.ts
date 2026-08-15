import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parse as parseYaml } from 'yaml';

import { runCli } from '../../src/index.js';
import type { CliContextOverrides } from '../../src/cli/context.js';
import { ExitCode } from '../../src/cli/output/exit-codes.js';

let testDir: string;

function createOverrides(): CliContextOverrides {
  return {
    prompt: {
      confirm: () => Promise.resolve(true),
      input: () => Promise.resolve('quick-fast-e2e'),
      select: <T extends string>(_m: string, choices: readonly { value: T }[]) =>
        Promise.resolve(choices[0]?.value ?? ('en' as T)),
    },
  };
}

function capturedRunCli(
  args: string[],
  overrides?: CliContextOverrides,
): Promise<number> {
  const baseArgs = ['node', 'l1dder', '--cwd', testDir, '--no-prompt', '--no-color'];
  return runCli([...baseArgs, ...args], overrides);
}

function readWorkflow(): { phase: string; mode: string } {
  const raw = readFileSync(join(testDir, '.l1dder', 'state.yml'), 'utf-8');
  const parsed = parseYaml(raw) as {
    workflow: { current_phase: string; mode: string };
  };
  return {
    phase: parsed.workflow.current_phase,
    mode: parsed.workflow.mode,
  };
}

describe('E2E DF-029: quick/fast lifecycle returns to idle/main', () => {
  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'l1dder-e2e-qf-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('walks the full quick and fast phase cycles via transition before finish', async () => {
    const overrides = createOverrides();

    expect(await capturedRunCli(['init', '--name', 'qf-e2e', '--existing'], overrides)).toBe(
      0,
    );

    // Quick full cycle: idle → quick_plan → quick_implement → quick_complete → idle
    expect(await capturedRunCli(['quick', 'fix null check'], overrides)).toBe(0);
    expect(readWorkflow()).toMatchObject({ phase: 'quick_plan', mode: 'quick' });

    expect(
      await capturedRunCli(['transition', '--to', 'quick_implement'], overrides),
    ).toBe(0);
    expect(readWorkflow()).toMatchObject({
      phase: 'quick_implement',
      mode: 'quick',
    });

    expect(
      await capturedRunCli(['transition', '--to', 'quick_complete'], overrides),
    ).toBe(0);
    expect(readWorkflow()).toMatchObject({
      phase: 'quick_complete',
      mode: 'quick',
    });

    expect(await capturedRunCli(['quick', '--finish'], overrides)).toBe(0);
    expect(readWorkflow()).toMatchObject({ phase: 'idle', mode: 'main' });

    // Fast full cycle: idle → fast_implement → fast_complete → idle
    expect(await capturedRunCli(['fast', 'patch typo'], overrides)).toBe(0);
    expect(readWorkflow()).toMatchObject({
      phase: 'fast_implement',
      mode: 'fast',
    });

    expect(
      await capturedRunCli(['transition', '--to', 'fast_complete'], overrides),
    ).toBe(0);
    expect(readWorkflow()).toMatchObject({
      phase: 'fast_complete',
      mode: 'fast',
    });

    expect(await capturedRunCli(['fast', '--finish'], overrides)).toBe(0);
    expect(readWorkflow()).toMatchObject({ phase: 'idle', mode: 'main' });
  });

  it('allows finishing quick directly from quick_plan (shortcut path)', async () => {
    const overrides = createOverrides();

    expect(await capturedRunCli(['init', '--name', 'qf-shortcut', '--existing'], overrides)).toBe(
      0,
    );

    expect(await capturedRunCli(['quick', 'shortcut finish'], overrides)).toBe(0);
    expect(readWorkflow()).toMatchObject({ phase: 'quick_plan', mode: 'quick' });

    expect(await capturedRunCli(['quick', '--finish'], overrides)).toBe(0);
    expect(readWorkflow()).toMatchObject({ phase: 'idle', mode: 'main' });

    expect(await capturedRunCli(['fast', 'shortcut finish'], overrides)).toBe(0);
    expect(readWorkflow()).toMatchObject({
      phase: 'fast_implement',
      mode: 'fast',
    });

    expect(await capturedRunCli(['fast', '--finish'], overrides)).toBe(0);
    expect(readWorkflow()).toMatchObject({ phase: 'idle', mode: 'main' });
  });

  it('rejects starting quick/fast outside idle with FORBIDDEN_TRANSITION', async () => {
    const overrides = createOverrides();

    expect(await capturedRunCli(['init', '--name', 'qf-reject', '--existing'], overrides)).toBe(
      0,
    );
    expect(await capturedRunCli(['quick', 'first task'], overrides)).toBe(0);

    const quickAgain = await capturedRunCli(['quick', 'second task'], overrides);
    expect(quickAgain).toBe(ExitCode.FORBIDDEN_TRANSITION);

    const fastWhileQuick = await capturedRunCli(['fast', 'not allowed'], overrides);
    expect(fastWhileQuick).toBe(ExitCode.FORBIDDEN_TRANSITION);

    // Recover, then reject fast start from a non-idle fast phase similarly.
    expect(await capturedRunCli(['quick', '--finish'], overrides)).toBe(0);
    expect(await capturedRunCli(['fast', 'ok'], overrides)).toBe(0);
    const fastAgain = await capturedRunCli(['fast', 'again'], overrides);
    expect(fastAgain).toBe(ExitCode.FORBIDDEN_TRANSITION);
  });
});
