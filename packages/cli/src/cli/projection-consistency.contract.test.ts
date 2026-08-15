import { describe, it, expect } from 'vitest';
import { InMemoryFileSystem, FixedClock, NullLogger } from '@l1dder/core/testing';
import type { PrimaryActionBrief } from '@l1dder/schemas';

import { executeStatus } from './commands/status.js';
import { executeHelpme } from './commands/helpme/helpme.js';
import { executeStage } from './commands/stage/stage.js';
import { executeDoctor } from './commands/doctor/doctor.js';
import { executeContext } from './commands/context.js';
import { executeDiscovery } from './commands/discovery/discovery.js';
import { executeProfile } from './commands/profile/profile.js';
import { ExitCode } from './output/exit-codes.js';
import { createColorPalette } from './output/colors.js';
import { createFormatter } from './output/formatter.js';
import { parseGlobals } from './globals.js';
import { buildContext } from './context.js';
import { NonInteractiveAdapter } from './prompt/non-interactive-adapter.js';
import type { CliContext } from './context.js';

const NOW = '2026-01-15T10:00:00Z';

function makeStateYml(): string {
  return `schema_version: 2
project:
  name: "consistency-test"
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
`;
}

const CONFIG_YML = `role_mode: solo
`;

async function createTestCtx(): Promise<CliContext> {
  const fs = new InMemoryFileSystem();
  const clock = new FixedClock(NOW);
  const logger = new NullLogger();
  const prompt = new NonInteractiveAdapter();
  const colors = createColorPalette(false);
  const output = createFormatter('human', colors);
  const cwd = '/test-project';
  const globals = parseGlobals({ cwd });

  await fs.mkdir(`${cwd}/.l1dder`);
  await fs.mkdir(`${cwd}/knowledge`);
  await fs.writeFile(`${cwd}/.l1dder/state.yml`, makeStateYml());
  await fs.writeFile(`${cwd}/.l1dder/config.yml`, CONFIG_YML);
  await fs.writeFile(
    `${cwd}/knowledge/roadmap.md`,
    '# Roadmap\n\nProject stage: discovery (narrative only)\n',
  );

  return buildContext(globals, { fs, clock, logger, prompt, output, colors });
}

interface BlockerSlice {
  readonly code: string;
  readonly message: string;
  readonly milestone?: string;
  readonly level?: 'hard' | 'advisory';
}

/**
 * Pull Primary Action and assert the HARD-7 fields are present, not just
 * kind/command/reason. A surface that drops `needs_input` / `required_inputs`
 * fails here even when those values are the executable defaults.
 */
function extractPrimary(data: unknown): PrimaryActionBrief {
  const d = data as { primary_action?: PrimaryActionBrief };
  expect(d.primary_action).toBeDefined();
  const action = d.primary_action as PrimaryActionBrief;
  expect(typeof action.needs_input).toBe('boolean');
  expect(Array.isArray(action.required_inputs)).toBe(true);
  return action;
}

/**
 * Pull blockers and assert every row carries a stop/status `level`.
 */
function extractBlockers(data: unknown): BlockerSlice[] {
  const d = data as { blockers?: BlockerSlice[] };
  expect(Array.isArray(d.blockers)).toBe(true);
  const blockers = [...(d.blockers ?? [])];
  for (const blocker of blockers) {
    expect(['hard', 'advisory']).toContain(blocker.level);
  }
  return blockers;
}

async function collectSurfaces(ctx: CliContext): Promise<{
  readonly actions: readonly PrimaryActionBrief[];
  readonly blockerSets: readonly BlockerSlice[][];
  readonly nestedDiscovery?: {
    readonly primary_action: PrimaryActionBrief;
    readonly blockers: BlockerSlice[];
  };
}> {
  const status = await executeStatus(ctx);
  const helpme = await executeHelpme(ctx);
  const nowAlias = await executeHelpme(ctx);
  const stage = await executeStage(ctx, 'status', {});
  const doctor = await executeDoctor(ctx, { section: 'stage' });
  const context = await executeContext(ctx, {});
  const discovery = await executeDiscovery(ctx, 'status', undefined, {});

  expect(status.exitCode).toBe(ExitCode.SUCCESS);
  expect(helpme.exitCode).toBe(ExitCode.SUCCESS);
  expect(nowAlias.exitCode).toBe(ExitCode.SUCCESS);
  expect(stage.exitCode).toBe(ExitCode.SUCCESS);
  expect(doctor.exitCode).toBeLessThanOrEqual(ExitCode.GENERIC_ERROR);
  expect(context.exitCode).toBe(ExitCode.SUCCESS);
  expect(discovery.exitCode).toBe(ExitCode.SUCCESS);

  const payloads = [
    status.data,
    helpme.data,
    nowAlias.data,
    stage.data,
    doctor.data,
    context.data,
    discovery.data,
  ];

  const nested = (
    status.data as {
      discovery?: { primary_action: PrimaryActionBrief; blockers: BlockerSlice[] };
    }
  ).discovery;

  return {
    actions: payloads.map((payload) => extractPrimary(payload)),
    blockerSets: payloads.map((payload) => extractBlockers(payload)),
    ...(nested !== undefined
      ? {
          nestedDiscovery: {
            primary_action: extractPrimary(nested),
            blockers: extractBlockers(nested),
          },
        }
      : {}),
  };
}

function expectSurfacesAligned(collected: Awaited<ReturnType<typeof collectSurfaces>>): void {
  const canonical = collected.actions[0];
  expect(canonical).toBeDefined();
  for (let i = 1; i < collected.actions.length; i++) {
    expect(collected.actions[i]).toEqual(canonical);
  }

  const canonicalBlockers = collected.blockerSets[0];
  expect(canonicalBlockers).toBeDefined();
  for (let i = 1; i < collected.blockerSets.length; i++) {
    expect(collected.blockerSets[i]).toEqual(canonicalBlockers);
  }

  if (collected.nestedDiscovery !== undefined) {
    expect(collected.nestedDiscovery.primary_action).toEqual(canonical);
    expect(collected.nestedDiscovery.blockers).toEqual(canonicalBlockers);
  }
}

describe('cross-command projection consistency (T-16 / HARD-7)', () => {
  // @tc TC-011-01-A
  it('status, helpme, now, stage, doctor, context, discovery share Primary Action + blockers including needs_input and level', async () => {
    const ctx = await createTestCtx();
    const collected = await collectSurfaces(ctx);

    expect(collected.actions[0]?.kind).toBe('select_profile');
    expect(collected.actions[0]?.needs_input).toBe(false);
    expect(collected.actions[0]?.required_inputs).toEqual([]);
    expect(
      collected.blockerSets[0]?.some(
        (b) => b.code === 'DISCOVERY_NOT_READY' && b.level === 'advisory',
      ),
    ).toBe(true);

    expectSurfacesAligned(collected);
  });

  it('after start idea, every surface shares plan_milestone needs_input and advisory blockers', async () => {
    const ctx = await createTestCtx();
    await executeProfile(ctx, 'select', 'product_discovery');
    await executeDiscovery(ctx, 'start', 'idea', {});

    const collected = await collectSurfaces(ctx);

    expect(collected.actions[0]?.kind).toBe('plan_milestone');
    expect(collected.actions[0]?.needs_input).toBe(true);
    expect(collected.actions[0]?.required_inputs?.map((input) => input.flag)).toEqual([
      '--summary',
      '--session',
    ]);
    expect(
      collected.blockerSets[0]?.every(
        (b) => b.level === 'advisory',
      ),
    ).toBe(true);

    expectSurfacesAligned(collected);
  });
});
