import { describe, it, expect } from 'vitest';
import { DISCOVERY_MILESTONE_ORDER } from '@l1dder/core';
import { InMemoryFileSystem, FixedClock, NullLogger } from '@l1dder/core/testing';

import { HelpmeOutputSchema } from '@l1dder/schemas';

import { executeHelpme } from './helpme.js';
import { executeDiscovery } from '../discovery/discovery.js';
import { executeProfile } from '../profile/profile.js';
import { ExitCode } from '../../output/exit-codes.js';
import { createColorPalette } from '../../output/colors.js';
import { createFormatter } from '../../output/formatter.js';
import { parseGlobals } from '../../globals.js';
import { buildContext } from '../../context.js';
import { NonInteractiveAdapter } from '../../prompt/non-interactive-adapter.js';
import { getPhaseGuidance, PHASE_GUIDANCE } from './phase-guidance.js';

const NOW = '2026-01-15T10:00:00Z';

function makeStateYml(overrides?: {
  stage?: string;
  phase?: string;
  status?: string;
  mode?: string;
  iteration?: number;
}): string {
  const stage = overrides?.stage ?? 'discovery';
  const phase = overrides?.phase ?? 'specify';
  const status = overrides?.status ?? 'in_progress';
  const mode = overrides?.mode ?? 'main';
  const iteration = overrides?.iteration ?? 0;

  return `schema_version: 2
project:
  name: "helpme-test"
  stage: ${stage}
  stage_history: []
  created_at: "${NOW}"
  updated_at: "${NOW}"
workflow:
  current_phase: ${phase}
  current_status: ${status}
  mode: ${mode}
  profile: null
  iteration: ${String(iteration)}
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

async function createTestCtx(opts?: { stateOverrides?: Parameters<typeof makeStateYml>[0] }) {
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

  return buildContext(globals, { fs, clock, logger, prompt, output, colors });
}

describe('executeHelpme', () => {
  it('shows Discovery Checklist on discovery stage with ordered 7 milestones', async () => {
    const ctx = await createTestCtx({ stateOverrides: { stage: 'discovery', phase: 'specify' } });
    const result = await executeHelpme(ctx);

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toBeDefined();
    if (!result.data) return;

    expect(result.data.discovery).toBeDefined();
    expect(result.data.discovery?.ready).toBe(false);
    expect(result.data.discovery?.milestones.map((m) => m.id)).toEqual([
      ...DISCOVERY_MILESTONE_ORDER,
    ]);
    expect(result.humanText).toContain('Discovery Checklist');
    expect(result.humanText).toContain('Primary Action');
    expect(result.data.transitions.next?.phase).toBe('plan');
  });

  it('hides Discovery Checklist on delivery stage', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'delivery', phase: 'implement', iteration: 2 },
    });
    const result = await executeHelpme(ctx);

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toBeDefined();
    if (!result.data) return;

    expect(result.data.discovery).toBeUndefined();
    expect(result.humanText).not.toContain('Discovery Checklist');
    expect(result.data.transitions.next?.phase).toBe('update_asis');
  });

  it('exposes the canonical primary action on discovery stage', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'discovery', phase: 'specify' },
    });
    const result = await executeHelpme(ctx);

    expect(result.data?.primary_action.kind.length).toBeGreaterThan(0);
    expect(result.data?.primary_action.command.length).toBeGreaterThan(0);
    expect(result.data?.blockers).toBeDefined();
  });

  it('given a fresh discovery project, now JSON has no hard blockers and a runnable select_profile', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'discovery', phase: 'idle' },
    });
    const result = await executeHelpme(ctx);
    const parsed = HelpmeOutputSchema.safeParse(result.data);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.primary_action.kind).toBe('select_profile');
    expect(parsed.data.primary_action.needs_input).toBe(false);
    expect(parsed.data.primary_action.required_inputs).toEqual([]);
    expect(
      parsed.data.blockers.filter(
        (b) => b.level === 'hard' || b.level === undefined,
      ),
    ).toEqual([]);
    expect(
      parsed.data.blockers.some(
        (b) => b.code === 'DISCOVERY_NOT_READY' && b.level === 'advisory',
      ),
    ).toBe(true);
  });

  it('given brainstorming idea, plan_milestone declares required inputs and stays free of hard blockers', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'discovery', phase: 'idle' },
    });
    await executeProfile(ctx, 'select', 'product_discovery');
    await executeDiscovery(ctx, 'start', 'idea', {});

    const result = await executeHelpme(ctx);
    const parsed = HelpmeOutputSchema.safeParse(result.data);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.primary_action.kind).toBe('plan_milestone');
    expect(parsed.data.primary_action.command).toBe(
      'l1dder discovery plan idea',
    );
    expect(parsed.data.primary_action.needs_input).toBe(true);
    expect(parsed.data.primary_action.required_inputs).toBeDefined();
    expect(
      parsed.data.primary_action.required_inputs?.map((input) => input.flag),
    ).toEqual(['--summary', '--session']);
    expect(
      parsed.data.blockers.filter(
        (b) => b.level === 'hard' || b.level === undefined,
      ),
    ).toEqual([]);
  });

  it('exposes the canonical primary action on delivery stage too', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { stage: 'delivery', phase: 'implement', iteration: 2 },
    });
    const result = await executeHelpme(ctx);

    expect(result.data?.discovery).toBeUndefined();
    expect(result.data?.primary_action.command.length).toBeGreaterThan(0);
  });

  it('handles idle without crash', async () => {
    const ctx = await createTestCtx({ stateOverrides: { phase: 'idle', iteration: 0 } });
    const result = await executeHelpme(ctx);

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toBeDefined();
    if (!result.data) return;

    expect(result.data.phase_guidance.length).toBeGreaterThan(0);
  });

  it('DF-023: given a fully filled plan.md, helpme reports the artifact as ready', async () => {
    const fs = new InMemoryFileSystem();
    const clock = new FixedClock(NOW);
    const logger = new NullLogger();
    const prompt = new NonInteractiveAdapter();
    const colors = createColorPalette(false);
    const output = createFormatter('human', colors);
    const cwd = '/test-project';
    const globals = parseGlobals({ cwd });

    await fs.mkdir(`${cwd}/.l1dder`);
    await fs.mkdir(`${cwd}/specs/current`);
    await fs.writeFile(
      `${cwd}/.l1dder/state.yml`,
      makeStateYml({ stage: 'delivery', phase: 'plan' }).replace(
        'profile: null',
        'profile: delivery',
      ),
    );
    await fs.writeFile(`${cwd}/.l1dder/config.yml`, CONFIG_YML);
    await fs.writeFile(
      `${cwd}/specs/current/plan.md`,
      [
        '# Plan',
        '',
        '## Summary',
        '',
        'Fully authored technical approach with no placeholders left.',
        '',
        '## Options Considered',
        '',
        'Chose the simple path; no open TODOs remain.',
        '',
      ].join('\n'),
    );

    const ctx = buildContext(globals, { fs, clock, logger, prompt, output, colors });
    const result = await executeHelpme(ctx);

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data?.delivery_artifacts).toEqual([
      {
        id: 'plan',
        path: 'specs/current/plan.md',
        label: 'plan.md',
        status: 'ready',
      },
    ]);
    expect(result.data?.phase_guidance.join(' ')).toContain('ready');
    expect(result.data?.phase_guidance.join(' ').toLowerCase()).not.toContain(
      'fill',
    );
    // Artifact readiness is reported; Primary Action still comes from projection
    // (may be profile/discovery before phase transition depending on state).
    expect(result.data?.phase_guidance.join(' ')).toContain('ready');
    expect(result.humanText).toContain('plan.md — ready');
    expect(result.humanText).toContain('Primary Action');
    expect(result.data?.primary_action.command.length).toBeGreaterThan(0);
  });
});

describe('PHASE_GUIDANCE', () => {
  it('covers all main workflow phases', () => {
    expect(PHASE_GUIDANCE['specify'].length).toBeGreaterThan(0);
    expect(PHASE_GUIDANCE['implement'].length).toBeGreaterThan(0);
    expect(getPhaseGuidance('unknown_phase').length).toBeGreaterThan(0);
  });
});
