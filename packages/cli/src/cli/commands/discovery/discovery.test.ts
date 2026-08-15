import { describe, it, expect } from 'vitest';
import { DISCOVERY_MILESTONE_ORDER } from '@l1dder/core';
import { InMemoryFileSystem, FixedClock, NullLogger } from '@l1dder/core/testing';
import { DiscoveryStatusOutputSchema } from '@l1dder/schemas';

import { executeDiscovery } from './discovery.js';
import { executeStatus } from '../status.js';
import { executeHelpme } from '../helpme/helpme.js';
import { executeStage } from '../stage/stage.js';
import { executeProfile } from '../profile/profile.js';
import { ExitCode } from '../../output/exit-codes.js';
import { createColorPalette } from '../../output/colors.js';
import { createFormatter } from '../../output/formatter.js';
import { parseGlobals } from '../../globals.js';
import { buildContext } from '../../context.js';
import { NonInteractiveAdapter } from '../../prompt/non-interactive-adapter.js';
import type { CliContext } from '../../context.js';

const NOW = '2026-01-15T10:00:00Z';

function makeStateYml(overrides?: { stage?: string; milestonesYaml?: string }): string {
  const stage = overrides?.stage ?? 'discovery';
  const milestones = overrides?.milestonesYaml ?? '    []';
  return `schema_version: 2
project:
  name: "discovery-test"
  stage: ${stage}
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
  milestones:
${milestones}
  current: null
  waivers: []
tasks:
  items: []
quick_tasks: []
knowledge_updates: []
decisions: []
`;
}

const CONFIG_YML = `schema_version: 1
role_mode: solo
`;

async function createTestCtx(opts?: {
  stateOverrides?: Parameters<typeof makeStateYml>[0];
}): Promise<CliContext & { fs: InMemoryFileSystem }> {
  const fs = new InMemoryFileSystem();
  const clock = new FixedClock(NOW);
  const logger = new NullLogger();
  const prompt = new NonInteractiveAdapter();
  const colors = createColorPalette(false);
  const output = createFormatter('human', colors);
  const cwd = '/test-project';
  const globals = parseGlobals({ cwd });

  await fs.mkdir(`${cwd}/.l1dder`);
  await fs.writeFile(`${cwd}/.l1dder/state.yml`, makeStateYml(opts?.stateOverrides));
  await fs.writeFile(`${cwd}/.l1dder/config.yml`, CONFIG_YML);

  const ctx = buildContext(globals, { fs, clock, logger, prompt, output, colors });
  return Object.assign(ctx, { fs });
}

async function readStateYaml(fs: InMemoryFileSystem): Promise<string> {
  return fs.readFile('/test-project/.l1dder/state.yml');
}

describe('l1dder discovery', () => {
  it('status returns the ordered 7-milestone checklist and parses --json schema', async () => {
    const ctx = await createTestCtx();
    const result = await executeDiscovery(ctx, 'status', undefined, {});

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    const parsed = DiscoveryStatusOutputSchema.safeParse(result.data);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.milestones.map((m) => m.id)).toEqual([
      ...DISCOVERY_MILESTONE_ORDER,
    ]);
    expect(parsed.data.milestones.some((m) => m.id === 'roadmap')).toBe(false);
    expect(parsed.data.milestones.some((m) => m.id === 'integrations')).toBe(true);
    expect(parsed.data.planning_candidates).toEqual([]);
    expect(parsed.data.readiness).toEqual({
      milestones_closed: false,
      evidence_available: false,
      ready: false,
      gaps: [],
    });
  });

  it('status exposes planned_sessions for milestones that have them', async () => {
    const ctx = await createTestCtx();
    await executeDiscovery(ctx, 'start', 'idea', {});
    const planOk = await executeDiscovery(ctx, 'plan', 'idea', {
      summary: 'Brainstormed product idea for HARD',
      session: ['AS-idea-1', 'AS-idea-2'],
    });
    expect(planOk.exitCode).toBe(ExitCode.SUCCESS);

    const result = await executeDiscovery(ctx, 'status', undefined, {});
    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    const parsed = DiscoveryStatusOutputSchema.safeParse(result.data);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const idea = parsed.data.milestones.find((m) => m.id === 'idea');
    expect(idea?.planned_sessions).toEqual(['AS-idea-1', 'AS-idea-2']);
    expect(idea?.planned_session_count).toBe(2);
  });

  it('status, helpme and stage status return the SAME ordered milestone ids', async () => {
    const ctx = await createTestCtx();

    const status = await executeStatus(ctx);
    const helpme = await executeHelpme(ctx);
    const stage = await executeStage(ctx, 'status', {});

    expect(status.exitCode).toBe(ExitCode.SUCCESS);
    expect(helpme.exitCode).toBe(ExitCode.SUCCESS);
    expect(stage.exitCode).toBe(ExitCode.SUCCESS);

    const statusIds = (
      status.data as { discovery?: { milestones: Array<{ id: string }> } }
    ).discovery?.milestones.map((m) => m.id);
    const helpmeIds = helpme.data?.discovery?.milestones.map((m) => m.id);
    const stageIds = (
      stage.data as { readiness: { criteria: Array<{ id: string }> } }
    ).readiness.criteria.map((c) => c.id);

    expect(statusIds).toEqual([...DISCOVERY_MILESTONE_ORDER]);
    expect(helpmeIds).toEqual([...DISCOVERY_MILESTONE_ORDER]);
    expect(stageIds).toEqual([...DISCOVERY_MILESTONE_ORDER]);
    expect(statusIds).toEqual(helpmeIds);
    expect(helpmeIds).toEqual(stageIds);
  });

  it('no readiness criterion references roadmap', async () => {
    const ctx = await createTestCtx();
    const stage = await executeStage(ctx, 'status', {});
    const ids = (
      stage.data as { readiness: { criteria: Array<{ id: string }> } }
    ).readiness.criteria.map((c) => c.id);
    expect(ids).not.toContain('roadmap');
  });

  it('start idea happy path; architecture start fails when product incomplete and state unchanged', async () => {
    const ctx = await createTestCtx();
    const before = await readStateYaml(ctx.fs);

    const startIdea = await executeDiscovery(ctx, 'start', 'idea', {});
    expect(startIdea.exitCode).toBe(ExitCode.SUCCESS);

    const startArch = await executeDiscovery(ctx, 'start', 'architecture', {});
    expect(startArch.exitCode).toBe(ExitCode.MILESTONE_ERROR);
    expect(startArch.error?.code).toBe('MILESTONE_ORDER');

    const after = await readStateYaml(ctx.fs);
    // idea brainstorm was persisted; architecture rejection must not alter further
    expect(after).toContain('brainstorming');
    expect(after).not.toContain('id: architecture\n    status: brainstorming');
    expect(before).not.toContain('brainstorming');
  });

  it('stage advance fails when product incomplete and leaves state.yml unchanged', async () => {
    const ctx = await createTestCtx();
    await executeDiscovery(ctx, 'start', 'idea', {});
    const before = await readStateYaml(ctx.fs);

    const advance = await executeStage(ctx, 'advance', {});
    expect(advance.exitCode).toBe(ExitCode.DISCOVERY_NOT_READY);

    const after = await readStateYaml(ctx.fs);
    expect(after).toBe(before);
    expect(after).toContain('stage: discovery');
  });

  it('--force without --reason fails; --force --reason succeeds and records Decision', async () => {
    const ctx = await createTestCtx();

    const missing = await executeStage(ctx, 'advance', { force: true });
    expect(missing.exitCode).toBe(ExitCode.FORCE_REASON_REQUIRED);
    expect(await readStateYaml(ctx.fs)).toContain('stage: discovery');

    const forced = await executeStage(ctx, 'advance', {
      force: true,
      reason: 'Demo bypass for HARD-2',
    });
    expect(forced.exitCode).toBe(ExitCode.SUCCESS);

    const yaml = await readStateYaml(ctx.fs);
    expect(yaml).toContain('stage: delivery');
    expect(yaml).toContain('Demo bypass for HARD-2');
    expect(yaml).toContain('DEC-STAGE-FORCE-');
  });

  it('integrations appears and can be skipped as not_applicable; data may then start', async () => {
    const ctx = await createTestCtx();

    // Close idea → product → architecture via waive, then skip integrations.
    for (const id of ['idea', 'product', 'architecture'] as const) {
      const waived = await executeDiscovery(ctx, 'waive', id, {
        reason: `close ${id}`,
      });
      expect(waived.exitCode).toBe(ExitCode.SUCCESS);
    }

    const skip = await executeDiscovery(ctx, 'skip', 'integrations', {
      reason: 'No external integrations for this CLI tool',
    });
    expect(skip.exitCode).toBe(ExitCode.SUCCESS);

    const startData = await executeDiscovery(ctx, 'start', 'data', {});
    expect(startData.exitCode).toBe(ExitCode.SUCCESS);

    const status = await executeDiscovery(ctx, 'status', undefined, {});
    const integrations = (
      status.data as { milestones: Array<{ id: string; status: string }> }
    ).milestones.find((m) => m.id === 'integrations');
    expect(integrations?.status).toBe('not_applicable');
  });

  it('given brainstorming idea, discovery status marks plan as needing human input', async () => {
    const ctx = await createTestCtx();
    await executeProfile(ctx, 'select', 'product_discovery');
    await executeDiscovery(ctx, 'start', 'idea', {});

    const result = await executeDiscovery(ctx, 'status', undefined, {});
    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    const parsed = DiscoveryStatusOutputSchema.safeParse(result.data);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.primary_action.kind).toBe('plan_milestone');
    expect(parsed.data.primary_action.needs_input).toBe(true);
    expect(
      parsed.data.primary_action.required_inputs?.map((input) => input.flag),
    ).toEqual(['--summary', '--session']);
    expect(
      parsed.data.blockers.filter(
        (b) => b.level === 'hard' || b.level === undefined,
      ),
    ).toEqual([]);
  });

  it('plan requires summary and session; waive/reopen/skip require reason', async () => {
    const ctx = await createTestCtx();
    await executeDiscovery(ctx, 'start', 'idea', {});

    const planMissing = await executeDiscovery(ctx, 'plan', 'idea', {});
    expect(planMissing.exitCode).toBe(ExitCode.USAGE_ERROR);

    const planOk = await executeDiscovery(ctx, 'plan', 'idea', {
      summary: 'Brainstormed product idea for HARD',
      session: ['AS-idea-1'],
    });
    expect(planOk.exitCode).toBe(ExitCode.SUCCESS);

    const waiveMissing = await executeDiscovery(ctx, 'waive', 'product', {});
    expect(waiveMissing.exitCode).toBe(ExitCode.FORCE_REASON_REQUIRED);

    const reopenMissing = await executeDiscovery(ctx, 'reopen', 'idea', {
      reason: '',
    });
    expect(reopenMissing.exitCode).toBe(ExitCode.FORCE_REASON_REQUIRED);

    // planned → in_progress → complete with evidence
    const startWork = await executeDiscovery(ctx, 'start', 'idea', {});
    expect(startWork.exitCode).toBe(ExitCode.SUCCESS);

    const completeMissing = await executeDiscovery(ctx, 'complete', 'idea', {});
    expect(completeMissing.exitCode).toBe(ExitCode.MILESTONE_ERROR);

    const completeOk = await executeDiscovery(ctx, 'complete', 'idea', {
      evidence: ['knowledge/idea.md'],
    });
    expect(completeOk.exitCode).toBe(ExitCode.SUCCESS);

    const reopenOk = await executeDiscovery(ctx, 'reopen', 'idea', {
      reason: 'Need to revise idea scope',
    });
    expect(reopenOk.exitCode).toBe(ExitCode.SUCCESS);
  });

  it('skip on non-conditional milestone is rejected', async () => {
    const ctx = await createTestCtx();
    const result = await executeDiscovery(ctx, 'skip', 'idea', {
      reason: 'not allowed',
    });
    expect(result.exitCode).toBe(ExitCode.MILESTONE_ERROR);
    expect(result.error?.code).toBe('MILESTONE_NOT_CONDITIONAL');
  });
});
