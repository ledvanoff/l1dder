import { describe, it, expect } from 'vitest';

import { InMemoryFileSystem, FixedClock, NullLogger } from '@l1dder/core/testing';

import { executeHelpme } from './helpme.js';
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

  return `schema_version: 1
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
  iteration: ${String(iteration)}
  phase_history: []
  gate_history: []
tasks:
  items: []
quick_tasks: []
knowledge_updates: []
decisions: []
`;
}

const CONFIG_YML = `role_mode: solo
enforcement: open
stage:
  enforcement:
    restrict_phases: advisory
    require_criteria: advisory
  delivery_criteria:
    require_idea_not_skeleton: true
    require_roadmap: true
    require_architecture_not_skeleton: true
    require_erd_not_skeleton: true
    require_usecases_not_skeleton: true
    min_design_files: 1
    check_skeleton_markers: true
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
  it('shows Discovery Checklist on discovery stage + specify phase guidance', async () => {
    const ctx = await createTestCtx({ stateOverrides: { stage: 'discovery', phase: 'specify' } });
    const result = await executeHelpme(ctx);

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toBeDefined();
    if (!result.data) return;

    expect(result.data.discovery).toBeDefined();
    expect(result.data.discovery?.ready).toBe(false);
    expect(result.humanText).toContain('Discovery Checklist');
    expect(result.humanText).toContain('What to do now');
    expect(result.humanText).toContain('plan-mode');
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

  it('handles idle without crash', async () => {
    const ctx = await createTestCtx({ stateOverrides: { phase: 'idle', iteration: 0 } });
    const result = await executeHelpme(ctx);

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toBeDefined();
    if (!result.data) return;

    expect(result.data.phase_guidance.length).toBeGreaterThan(0);
  });
});

describe('PHASE_GUIDANCE', () => {
  it('covers all main workflow phases', () => {
    expect(PHASE_GUIDANCE['specify'].length).toBeGreaterThan(0);
    expect(PHASE_GUIDANCE['implement'].length).toBeGreaterThan(0);
    expect(getPhaseGuidance('unknown_phase').length).toBeGreaterThan(0);
  });
});
