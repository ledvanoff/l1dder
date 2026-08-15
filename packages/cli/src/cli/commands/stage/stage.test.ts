import { describe, it, expect } from 'vitest';
import { DISCOVERY_MILESTONE_ORDER } from '@l1dder/core';
import { InMemoryFileSystem, FixedClock, NullLogger } from '@l1dder/core/testing';

import { executeStage } from './stage.js';
import { ExitCode } from '../../output/exit-codes.js';
import { createColorPalette } from '../../output/colors.js';
import { createFormatter } from '../../output/formatter.js';
import { parseGlobals } from '../../globals.js';
import { buildContext } from '../../context.js';
import { NonInteractiveAdapter } from '../../prompt/non-interactive-adapter.js';

const NOW = '2026-01-15T10:00:00Z';

interface StageError {
  code: string;
  message: string;
  hint?: string;
}

function makeStateYml(overrides?: {
  stage?: string;
  phase?: string;
  stageHistory?: Array<{ from: string; to: string; timestamp: string; reason?: string }>;
  decisions?: Array<{ id: string; title: string; rationale: string }>;
}): string {
  const stage = overrides?.stage ?? 'discovery';
  const phase = overrides?.phase ?? 'idle';
  const stageHistory = overrides?.stageHistory ?? [];
  const decisions = overrides?.decisions ?? [];

  const historyLines = stageHistory.length > 0
    ? stageHistory.map((h) =>
        `    - from: ${h.from}\n      to: ${h.to}\n      timestamp: "${h.timestamp}"${h.reason ? `\n      reason: "${h.reason}"` : ''}`,
      ).join('\n')
    : '    []';

  const decisionLines = decisions.length > 0
    ? decisions.map((d) =>
        `  - id: "${d.id}"\n    title: "${d.title}"\n    rationale: "${d.rationale}"\n    alternatives: []\n    status: accepted\n    timestamp: "${NOW}"`,
      ).join('\n')
    : '  []';

  return `schema_version: 2
project:
  name: "test-project"
  stage: ${stage}
  stage_history:
${historyLines}
  created_at: "${NOW}"
  updated_at: "${NOW}"
workflow:
  current_phase: ${phase}
  current_status: in_progress
  mode: main
  profile: null
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
decisions:
${decisionLines}
`;
}

const CONFIG_YML = `schema_version: 1
role_mode: solo
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

describe('executeStage — status subcommand', () => {
  it('shows the ordered 7-milestone discovery checklist (no roadmap)', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'discovery' },
    });

    const result = await executeStage(ctx, 'status', {});

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    const data = result.data as {
      stage: string;
      readiness: { score: string; criteria: Array<{ id: string; met: boolean }> };
    };
    expect(data.stage).toBe('discovery');
    expect(data.readiness.criteria.map((c) => c.id)).toEqual([
      ...DISCOVERY_MILESTONE_ORDER,
    ]);
    expect(data.readiness.criteria.every((c) => !c.met)).toBe(true);
    expect(result.humanText).toContain('Discovery Checklist');
    expect(result.humanText).toContain('NOT READY');
  });

  it('shows already at final stage for maintenance', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'maintenance' },
    });

    const result = await executeStage(ctx, 'status', {});

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    const data = result.data as {
      stage: string;
      readiness: { score: string; criteria: unknown[] };
    };
    expect(data.stage).toBe('maintenance');
    expect(data.readiness.criteria.length).toBe(0);
    expect(result.humanText).toContain('final stage');
  });

  it('defaults to status when no subcommand', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'delivery' },
    });

    const result = await executeStage(ctx, undefined, {});

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    const data = result.data as { stage: string };
    expect(data.stage).toBe('delivery');
  });

  it('shows stage history entries', async () => {
    const ctx = await createTestCtx({
      stateOverrides: {
        stage: 'delivery',
        stageHistory: [
          { from: 'discovery', to: 'delivery', timestamp: '2025-01-15T00:00:00Z', reason: 'Ready' },
        ],
      },
    });

    const result = await executeStage(ctx, 'status', {});

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    const data = result.data as { history: Array<{ from: string; to: string }> };
    expect(data.history).toHaveLength(1);
    expect(result.humanText).toContain('Ready');
  });

  it('returns exit 8 when not initialized', async () => {
    const ctx = await createTestCtx({ skipState: true });

    const result = await executeStage(ctx, 'status', {});

    expect(result.exitCode).toBe(ExitCode.NOT_INITIALIZED);
    expect(result.error).toBeDefined();
  });
});

describe('executeStage — advance subcommand (hard gate)', () => {
  // @tc TC-012-04-A
  it('blocks advance when checklist incomplete (no mutation)', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'discovery' },
    });

    const result = await executeStage(ctx, 'advance', { yes: true });

    expect(result.exitCode).toBe(ExitCode.DISCOVERY_NOT_READY);
    expect(result.humanText).toContain('NOT READY');

    const sm = await ctx.state();
    expect(sm.stateSnapshot().project.stage).toBe('discovery');
  });

  it('--force without --reason returns FORCE_REASON_REQUIRED', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'discovery' },
    });

    const result = await executeStage(ctx, 'advance', { force: true });

    expect(result.exitCode).toBe(ExitCode.FORCE_REASON_REQUIRED);
    const err = result.error as StageError;
    expect(err.message).toContain('--reason');
  });

  it('--force --reason bypasses readiness and records Decision', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'discovery' },
    });

    const result = await executeStage(ctx, 'advance', {
      force: true,
      reason: 'Demo deployment',
    });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    const data = result.data as { from: string; to: string; forced: boolean };
    expect(data.from).toBe('discovery');
    expect(data.to).toBe('delivery');
    expect(data.forced).toBe(true);

    const sm = await ctx.state();
    const decisions = sm.stateSnapshot().decisions;
    expect(decisions.some((d) => d.rationale === 'Demo deployment')).toBe(true);
  });

  it('rejects advance when already at maintenance', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'maintenance' },
    });

    const result = await executeStage(ctx, 'advance', { yes: true });

    expect(result.exitCode).toBe(ExitCode.GENERIC_ERROR);
    const err = result.error as StageError;
    expect(err.code).toBe('ALREADY_AT_STAGE');
  });

  it('rejects --to mismatch with next stage', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'discovery' },
    });

    const result = await executeStage(ctx, 'advance', {
      to: 'maintenance',
      yes: true,
    });

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
    const err = result.error as StageError;
    expect(err.message).toContain('maintenance');
  });

  it('given unmet criteria and --dry-run, predicts refusal without mutating state', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'discovery' },
    });
    const before = (await ctx.state()).stateSnapshot().project.stage;

    const result = await executeStage(ctx, 'advance', { dryRun: true, yes: true });

    expect(result.exitCode).toBe(ExitCode.DISCOVERY_NOT_READY);
    expect(result.humanText).toContain('dry run');
    expect(result.data).toMatchObject({ dry_run: true, ready: false });

    const after = (await ctx.state()).stateSnapshot().project.stage;
    expect(after).toBe(before);
    expect(after).toBe('discovery');
  });

  it('given ready criteria and --dry-run, predicts success without mutating state', async () => {
    // Force path: dry-run with --force --reason when checklist incomplete still
    // predicts forced success and writes nothing.
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'discovery' },
    });

    const result = await executeStage(ctx, 'advance', {
      dryRun: true,
      force: true,
      reason: 'preview forced advance',
    });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toMatchObject({
      from: 'discovery',
      to: 'delivery',
      dry_run: true,
      forced: true,
    });
    expect(result.humanText).toContain('would succeed');

    const sm = await ctx.state();
    expect(sm.stateSnapshot().project.stage).toBe('discovery');
    expect(sm.stateSnapshot().decisions).toHaveLength(0);
  });
});

describe('executeStage — set subcommand', () => {
  it('refuses discovery→delivery when checklist is incomplete (no mutation)', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'discovery' },
    });

    const result = await executeStage(ctx, 'set', { to: 'delivery', yes: true });

    expect(result.exitCode).toBe(ExitCode.DISCOVERY_NOT_READY);
    expect(result.humanText).toContain('NOT READY');
    expect(result.humanText).toContain('--force --reason');

    const sm = await ctx.state();
    expect(sm.stateSnapshot().project.stage).toBe('discovery');
    expect(sm.stateSnapshot().decisions).toHaveLength(0);
  });

  it('refuses discovery→maintenance when checklist is incomplete (no skip backdoor)', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'discovery' },
    });

    const result = await executeStage(ctx, 'set', { to: 'maintenance', yes: true });

    expect(result.exitCode).toBe(ExitCode.DISCOVERY_NOT_READY);
    expect((await ctx.state()).stateSnapshot().project.stage).toBe('discovery');
  });

  it('--force without --reason returns FORCE_REASON_REQUIRED', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'discovery' },
    });

    const result = await executeStage(ctx, 'set', { to: 'delivery', force: true });

    expect(result.exitCode).toBe(ExitCode.FORCE_REASON_REQUIRED);
    const err = result.error as StageError;
    expect(err.message).toContain('--reason');
    expect((await ctx.state()).stateSnapshot().project.stage).toBe('discovery');
  });

  it('--force --reason bypasses readiness, marks forced, and records Decision', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'discovery' },
    });

    const result = await executeStage(ctx, 'set', {
      to: 'delivery',
      force: true,
      reason: 'Audited set bypass',
    });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    const data = result.data as { from: string; to: string; forced: boolean; reason: string };
    expect(data.from).toBe('discovery');
    expect(data.to).toBe('delivery');
    expect(data.forced).toBe(true);
    expect(data.reason).toBe('Audited set bypass');
    expect(result.humanText).toContain('(forced)');

    const sm = await ctx.state();
    const snapshot = sm.stateSnapshot();
    expect(snapshot.project.stage).toBe('delivery');
    expect(snapshot.decisions.some((d) =>
      d.id.startsWith('DEC-STAGE-FORCE-') && d.rationale === 'Audited set bypass',
    )).toBe(true);
  });

  it('changes stage directly with reason', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'delivery' },
    });

    const result = await executeStage(ctx, 'set', {
      to: 'maintenance',
      reason: 'MVP complete',
    });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    const data = result.data as { from: string; to: string; reason: string };
    expect(data.from).toBe('delivery');
    expect(data.to).toBe('maintenance');
  });

  it('rejects set to same stage', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'delivery' },
    });

    const result = await executeStage(ctx, 'set', { to: 'delivery' });

    expect(result.exitCode).toBe(ExitCode.GENERIC_ERROR);
  });

  it('rejects set to invalid stage', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'delivery' },
    });

    const result = await executeStage(ctx, 'set', { to: 'invalid' });

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
  });

  it('rejects set without target', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'delivery' },
    });

    const result = await executeStage(ctx, 'set', {});

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
  });

  it('rejects backward transition (delivery → discovery)', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'delivery' },
    });

    const result = await executeStage(ctx, 'set', {
      to: 'discovery',
      reason: 'rework',
    });

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
  });
});

describe('executeStage — unknown subcommand', () => {
  it('returns usage error for unknown subcommand', async () => {
    const ctx = await createTestCtx();

    const result = await executeStage(ctx, 'reset', {});

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
  });
});
