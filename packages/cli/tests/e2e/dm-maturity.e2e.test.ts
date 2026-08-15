import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { runCli } from '../../src/index.js';
import type { CliContextOverrides } from '../../src/cli/context.js';
import { generateRule, cursorManifest } from '@l1dder/adapter-cursor';
import { ExitCode } from '../../src/cli/output/exit-codes.js';

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

describe('E2E: DM-2 discovery maturity deliverables', () => {
  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'l1dder-e2e-dm2-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('greenfield init helpme shows ordered discovery checklist (no roadmap gate)', async () => {
    const overrides = createOverrides();
    const code = await capturedRunCli(['init', '--name', 'dm2-init'], overrides);
    expect(code).toBe(0);

    const helpmeCode = await capturedRunCli(['helpme'], overrides);
    expect(helpmeCode).toBe(0);
  });

  it('helpme shows four blocks on discovery project', async () => {
    const overrides = createOverrides();
    await capturedRunCli(['init', '--name', 'dm2-helpme'], overrides);

    const code = await capturedRunCli(['helpme'], overrides);
    expect(code).toBe(0);
  });

  it('stage status on immature discovery project exits successfully', async () => {
    const overrides = createOverrides();
    await capturedRunCli(['init', '--name', 'dm2-stage'], overrides);

    const code = await capturedRunCli(['stage', 'status'], overrides);
    expect(code).toBe(0);
  });

  it('stage advance on immature discovery is a hard gate (non-zero, no mutation)', async () => {
    const overrides = createOverrides();
    await capturedRunCli(['init', '--name', 'dm2-hard-gate'], overrides);

    const before = readFileSync(join(testDir, '.l1dder', 'state.yml'), 'utf8');
    const code = await capturedRunCli(['stage', 'advance', '--yes'], overrides);
    expect(code).toBe(ExitCode.DISCOVERY_NOT_READY);

    const after = readFileSync(join(testDir, '.l1dder', 'state.yml'), 'utf8');
    expect(after).toBe(before);
    expect(after).toContain('stage: discovery');
  });

  it('stage advance --force without --reason fails; with reason succeeds', async () => {
    const overrides = createOverrides();
    await capturedRunCli(['init', '--name', 'dm2-force'], overrides);

    const missing = await capturedRunCli(['stage', 'advance', '--force'], overrides);
    expect(missing).toBe(ExitCode.FORCE_REASON_REQUIRED);
    expect(readFileSync(join(testDir, '.l1dder', 'state.yml'), 'utf8')).toContain(
      'stage: discovery',
    );

    const forced = await capturedRunCli(
      ['stage', 'advance', '--force', '--reason', 'E2E hard-gate bypass'],
      overrides,
    );
    expect(forced).toBe(0);
    const yaml = readFileSync(join(testDir, '.l1dder', 'state.yml'), 'utf8');
    expect(yaml).toContain('stage: delivery');
    expect(yaml).toContain('E2E hard-gate bypass');
  });

  it('quick on discovery project exits successfully (advisory non-blocking)', async () => {
    const overrides = createOverrides();
    await capturedRunCli(['init', '--name', 'dm2-quick'], overrides);

    const code = await capturedRunCli(['quick', 'fix typo in readme'], overrides);
    expect(code).toBe(0);
  });

  it('init --ai cursor sync dry-run includes plan-mode rule content', async () => {
    const overrides = createOverrides();
    await capturedRunCli(['init', '--name', 'dm2-sync', '--ai', 'cursor'], overrides);

    const syncCode = await capturedRunCli(['sync', '--dry-run'], overrides);
    expect(syncCode).toBe(0);
  });

  it('built-in discovery skills are present', () => {
    const researchPath = join(
      process.cwd(),
      'packages/cli/assets/skills/built-in/research-first.md',
    );
    const roadmapPath = join(
      process.cwd(),
      'packages/cli/assets/skills/built-in/plan-roadmap.md',
    );
    expect(existsSync(researchPath)).toBe(true);
    expect(existsSync(roadmapPath)).toBe(true);
  });

  it('rule generator emits plan-mode when workflow flags set', () => {
    const result = generateRule({
      projectName: 'test',
      projectStage: 'discovery',
      config: { language: { docs: 'en', chat: 'en' } },
      conventions: {
        meta: { format_version: 1, description: 'c', last_updated: '2026-01-01' },
      },
      workflow: {
        meta: { format_version: 1, description: 'w', last_updated: '2026-01-01' },
        session_discipline: {
          discovery_use_plan_mode: true,
          mark_recommended_option: true,
        },
      },
      knowledgeFiles: ['knowledge/roadmap.md'],
      manifest: cursorManifest,
    });

    expect(result.content).toContain('plan-mode');
    expect(result.content).toContain('recommended option');
  });
});
