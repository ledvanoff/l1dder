import { describe, it, expect } from 'vitest';

import { InMemoryFileSystem, FixedClock, NullLogger } from '@l1dder/core/testing';

import { executeStatus } from './status.js';
import { ExitCode } from '../output/exit-codes.js';
import { createColorPalette } from '../output/colors.js';
import { createFormatter } from '../output/formatter.js';
import { parseGlobals } from '../globals.js';
import { buildContext } from '../context.js';
import { NonInteractiveAdapter } from '../prompt/non-interactive-adapter.js';

const NOW = '2026-01-15T10:00:00Z';

function makeStateYml(overrides?: {
  name?: string;
  stage?: string;
  phase?: string;
  status?: string;
  mode?: string;
  iteration?: number;
  tasks?: Array<{ id: string; title: string; status: string; depends_on?: string[] }>;
  currentFeature?: string;
}): string {
  const name = overrides?.name ?? 'my-project';
  const stage = overrides?.stage ?? 'delivery';
  const phase = overrides?.phase ?? 'implement';
  const status = overrides?.status ?? 'in_progress';
  const mode = overrides?.mode ?? 'main';
  const iteration = overrides?.iteration ?? 3;
  const tasks = overrides?.tasks ?? [];
  const currentFeature = overrides?.currentFeature;

  const taskLines = tasks.map((t) => {
    const deps = t.depends_on && t.depends_on.length > 0
      ? `\n      depends_on:\n${t.depends_on.map((d) => `        - "${d}"`).join('\n')}`
      : '\n      depends_on: []';
    return `    - id: "${t.id}"\n      title: "${t.title}"\n      status: ${t.status}${deps}`;
  }).join('\n');

  return `schema_version: 1
project:
  name: "${name}"
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
tasks:${currentFeature ? `\n  current_feature: "${currentFeature}"` : ''}
  items:
${taskLines || '    []'}
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

describe('executeStatus', () => {
  it('shows project and workflow info', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { name: 'test-app', stage: 'delivery', phase: 'implement', iteration: 3 },
    });

    const result = await executeStatus(ctx);

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toBeDefined();
    const data = result.data as { project: { name: string; stage: string }; workflow: { phase: string; status: string; mode: string; iteration: string | null } };
    expect(data.project.name).toBe('test-app');
    expect(data.project.stage).toBe('delivery');
    expect(data.workflow.phase).toBe('implement');
    expect(data.workflow.status).toBe('in_progress');
    expect(data.workflow.mode).toBe('main');
    expect(data.workflow.iteration).toBe('3');

    expect(result.humanText).toContain('test-app');
    expect(result.humanText).toContain('delivery');
    expect(result.humanText).toContain('implement');
  });

  it('shows task progress with correct counts', async () => {
    const ctx = await createTestCtx({
      stateOverrides: {
        phase: 'implement',
        tasks: [
          { id: 'T-01', title: 'Setup schemas', status: 'done' },
          { id: 'T-02', title: 'Core types', status: 'done' },
          { id: 'T-03', title: 'State manager', status: 'in_progress', depends_on: ['T-02'] },
          { id: 'T-04', title: 'CLI commands', status: 'pending', depends_on: ['T-03'] },
          { id: 'T-05', title: 'E2E tests', status: 'pending', depends_on: ['T-04'] },
        ],
      },
    });

    const result = await executeStatus(ctx);

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    const taskData = (result.data as { tasks: Record<string, unknown> }).tasks;
    expect(taskData).toEqual({
      total: 5,
      done: 2,
      in_progress: 1,
      pending: 0,
      blocked: 2,
      skipped: 0,
      next_available: null,
    });

    expect(result.humanText).toContain('T-01');
    expect(result.humanText).toContain('T-03');
    expect(result.humanText).toContain('done');
    expect(result.humanText).toContain('in_progress');
  });

  it('--json outputs valid StatusOutput data', async () => {
    const ctx = await createTestCtx({
      stateOverrides: {
        name: 'json-test',
        stage: 'delivery',
        phase: 'plan',
        tasks: [
          { id: 'T-01', title: 'First', status: 'done' },
          { id: 'T-02', title: 'Second', status: 'pending', depends_on: [] },
        ],
      },
    });

    const result = await executeStatus(ctx);

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    const data = result.data as Record<string, unknown>;
    expect(data.project).toHaveProperty('name');
    expect(data.project).toHaveProperty('stage');
    expect(data.project).toHaveProperty('created');
    expect(data.workflow).toHaveProperty('phase');
    expect(data.workflow).toHaveProperty('status');
    expect(data.workflow).toHaveProperty('mode');
    expect(data.workflow).toHaveProperty('iteration');
    expect(data.tasks).toHaveProperty('total');
    expect(data.tasks).toHaveProperty('done');
    expect(data.tasks).toHaveProperty('in_progress');
    expect(data.tasks).toHaveProperty('pending');
    expect(data.tasks).toHaveProperty('blocked');
    expect(data.tasks).toHaveProperty('skipped');
    expect(data.tasks).toHaveProperty('next_available');
    expect(Array.isArray(data.next_steps)).toBe(true);
  });

  it('returns exit 8 when not initialized', async () => {
    const ctx = await createTestCtx({ skipState: true });

    const result = await executeStatus(ctx);

    expect(result.exitCode).toBe(ExitCode.NOT_INITIALIZED);
    expect(result.error).toBeDefined();
    const errData = result.error as { code: string; hint?: string };
    expect(errData.code).toBe('NOT_INITIALIZED');
    expect(errData.hint).toContain('l1dder init');
  });

  it('shows next steps based on idle phase', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { phase: 'idle', iteration: 0 },
    });

    const result = await executeStatus(ctx);

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    const stepsData = result.data as { next_steps: Array<{ label: string }> };
    expect(stepsData.next_steps.length).toBeGreaterThan(0);

    const labels = stepsData.next_steps.map((s) => s.label);
    const hasSpecify = labels.some((l: string) => l.includes('iteration') || l.includes('specify') || l.includes('Specify'));
    const hasQuick = labels.some((l: string) => l.includes('quick') || l.includes('Quick'));
    expect(hasSpecify || hasQuick).toBe(true);
  });

  it('computes blocked correctly from dependency graph', async () => {
    const ctx = await createTestCtx({
      stateOverrides: {
        phase: 'implement',
        tasks: [
          { id: 'T-01', title: 'First', status: 'pending', depends_on: [] },
          { id: 'T-02', title: 'Second', status: 'pending', depends_on: ['T-01'] },
          { id: 'T-03', title: 'Third', status: 'pending', depends_on: ['T-02'] },
        ],
      },
    });

    const result = await executeStatus(ctx);

    // T-01 pending (deps met), T-02 blocked (T-01 not done), T-03 blocked (T-02 not done)
    const depData = result.data as { tasks: { pending: number; blocked: number; next_available: string | null } };
    expect(depData.tasks.pending).toBe(1);
    expect(depData.tasks.blocked).toBe(2);
    expect(depData.tasks.next_available).toBe('T-01');
  });

  it('shows complete phase next steps', async () => {
    const ctx = await createTestCtx({
      stateOverrides: { phase: 'complete' },
    });

    const result = await executeStatus(ctx);

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    const completeData = result.data as { next_steps: Array<{ label: string }> };
    const labels = completeData.next_steps.map((s) => s.label);
    expect(labels.some((l) => l.toLowerCase().includes('close'))).toBe(true);
  });
});
