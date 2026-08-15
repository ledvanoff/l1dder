import { describe, it, expect } from 'vitest';

import { InMemoryFileSystem, FixedClock, NullLogger } from '@l1dder/core/testing';

import { executeTransition } from './transition.js';
import { ExitCode } from '../output/exit-codes.js';
import { createColorPalette } from '../output/colors.js';
import { createFormatter } from '../output/formatter.js';
import { parseGlobals } from '../globals.js';
import { buildContext } from '../context.js';
import { NonInteractiveAdapter } from '../prompt/non-interactive-adapter.js';

const NOW = '2026-01-15T10:00:00Z';

function makeStateYml(overrides?: {
  phase?: string;
  status?: string;
  mode?: string;
}): string {
  const phase = overrides?.phase ?? 'idle';
  const status = overrides?.status ?? 'in_progress';
  const mode = overrides?.mode ?? 'main';

  return `schema_version: 1
project:
  name: "test-project"
  stage: delivery
  stage_history: []
  created_at: "${NOW}"
  updated_at: "${NOW}"
workflow:
  current_phase: ${phase}
  current_status: ${status}
  mode: ${mode}
  iteration: 1
  phase_history: []
  gate_history: []
tasks:
  items: []
quick_tasks: []
knowledge_updates: []
`;
}

const CONFIG_YML = `role_mode: solo
enforcement: open
`;

async function createTestCtx(opts?: {
  stateOverrides?: Parameters<typeof makeStateYml>[0];
  skipState?: boolean;
}) {
  const fs = new InMemoryFileSystem();
  const clock = new FixedClock(NOW);
  const logger = new NullLogger();
  const prompt = new NonInteractiveAdapter();
  const colors = createColorPalette(false);
  const output = createFormatter('human', colors);
  const cwd = '/test-project';
  const globals = parseGlobals({ cwd });

  if (!opts?.skipState) {
    await fs.mkdir('/test-project/.l1dder');
    await fs.writeFile('/test-project/.l1dder/state.yml', makeStateYml(opts?.stateOverrides));
    await fs.writeFile('/test-project/.l1dder/config.yml', CONFIG_YML);
  }

  return buildContext(globals, { fs, clock, logger, prompt, output, colors });
}

describe('executeTransition', () => {
  it('executes valid phase change (idle → specify)', async () => {
    const ctx = await createTestCtx({ stateOverrides: { phase: 'idle' } });

    const result = await executeTransition(ctx, { to: 'specify' });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toBeDefined();
    const data = result.data as { from: string; to: string; kind: string; forced: boolean; timestamp: string };
    expect(data.from).toBe('idle');
    expect(data.to).toBe('specify');
    expect(data.kind).toBe('forward');
    expect(data.forced).toBe(false);
    expect(data.timestamp).toBe(NOW);
    expect(result.humanText).toContain('Transition');
    expect(result.humanText).toContain('idle');
    expect(result.humanText).toContain('specify');
    expect(result.humanText).toContain('forward');
  });

  it('DF-022: historical phase alias suggests canonical name', async () => {
    const ctx = await createTestCtx({ stateOverrides: { phase: 'idle' } });

    const result = await executeTransition(ctx, {
      to: 'to_be_knowledge_update',
    });

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
    expect(result.error?.message).toBe(
      'Invalid phase: "to_be_knowledge_update"',
    );
    expect(result.error?.hint?.toLowerCase()).toContain('did you mean');
    expect(result.error?.hint).toContain('update_tobe');
  });

  it('DF-022: garbage phase keeps USAGE_ERROR without false alias', async () => {
    const ctx = await createTestCtx({ stateOverrides: { phase: 'idle' } });

    const result = await executeTransition(ctx, { to: 'not_a_phase_zzz' });

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
    expect(result.error?.message).toContain('Invalid phase');
    expect(result.error?.hint?.toLowerCase()).not.toContain('did you mean');
    expect(result.error?.hint).toContain('Valid phases');
  });

  it('--dry-run validates without writing', async () => {
    const ctx = await createTestCtx({ stateOverrides: { phase: 'idle' } });

    const result = await executeTransition(ctx, { to: 'specify', dryRun: true });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toBeDefined();
    const dryData = result.data as { from: string; to: string };
    expect(dryData.from).toBe('idle');
    expect(dryData.to).toBe('specify');
    expect(result.humanText).toContain('Dry run');
    expect(result.humanText).toContain('would succeed');

    // State should not have changed — still at idle
    const sm = await ctx.state();
    expect(sm.currentPosition().phase).toBe('idle');
  });

  it('forbidden transition returns exit 3', async () => {
    const ctx = await createTestCtx({ stateOverrides: { phase: 'idle' } });

    // idle → plan is not a valid transition (must go idle → specify first)
    const result = await executeTransition(ctx, { to: 'plan' });

    expect(result.exitCode).toBe(ExitCode.FORBIDDEN_TRANSITION);
    expect(result.error).toBeDefined();
    const errData = result.error as { code: string; hint?: string };
    expect(errData.code).toBe('FORBIDDEN_TRANSITION');
    expect(errData.hint).toBeDefined();
  });

  it('--json outputs TransitionOutputSchema shape', async () => {
    const ctx = await createTestCtx({ stateOverrides: { phase: 'idle' } });

    const result = await executeTransition(ctx, { to: 'specify' });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty('from');
    expect(data).toHaveProperty('to');
    expect(data).toHaveProperty('kind');
    expect(data).toHaveProperty('trigger');
    expect(data).toHaveProperty('forced');
    expect(data).toHaveProperty('timestamp');
    expect(data.trigger).toEqual({ kind: 'cli', command: 'l1dder transition --to specify' });
  });

  it('--force bypasses guards with --reason', async () => {
    const ctx = await createTestCtx({ stateOverrides: { phase: 'idle' } });

    const result = await executeTransition(ctx, {
      to: 'specify',
      force: true,
      reason: 'testing force',
    });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    const forceData = result.data as { forced: boolean };
    expect(forceData.forced).toBe(true);
    expect(result.humanText).toContain('yes');
  });

  it('--force without --reason returns FORCE_REASON_REQUIRED', async () => {
    const ctx = await createTestCtx({ stateOverrides: { phase: 'idle' } });

    const result = await executeTransition(ctx, { to: 'specify', force: true });

    expect(result.exitCode).toBe(ExitCode.FORCE_REASON_REQUIRED);
    expect((result.error as { message: string }).message).toContain('--reason');
  });

  it('DF-015: dry-run to specify fails on discovery when idea is still pending', async () => {
    const fs = new InMemoryFileSystem();
    const clock = new FixedClock(NOW);
    const logger = new NullLogger();
    const prompt = new NonInteractiveAdapter();
    const colors = createColorPalette(false);
    const output = createFormatter('human', colors);
    const cwd = '/test-project';
    const globals = parseGlobals({ cwd });

    await fs.mkdir(`${cwd}/.l1dder`);
    await fs.writeFile(
      `${cwd}/.l1dder/state.yml`,
      `schema_version: 2
project:
  name: "test-project"
  stage: discovery
  stage_history: []
  created_at: "${NOW}"
  updated_at: "${NOW}"
workflow:
  current_phase: idle
  current_status: in_progress
  mode: main
  profile: null
  iteration: 0
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
`,
    );
    await fs.writeFile(`${cwd}/.l1dder/config.yml`, CONFIG_YML);
    const ctx = buildContext(globals, { fs, clock, logger, prompt, output, colors });

    const dry = await executeTransition(ctx, { to: 'specify', dryRun: true });
    expect(dry.exitCode).toBe(ExitCode.DISCOVERY_NOT_READY);
    expect(dry.humanText ?? '').not.toContain('would succeed');

    const real = await executeTransition(ctx, { to: 'specify' });
    expect(real.exitCode).toBe(ExitCode.DISCOVERY_NOT_READY);

    const sm = await ctx.state();
    expect(sm.currentPosition().phase).toBe('idle');
  });

  it('missing --to returns exit 2', async () => {
    const ctx = await createTestCtx();

    const result = await executeTransition(ctx, {});

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
    expect((result.error as { message: string }).message).toContain('--to');
  });

  it('invalid phase returns exit 2', async () => {
    const ctx = await createTestCtx();

    const result = await executeTransition(ctx, { to: 'nonexistent_phase' });

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
    const errMsg = (result.error as { message: string }).message;
    expect(errMsg).toContain('Invalid phase');
    expect(errMsg).toContain('nonexistent_phase');
  });

  it('--trigger-source slash without --slash-command returns exit 2', async () => {
    const ctx = await createTestCtx();

    const result = await executeTransition(ctx, {
      to: 'specify',
      triggerSource: 'slash',
    });

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
    expect((result.error as { message: string }).message).toContain('--slash-command');
  });

  it('returns exit 8 when not initialized', async () => {
    const ctx = await createTestCtx({ skipState: true });

    const result = await executeTransition(ctx, { to: 'specify' });

    expect(result.exitCode).toBe(ExitCode.NOT_INITIALIZED);
    expect(result.error).toBeDefined();
    const initErr = result.error as { code: string; hint?: string };
    expect(initErr.code).toBe('NOT_INITIALIZED');
    expect(initErr.hint).toContain('l1dder init');
  });

  it('slash trigger populates trigger.command from --slash-command', async () => {
    const ctx = await createTestCtx({ stateOverrides: { phase: 'idle' } });

    const result = await executeTransition(ctx, {
      to: 'specify',
      triggerSource: 'slash',
      slashCommand: 'specify',
    });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    const slashData = result.data as { trigger: { kind: string; command: string } };
    expect(slashData.trigger).toEqual({ kind: 'slash', command: 'specify' });
  });

  it('invalid trigger source returns exit 2', async () => {
    const ctx = await createTestCtx();

    const result = await executeTransition(ctx, {
      to: 'specify',
      triggerSource: 'bogus',
    });

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
    expect((result.error as { message: string }).message).toContain('Invalid trigger source');
  });
});
