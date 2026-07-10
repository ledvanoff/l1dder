import { describe, expect, it } from 'vitest';

import { createTestStateManager } from './testing.js';

describe('Integration: full main workflow', () => {
  it('init → transitions → tasks → complete', async () => {
    const manager = await createTestStateManager();

    const phases = [
      'specify',
      'plan',
      'update_tobe',
      'tasks',
      'implement',
      'update_asis',
      'complete',
      'idle',
    ] as const;

    for (const phase of phases) {
      const result = await manager.transition.execute({
        to: phase,
        trigger: { kind: 'cli', command: 'transition' },
        actor: { kind: 'human', id: 'dev' },
      });

      expect(result.ok, `transition to ${phase} should succeed`).toBe(true);
    }

    expect(manager.currentPosition().phase).toBe('idle');
    expect(manager.stateSnapshot().workflow.phase_history).toHaveLength(8);
  });

  it('task dependency enforcement in full workflow', async () => {
    const manager = await createTestStateManager({
      state: { workflow: { current_phase: 'tasks' } },
    });

    const state0 = manager.stateSnapshot();

    const addA = manager.task.addTask(state0, {
      id: 'A',
      title: 'First task',
    });
    expect(addA.ok).toBe(true);
    if (!addA.ok) return;
    manager._updateState(() => addA.value);

    const addB = manager.task.addTask(manager.stateSnapshot(), {
      id: 'B',
      title: 'Second task',
      depends_on: ['A'],
    });
    expect(addB.ok).toBe(true);
    if (!addB.ok) return;
    manager._updateState(() => addB.value);

    const startB1 = manager.task.startTask(manager.stateSnapshot(), 'B');
    expect(startB1.ok).toBe(false);
    if (!startB1.ok) {
      expect(startB1.error.code).toBe('DEPENDENCIES_NOT_MET');
    }

    const startA = manager.task.startTask(manager.stateSnapshot(), 'A');
    expect(startA.ok).toBe(true);
    if (!startA.ok) return;
    manager._updateState(() => startA.value);

    const completeA = manager.task.completeTask(manager.stateSnapshot(), 'A');
    expect(completeA.ok).toBe(true);
    if (!completeA.ok) return;
    manager._updateState(() => completeA.value);

    const startB2 = manager.task.startTask(manager.stateSnapshot(), 'B');
    expect(startB2.ok).toBe(true);

    if (startB2.ok) {
      manager._updateState(() => startB2.value);
      const next = manager.task.nextTask(manager.stateSnapshot());
      expect(next.ok).toBe(true);
      if (next.ok) expect(next.value).toBeNull();
    }
  });
});

describe('Integration: quick mode lifecycle', () => {
  it('idle → quick → commit → idle', async () => {
    const manager = await createTestStateManager();

    expect(manager.currentPosition().phase).toBe('idle');
    expect(manager.currentPosition().mode).toBe('main');

    const startResult = manager.quick.startQuick(
      manager.stateSnapshot(),
      'fix-typo',
      'Fix README typo',
    );
    expect(startResult.ok).toBe(true);
    if (!startResult.ok) return;
    manager._updateState(() => startResult.value);

    expect(manager.currentPosition().mode).toBe('quick');
    expect(manager.currentPosition().phase).toBe('quick_plan');

    const phases = ['quick_implement', 'quick_complete'] as const;
    for (const phase of phases) {
      const r = await manager.transition.execute({
        to: phase,
        trigger: { kind: 'auto', reason: 'done' },
        actor: { kind: 'human', id: 'dev' },
      });
      expect(r.ok, `quick transition to ${phase}`).toBe(true);
    }

    const qtSnap = manager.stateSnapshot().quick_tasks[0];
    expect(qtSnap).toBeDefined();
    if (!qtSnap) return;
    const commitResult = await manager.quick.commitQuick(
      manager.stateSnapshot(),
      qtSnap.id,
    );
    expect(commitResult.ok).toBe(true);
    if (!commitResult.ok) return;
    manager._updateState(() => commitResult.value);

    expect(manager.currentPosition().phase).toBe('idle');
    expect(manager.currentPosition().mode).toBe('main');
    const qtFinal = manager.stateSnapshot().quick_tasks[0];
    expect(qtFinal).toBeDefined();
    if (qtFinal) {
      expect(qtFinal.status).toBe('done');
    }
  });

  it('idle → fast → commit → idle', async () => {
    const manager = await createTestStateManager();

    const startResult = manager.quick.startFast(
      manager.stateSnapshot(),
      'hotfix',
      'Critical hotfix',
    );
    expect(startResult.ok).toBe(true);
    if (!startResult.ok) return;
    manager._updateState(() => startResult.value);

    expect(manager.currentPosition().mode).toBe('fast');
    expect(manager.currentPosition().phase).toBe('fast_implement');

    const r = await manager.transition.execute({
      to: 'fast_complete',
      trigger: { kind: 'auto', reason: 'done' },
      actor: { kind: 'human', id: 'dev' },
    });
    expect(r.ok).toBe(true);

    const qtSnap = manager.stateSnapshot().quick_tasks[0];
    expect(qtSnap).toBeDefined();
    if (!qtSnap) return;
    const commitResult = await manager.quick.commitFast(
      manager.stateSnapshot(),
      qtSnap.id,
    );
    expect(commitResult.ok).toBe(true);
    if (!commitResult.ok) return;
    manager._updateState(() => commitResult.value);

    expect(manager.currentPosition().phase).toBe('idle');
    expect(manager.currentPosition().mode).toBe('main');
  });
});

describe('Integration: crash recovery', () => {
  it('detects and resolves in-flight marker on load', async () => {
    const manager = await createTestStateManager({
      state: {
        workflow: { current_phase: 'specify' },
        _in_flight_transition: {
          from: 'specify',
          to: 'plan',
          started_at: '2026-05-11T10:00:00Z',
          actor: { kind: 'human', id: 'dev' },
          trigger: { kind: 'cli', command: 'transition' },
        },
      },
    });

    const inflight = manager.recovery.detect(manager.stateSnapshot());
    expect(inflight).not.toBeNull();
    if (!inflight) return;
    expect(inflight.from).toBe('specify');
    expect(inflight.to).toBe('plan');

    const resolved = manager.recovery.resolve(
      manager.stateSnapshot(),
      'resume',
      { now: () => '2026-05-11T12:00:00Z' },
    );
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.value.workflow.current_phase).toBe('plan');
      expect(resolved.value._in_flight_transition).toBeUndefined();
    }
  });

  it('resolves via rollback to original phase', async () => {
    const manager = await createTestStateManager({
      state: {
        workflow: { current_phase: 'specify' },
        _in_flight_transition: {
          from: 'specify',
          to: 'plan',
          started_at: '2026-05-11T10:00:00Z',
          actor: { kind: 'human', id: 'dev' },
          trigger: { kind: 'cli', command: 'transition' },
        },
      },
    });

    const resolved = manager.recovery.resolve(
      manager.stateSnapshot(),
      'rollback',
      { now: () => '2026-05-11T12:00:00Z' },
    );
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.value.workflow.current_phase).toBe('specify');
      expect(resolved.value._in_flight_transition).toBeUndefined();
    }
  });
});

describe('Integration: stage management', () => {
  it('advance discovery→delivery→maintenance', async () => {
    const manager = await createTestStateManager({
      state: {
        project: { stage: 'discovery' },
      },
      config: {
        stage: { enforcement: { require_criteria: 'off' } },
      },
    });

    const adv1 = await manager.stage.advanceStage(
      manager.stateSnapshot(),
      manager.configSnapshot(),
    );
    expect(adv1.ok).toBe(true);
    if (!adv1.ok) return;
    manager._updateState(() => adv1.value);
    expect(manager.currentPosition().stage).toBe('delivery');

    const adv2 = await manager.stage.advanceStage(
      manager.stateSnapshot(),
      manager.configSnapshot(),
    );
    expect(adv2.ok).toBe(true);
    if (!adv2.ok) return;
    manager._updateState(() => adv2.value);
    expect(manager.currentPosition().stage).toBe('maintenance');

    const adv3 = await manager.stage.advanceStage(
      manager.stateSnapshot(),
      manager.configSnapshot(),
    );
    expect(adv3.ok).toBe(false);

    expect(manager.stateSnapshot().project.stage_history).toHaveLength(2);
  });
});

describe('Integration: Decision Ledger', () => {
  it('addDecision appends to state.decisions[] with timestamp', async () => {
    const manager = await createTestStateManager();

    const result = await manager.addDecision({
      id: 'DEC-TEST-1',
      title: 'Use InMemoryFileSystem for testing',
      rationale: 'Avoids real FS access in tests and speeds up test runs.',
      alternatives: ['Use real FS with tmp dirs', 'Use virtual FS'],
      status: 'accepted',
    });

    expect(result.ok).toBe(true);
    const decisions = manager.stateSnapshot().decisions;
    expect(decisions).toHaveLength(1);
    const dec = decisions[0];
    expect(dec?.id).toBe('DEC-TEST-1');
    expect(dec?.title).toBe('Use InMemoryFileSystem for testing');
    expect(dec?.status).toBe('accepted');
    expect(typeof dec?.timestamp).toBe('string');
  });

  it('state.yml without decisions field parses with default []', async () => {
    const manager = await createTestStateManager();
    expect(manager.stateSnapshot().decisions).toEqual([]);
  });
});

describe('Integration: barrel re-exports', () => {
  it('exports all public symbols', async () => {
    const exports = await import('./index.js');

    expect(exports.StateManager).toBeDefined();
    expect(exports.TransitionPipeline).toBeDefined();
    expect(exports.IdempotencyChecker).toBeDefined();
    expect(exports.StageGuard).toBeDefined();
    expect(exports.GateEngine).toBeDefined();
    expect(exports.PhaseStatusManager).toBeDefined();
    expect(exports.RollbackHandler).toBeDefined();
    expect(exports.CrashRecovery).toBeDefined();
    expect(exports.TaskManager).toBeDefined();
    expect(exports.DependencyGraph).toBeDefined();
    expect(exports.QuickTaskManager).toBeDefined();
    expect(exports.StageManager).toBeDefined();
    expect(exports.DeliveryCriteriaChecker).toBeDefined();
    expect(exports.MigrationRunner).toBeDefined();
    expect(exports.AtomicWriter).toBeDefined();
    expect(exports.StateReader).toBeDefined();
    expect(exports.StateWriter).toBeDefined();
    expect(exports.StateInitializer).toBeDefined();
    expect(exports.SoloApprover).toBeDefined();
  });
});

describe('Integration: testing utilities with full wiring', () => {
  it('createTestStateManager returns manager with all sub-objects', async () => {
    const manager = await createTestStateManager();

    expect(manager.transition).toBeDefined();
    expect(manager.task).toBeDefined();
    expect(manager.quick).toBeDefined();
    expect(manager.stage).toBeDefined();
    expect(manager.recovery).toBeDefined();
    expect(manager.currentPosition()).toBeDefined();
  });

  it('transition.execute works through test manager', async () => {
    const manager = await createTestStateManager();

    const result = await manager.transition.execute({
      to: 'specify',
      trigger: { kind: 'cli', command: 'transition' },
      actor: { kind: 'human', id: 'dev' },
    });

    expect(result.ok).toBe(true);
    expect(manager.currentPosition().phase).toBe('specify');
  });
});
