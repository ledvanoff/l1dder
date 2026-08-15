import { describe, expect, it } from 'vitest';
import {
  FixedClock,
  InMemoryFileSystem,
  NullLogger,
} from '@l1dder/core/testing';

import { SoloApprover } from '../../adapters/solo-approver.js';
import { createTestConfig, createTestState } from '../../testing.js';
import { GateEngine } from '../transitions/gate-engine.js';
import { TaskCompletionGateCondition } from './task-completion-gate-condition.js';

const NOW = '2026-08-10T12:00:00Z';
const PROJECT_ROOT = '/project';
/** Deliberately not the default `specs/current/tasks.md`. */
const TASKS_PATH = '/project/specs/feat/tasks.md';

function createEngine(fs: InMemoryFileSystem): GateEngine {
  const clock = new FixedClock(NOW);
  return new GateEngine(
    new SoloApprover(clock),
    new NullLogger(),
    clock,
    new TaskCompletionGateCondition(fs, PROJECT_ROOT),
  );
}

/** Evaluate the implementation gate for `implement → update_asis`. */
async function evaluateGate(
  engine: GateEngine,
  config: ReturnType<typeof createTestConfig>,
  state: ReturnType<typeof createTestState>,
) {
  return engine.evaluate('implement', 'update_asis', 'main', config, {
    phase: 'implement',
    actor: { kind: 'human', id: 'dev' },
    state,
    config,
  });
}

describe('TaskCompletionGateCondition via GateEngine', () => {
  // @tc TC-004-02-A
  it('given two pending tasks, update_asis is blocked', async () => {
    const fs = new InMemoryFileSystem();
    const engine = createEngine(fs);
    const config = createTestConfig();
    const state = createTestState({
      workflow: { current_phase: 'implement' },
      tasks: {
        items: [
          { id: 'T-01', title: 'A', status: 'pending', depends_on: [] },
          { id: 'T-02', title: 'B', status: 'in_progress', depends_on: [] },
        ],
      },
    });

    const result = await engine.evaluate(
      'implement',
      'update_asis',
      'main',
      config,
      {
        phase: 'implement',
        actor: { kind: 'human', id: 'dev' },
        state,
        config,
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('GATE_REJECTED');
    expect(result.error.message).toContain('TASKS_INCOMPLETE');
    expect(result.error.message).toContain('T-01');
    expect(result.error.message).toContain('T-02');
  });

  it('given all tasks done, the transition succeeds', async () => {
    const fs = new InMemoryFileSystem();
    const engine = createEngine(fs);
    const config = createTestConfig();
    const state = createTestState({
      workflow: { current_phase: 'implement' },
      tasks: {
        items: [
          { id: 'T-01', title: 'A', status: 'done', depends_on: [] },
          { id: 'T-02', title: 'B', status: 'skipped', depends_on: [] },
        ],
      },
    });

    const result = await engine.evaluate(
      'implement',
      'update_asis',
      'main',
      config,
      {
        phase: 'implement',
        actor: { kind: 'human', id: 'dev' },
        state,
        config,
      },
    );

    expect(result.ok).toBe(true);
  });

  it('given a tasks.md outside the default path and an empty projection, the gate fails closed', async () => {
    const fs = new InMemoryFileSystem();
    await fs.mkdir('/project/specs/feat');
    await fs.writeFile(TASKS_PATH, '## Task List\n');
    const engine = createEngine(fs);
    const config = createTestConfig();
    const state = createTestState({
      workflow: { current_phase: 'implement' },
      tasks: { items: [] },
    });

    const result = await engine.evaluate(
      'implement',
      'update_asis',
      'main',
      config,
      {
        phase: 'implement',
        actor: { kind: 'human', id: 'dev' },
        state,
        config,
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('GATE_REJECTED');
    expect(result.error.message).toContain('TASKS_PROJECTION_EMPTY');
    expect(result.error.message).toContain('specs/feat/tasks.md');
    expect(result.error.message).toContain('l1dder task sync');
  });

  it('names the synced source_path when the projection is empty', async () => {
    const fs = new InMemoryFileSystem();
    await fs.mkdir('/project/specs/other');
    await fs.writeFile('/project/specs/other/tasks.md', '## Task List\n');
    const engine = createEngine(fs);
    const config = createTestConfig();
    const state = createTestState({
      workflow: { current_phase: 'implement' },
      tasks: { items: [], source_path: 'specs/other/tasks.md' },
    });

    const result = await evaluateGate(engine, config, state);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('specs/other/tasks.md');
  });

  it('opens the gate when the project has no task document at all', async () => {
    const fs = new InMemoryFileSystem();
    const engine = createEngine(fs);
    const config = createTestConfig();
    const state = createTestState({
      workflow: { current_phase: 'implement' },
      tasks: { items: [] },
    });

    const result = await evaluateGate(engine, config, state);

    expect(result.ok).toBe(true);
  });

  it('still evaluates conditions when skip_allowed would skip approval', async () => {
    const fs = new InMemoryFileSystem();
    await fs.mkdir('/project/specs/feat');
    await fs.writeFile(TASKS_PATH, '## Task List\n');
    const engine = createEngine(fs);
    const config = createTestConfig({
      gates: {
        default: { skip_allowed: true },
      },
    });
    const state = createTestState({
      workflow: { current_phase: 'implement' },
      tasks: { items: [] },
    });

    const result = await engine.evaluate(
      'implement',
      'update_asis',
      'main',
      config,
      {
        phase: 'implement',
        actor: { kind: 'human', id: 'dev' },
        state,
        config,
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('TASKS_PROJECTION_EMPTY');
  });
});
