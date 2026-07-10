import { describe, it, expect } from 'vitest';

import { InMemoryFileSystem, FixedClock, NullLogger } from '@l1dder/core/testing';

import { executeStage } from './stage.js';
import { ExitCode } from '../../output/exit-codes.js';
import { createColorPalette } from '../../output/colors.js';
import { createFormatter } from '../../output/formatter.js';
import { parseGlobals } from '../../globals.js';
import { buildContext } from '../../context.js';
import { NonInteractiveAdapter } from '../../prompt/non-interactive-adapter.js';
import { ScriptedAdapter } from '../../prompt/scripted-adapter.js';

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
  knowledgeUpdates?: Array<{ file: string; operation?: string; summary?: string }>;
  phaseHistory?: Array<{ phase: string; status: string }>;
}): string {
  const stage = overrides?.stage ?? 'discovery';
  const phase = overrides?.phase ?? 'idle';
  const stageHistory = overrides?.stageHistory ?? [];
  const knowledgeUpdates = overrides?.knowledgeUpdates ?? [];
  const phaseHistory = overrides?.phaseHistory ?? [];

  const historyLines = stageHistory.length > 0
    ? stageHistory.map((h) =>
        `    - from: ${h.from}\n      to: ${h.to}\n      timestamp: "${h.timestamp}"${h.reason ? `\n      reason: "${h.reason}"` : ''}`,
      ).join('\n')
    : '    []';

  const kuLines = knowledgeUpdates.length > 0
    ? knowledgeUpdates.map((ku) => {
        const op = ku.operation ?? 'create';
        const summary = ku.summary ?? 'auto';
        return `    - file: "${ku.file}"\n      operation: ${op}\n      timestamp: "${NOW}"\n      actor:\n        kind: human\n        id: tester\n      summary: "${summary}"`;
      }).join('\n')
    : '    []';

  const phLines = phaseHistory.length > 0
    ? phaseHistory.map((ph) =>
        `    - phase: ${ph.phase}\n      status: ${ph.status}\n      started_at: "${NOW}"\n      actor:\n        kind: system\n        id: cli\n      trigger:\n        kind: cli\n        command: test`,
      ).join('\n')
    : '    []';

  return `schema_version: 1
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
  iteration: 1
  phase_history:
${phLines}
  gate_history: []
tasks:
  items: []
quick_tasks: []
knowledge_updates:
${kuLines}
`;
}

const CONFIG_YML = `schema_version: 1
role_mode: solo
`;

async function createTestCtx(opts?: {
  stateOverrides?: Parameters<typeof makeStateYml>[0];
  skipState?: boolean;
  prompt?: NonInteractiveAdapter | ScriptedAdapter;
}) {
  const fs = new InMemoryFileSystem();
  const clock = new FixedClock(NOW);
  const logger = new NullLogger();
  const prompt = opts?.prompt ?? new NonInteractiveAdapter();
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

// ─── stage status ───

describe('executeStage — status subcommand', () => {
  it('shows readiness checklist in discovery stage', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'discovery' },
    });

    const result = await executeStage(ctx, 'status', {});

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toBeDefined();

    const data = result.data as {
      stage: string;
      enforcement: string;
      readiness: { score: string; criteria: Array<{ id: string; met: boolean }> };
    };
    expect(data.stage).toBe('discovery');
    // 5 milestones + design check + skeleton markers check = 7 criteria (all enabled by default)
    expect(data.readiness.criteria.length).toBe(7);
    // Semantic milestone IDs
    const ids = data.readiness.criteria.map((c) => c.id);
    expect(ids).toContain('idea');
    expect(ids).toContain('roadmap');
    expect(ids).toContain('architecture');
    expect(ids).toContain('data_model');
    expect(ids).toContain('usecases');
    // Milestone criteria not met (no artifact files in test fs)
    const milestoneCriteria = data.readiness.criteria.filter((c) =>
      ['idea', 'roadmap', 'architecture', 'data_model', 'usecases'].includes(c.id),
    );
    expect(milestoneCriteria.every((c) => !c.met)).toBe(true);
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
    const entry = data.history[0] as { from: string; to: string };
    expect(entry.from).toBe('discovery');
    expect(entry.to).toBe('delivery');
    expect(result.humanText).toContain('discovery');
    expect(result.humanText).toContain('delivery');
    expect(result.humanText).toContain('Ready');
  });

  it('returns exit 8 when not initialized', async () => {
    const ctx = await createTestCtx({ skipState: true });

    const result = await executeStage(ctx, 'status', {});

    expect(result.exitCode).toBe(ExitCode.NOT_INITIALIZED);
    expect(result.error).toBeDefined();
    const err = result.error as StageError;
    expect(err.code).toBe('NOT_INITIALIZED');
  });

  it('--json outputs StageStatusOutput shape', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'discovery' },
    });

    const result = await executeStage(ctx, 'status', {});

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty('stage');
    expect(data).toHaveProperty('enforcement');
    expect(data).toHaveProperty('readiness');
    expect(data).toHaveProperty('history');
  });
});

// ─── stage advance ───

describe('executeStage — advance subcommand', () => {
  it('advances when readiness met and --yes given', async () => {
    const ctx = await createTestCtx({
      stateOverrides: {
        stage: 'discovery',
        knowledgeUpdates: [
          { file: 'architecture.md' },
          { file: 'erd.md' },
          { file: 'spec.md' },
          { file: 'conventions.md' },
          { file: 'config.yml' },
        ],
        phaseHistory: [
          { phase: 'complete', status: 'completed' },
        ],
      },
    });

    const result = await executeStage(ctx, 'advance', { yes: true });

    expect(result.error).toBeUndefined();
    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.humanText).toContain('delivery');
  });

  it('--force --reason bypasses readiness', async () => {
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
    expect(result.humanText).toContain('delivery');
  });

  it('--force without --reason returns usage error', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'discovery' },
    });

    const result = await executeStage(ctx, 'advance', { force: true });

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
    const err = result.error as StageError;
    expect(err.message).toContain('--reason');
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
    expect(err.hint).toContain('l1dder stage set');
  });

  it('prompts user when not ready and respects decline', async () => {
    const prompt = new ScriptedAdapter({
      'Advance': false,
    });
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'discovery' },
      prompt,
    });

    const result = await executeStage(ctx, 'advance', {});

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.humanText).toContain('cancelled');
  });
});

// ─── stage set ───

describe('executeStage — set subcommand', () => {
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
    expect(data.reason).toBe('MVP complete');
  });

  it('rejects set to same stage', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'delivery' },
    });

    const result = await executeStage(ctx, 'set', { to: 'delivery' });

    expect(result.exitCode).toBe(ExitCode.GENERIC_ERROR);
    expect(result.error).toBeDefined();
  });

  it('rejects set to invalid stage', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'delivery' },
    });

    const result = await executeStage(ctx, 'set', { to: 'invalid' });

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
    const err = result.error as StageError;
    expect(err.message).toContain('Invalid stage');
  });

  it('rejects set without target', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'delivery' },
    });

    const result = await executeStage(ctx, 'set', {});

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
    const err = result.error as StageError;
    expect(err.message).toContain('required');
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
    expect(result.error).toBeDefined();
  });
});

// ─── unknown subcommand ───

describe('executeStage — unknown subcommand', () => {
  it('returns usage error for unknown subcommand', async () => {
    const ctx = await createTestCtx();

    const result = await executeStage(ctx, 'reset', {});

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
    const err = result.error as StageError;
    expect(err.message).toContain('Unknown subcommand');
    expect(err.hint).toContain('status');
  });
});
