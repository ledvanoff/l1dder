import { describe, expect, it } from 'vitest';
import {
  TRANSITIONS,
  TransitionKind,
} from '@l1dder/core';
import { FixedClock, NullLogger } from '@l1dder/core/testing';
import type { Phase, Actor, TriggerSource } from '@l1dder/schemas';

import { SoloApprover } from '../../adapters/solo-approver.js';
import { createTestState, createTestConfig } from '../../testing.js';
import { IdempotencyChecker } from './idempotency.js';
import { StageGuard } from './stage-guard.js';
import { GateEngine } from './gate-engine.js';
import { PhaseStatusManager } from './phase-status.js';
import { RollbackHandler } from './rollback.js';
import { TransitionPipeline } from './transition-pipeline.js';
import type { TransitionRequest } from './transition-pipeline.js';

const NOW = '2026-05-11T12:00:00Z';
const ACTOR: Actor = { kind: 'human', id: 'dev' };
const TRIGGER: TriggerSource = { kind: 'cli', command: 'transition' };

function createPipeline() {
  const clock = new FixedClock(NOW);
  const logger = new NullLogger();
  const approver = new SoloApprover(clock);

  return new TransitionPipeline({
    idempotency: new IdempotencyChecker(),
    stageGuard: new StageGuard(logger),
    gateEngine: new GateEngine(approver, logger, clock),
    phaseStatus: new PhaseStatusManager(),
    rollback: new RollbackHandler(),
    clock,
    logger,
  });
}

function makeRequest(to: Phase, overrides?: Partial<TransitionRequest>): TransitionRequest {
  return {
    to,
    trigger: TRIGGER,
    actor: ACTOR,
    ...overrides,
  };
}

describe('TransitionPipeline', () => {
  it('executes full forward transition specify→plan', async () => {
    const pipeline = createPipeline();
    const state = createTestState({
      workflow: { current_phase: 'specify', mode: 'main' },
    });
    const config = createTestConfig();

    const result = await pipeline.execute(state, config, makeRequest('plan'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.outcome.previousPhase).toBe('specify');
      expect(result.value.outcome.newPhase).toBe('plan');
      expect(result.value.outcome.kind).toBe('forward');
      expect(result.value.outcome.noop).toBe(false);
      expect(result.value.state.workflow.current_phase).toBe('plan');
      expect(result.value.state.workflow.current_status).toBe('in_progress');
    }
  });

  it('returns noop for idempotent transition', async () => {
    const pipeline = createPipeline();
    const state = createTestState({
      workflow: { current_phase: 'plan', mode: 'main' },
    });
    const config = createTestConfig();

    const result = await pipeline.execute(state, config, makeRequest('plan'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.outcome.noop).toBe(true);
      expect(result.value.outcome.previousPhase).toBe('plan');
      expect(result.value.outcome.newPhase).toBe('plan');
    }
  });

  it('blocks on hard stage guard', async () => {
    const pipeline = createPipeline();
    const state = createTestState({
      project: { stage: 'discovery' },
      workflow: { current_phase: 'tasks', mode: 'main' },
    });
    const config = createTestConfig({
      stage: { enforcement: { restrict_phases: 'enforced' } },
    });

    const result = await pipeline.execute(state, config, makeRequest('implement'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('STAGE_GUARD_BLOCKED');
    }
  });

  it('force bypasses gate check', async () => {
    const pipeline = createPipeline();
    const state = createTestState({
      workflow: { current_phase: 'specify', mode: 'main' },
    });
    const config = createTestConfig();

    const result = await pipeline.execute(
      state,
      config,
      makeRequest('plan', { force: true }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.outcome.newPhase).toBe('plan');
      expect(result.value.outcome.gateOutcome).toBeUndefined();
    }
  });

  it('dryRun validates without applying', async () => {
    const pipeline = createPipeline();
    const state = createTestState({
      workflow: { current_phase: 'specify', mode: 'main' },
    });
    const config = createTestConfig();

    const result = await pipeline.execute(
      state,
      config,
      makeRequest('plan', { dryRun: true }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.outcome.noop).toBe(false);
      // State should be unchanged
      expect(result.value.state.workflow.current_phase).toBe('specify');
    }
  });

  it('delegates rollback to RollbackHandler', async () => {
    const pipeline = createPipeline();
    const state = createTestState({
      workflow: { current_phase: 'plan', mode: 'main' },
    });
    const config = createTestConfig();

    const result = await pipeline.execute(
      state,
      config,
      makeRequest('specify'),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.outcome.kind).toBe('rollback');
      expect(result.value.outcome.newPhase).toBe('specify');
      expect(result.value.state.workflow.current_phase).toBe('specify');
      expect(result.value.state.workflow.current_status).toBe('revisited');
    }
  });

  it('appends phase_history entry on successful transition', async () => {
    const pipeline = createPipeline();
    const state = createTestState({
      workflow: { current_phase: 'idle', mode: 'main', phase_history: [] },
    });
    const config = createTestConfig();

    const result = await pipeline.execute(state, config, makeRequest('specify'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      const history = result.value.state.workflow.phase_history;
      expect(history).toHaveLength(1);
      const entry = history[0];
      expect(entry?.phase).toBe('specify');
      expect(entry?.started_at).toBe(NOW);
      expect(entry?.actor).toEqual(ACTOR);
      expect(entry?.trigger).toEqual(TRIGGER);
    }
  });

  it('rejects forbidden transition (not in table)', async () => {
    const pipeline = createPipeline();
    const state = createTestState({
      workflow: { current_phase: 'specify', mode: 'main' },
    });
    const config = createTestConfig();

    const result = await pipeline.execute(state, config, makeRequest('implement'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN_TRANSITION');
    }
  });

  it('full chain idle→specify→plan', async () => {
    const pipeline = createPipeline();
    const config = createTestConfig();

    // idle → specify
    const state1 = createTestState({
      workflow: { current_phase: 'idle', mode: 'main' },
    });
    const r1 = await pipeline.execute(state1, config, makeRequest('specify'));
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    // specify → plan
    const r2 = await pipeline.execute(r1.value.state, config, makeRequest('plan'));
    expect(r2.ok).toBe(true);
    if (r2.ok) {
      expect(r2.value.state.workflow.current_phase).toBe('plan');
      expect(r2.value.state.workflow.phase_history).toHaveLength(2);
    }
  });

  describe('parametrized: all transition rules', () => {
    const forwardAndModeSwitch = TRANSITIONS.filter(
      (r) =>
        r.kind === TransitionKind.FORWARD ||
        r.kind === TransitionKind.MODE_SWITCH,
    );

    it.each(
      forwardAndModeSwitch.map((r) => ({
        name: `${r.from}→${r.to} (${r.kind}, ${r.mode})`,
        rule: r,
      })),
    )('$name executes successfully', async ({ rule }) => {
      const pipeline = createPipeline();

      const state = createTestState({
        project: { stage: 'delivery' },
        workflow: {
          current_phase: rule.from,
          mode: rule.mode,
        },
      });
      const config = createTestConfig();

      const result = await pipeline.execute(
        state,
        config,
        makeRequest(rule.to, {
          force: true,
          trigger: { kind: 'cli', command: 'test' },
        }),
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.outcome.newPhase).toBe(rule.to);
        expect(result.value.outcome.kind).toBe(rule.kind);
      }
    });

    const rollbacks = TRANSITIONS.filter(
      (r) => r.kind === TransitionKind.ROLLBACK,
    );

    it.each(
      rollbacks.map((r) => ({
        name: `rollback ${r.from}→${r.to}`,
        rule: r,
      })),
    )('$name executes successfully', async ({ rule }) => {
      const pipeline = createPipeline();

      const state = createTestState({
        project: { stage: 'delivery' },
        workflow: {
          current_phase: rule.from,
          mode: rule.mode,
        },
      });
      const config = createTestConfig();

      const result = await pipeline.execute(
        state,
        config,
        makeRequest(rule.to),
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.outcome.kind).toBe('rollback');
      }
    });
  });
});
