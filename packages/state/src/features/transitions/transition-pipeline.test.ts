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

  describe('workflow profile enforcement', () => {
    // @tc TC-009-01-A
    it('rejects tasks→implement under product_discovery with ProfileRouteError and does not mutate state', async () => {
      const pipeline = createPipeline();
      const state = createTestState({
        project: { stage: 'delivery' },
        workflow: {
          current_phase: 'tasks',
          mode: 'main',
          profile: 'product_discovery',
        },
      });
      const before = structuredClone(state);
      const config = createTestConfig();

      const result = await pipeline.execute(state, config, makeRequest('implement'));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('PROFILE_ROUTE');
      }
      expect(state).toEqual(before);
    });

    it('allows tasks→implement→update_asis under delivery profile', async () => {
      const pipeline = createPipeline();
      const config = createTestConfig();

      const s1 = createTestState({
        project: { stage: 'delivery' },
        workflow: {
          current_phase: 'tasks',
          mode: 'main',
          profile: 'delivery',
        },
      });
      const r1 = await pipeline.execute(s1, config, makeRequest('implement'));
      expect(r1.ok).toBe(true);
      if (!r1.ok) return;

      const r2 = await pipeline.execute(
        r1.value.state,
        config,
        makeRequest('update_asis'),
      );
      expect(r2.ok).toBe(true);
      if (r2.ok) {
        expect(r2.value.state.workflow.current_phase).toBe('update_asis');
      }
    });

    it('allows plan→update_tobe under feature_discovery at delivery stage but rejects tasks→implement', async () => {
      const pipeline = createPipeline();
      const config = createTestConfig();

      const discoveryState = createTestState({
        project: { stage: 'delivery' },
        workflow: {
          current_phase: 'plan',
          mode: 'main',
          profile: 'feature_discovery',
        },
      });
      const allowed = await pipeline.execute(
        discoveryState,
        config,
        makeRequest('update_tobe'),
      );
      expect(allowed.ok).toBe(true);

      const deliveryAttempt = createTestState({
        project: { stage: 'delivery' },
        workflow: {
          current_phase: 'tasks',
          mode: 'main',
          profile: 'feature_discovery',
        },
      });
      const rejected = await pipeline.execute(
        deliveryAttempt,
        config,
        makeRequest('implement'),
      );
      expect(rejected.ok).toBe(false);
      if (!rejected.ok) {
        expect(rejected.error.code).toBe('PROFILE_ROUTE');
      }
    });

    it('force: true does not bypass the profile route', async () => {
      const pipeline = createPipeline();
      const state = createTestState({
        project: { stage: 'delivery' },
        workflow: {
          current_phase: 'tasks',
          mode: 'main',
          profile: 'product_discovery',
        },
      });
      const config = createTestConfig();

      const result = await pipeline.execute(
        state,
        config,
        makeRequest('implement', { force: true }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('PROFILE_ROUTE');
      }
    });

    it('given specify + delivery, returns to idle as an off-route escape', async () => {
      const pipeline = createPipeline();
      const state = createTestState({
        project: { stage: 'delivery' },
        workflow: {
          current_phase: 'specify',
          mode: 'main',
          profile: 'delivery',
        },
      });
      const config = createTestConfig();

      const result = await pipeline.execute(state, config, makeRequest('idle'));

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.outcome.kind).toBe('skip');
        expect(result.value.outcome.newPhase).toBe('idle');
        expect(result.value.state.workflow.current_phase).toBe('idle');
        const last = result.value.state.workflow.phase_history.at(-1);
        expect(last?.transition_kind).toBe('skip');
        expect(last?.metadata).toMatchObject({
          off_route_escape: true,
          escaped_from: 'specify',
          profile: 'delivery',
        });
      }
    });

    it('given specify + delivery, rejects plan and names idle as the allowed target', async () => {
      const pipeline = createPipeline();
      const state = createTestState({
        project: { stage: 'delivery' },
        workflow: {
          current_phase: 'specify',
          mode: 'main',
          profile: 'delivery',
        },
      });
      const config = createTestConfig();

      const result = await pipeline.execute(state, config, makeRequest('plan'));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('PROFILE_ROUTE');
        expect(result.error.message).toContain('Allowed targets: idle');
      }
    });

    it('given update_tobe + product_discovery, advances to complete', async () => {
      const pipeline = createPipeline();
      const state = createTestState({
        workflow: {
          current_phase: 'update_tobe',
          mode: 'main',
          profile: 'product_discovery',
        },
      });
      const config = createTestConfig();

      const result = await pipeline.execute(state, config, makeRequest('complete'));

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.outcome.newPhase).toBe('complete');
        expect(result.value.outcome.kind).toBe('forward');
      }
    });

    it('given update_tobe + product_discovery, advances to review', async () => {
      const pipeline = createPipeline();
      const state = createTestState({
        workflow: {
          current_phase: 'update_tobe',
          mode: 'main',
          profile: 'product_discovery',
        },
      });
      const config = createTestConfig();

      const result = await pipeline.execute(state, config, makeRequest('review'));

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.outcome.newPhase).toBe('review');
      }
    });

    it('given specify and no profile, still forbids a table-less jump to idle', async () => {
      const pipeline = createPipeline();
      const state = createTestState({
        workflow: {
          current_phase: 'specify',
          mode: 'main',
          profile: null,
        },
      });
      const config = createTestConfig();

      const result = await pipeline.execute(state, config, makeRequest('idle'));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('FORBIDDEN_TRANSITION');
      }
    });

    it('quick/fast mode transitions are unaffected by a selected profile', async () => {
      const pipeline = createPipeline();
      const config = createTestConfig();

      const quickState = createTestState({
        project: { stage: 'delivery' },
        workflow: {
          current_phase: 'idle',
          mode: 'quick',
          profile: 'product_discovery',
        },
      });
      const quick = await pipeline.execute(
        quickState,
        config,
        makeRequest('quick_plan'),
      );
      expect(quick.ok).toBe(true);

      const fastState = createTestState({
        project: { stage: 'delivery' },
        workflow: {
          current_phase: 'idle',
          mode: 'fast',
          profile: 'hygiene',
        },
      });
      const fast = await pipeline.execute(
        fastState,
        config,
        makeRequest('fast_implement'),
      );
      expect(fast.ok).toBe(true);
    });
  });
});
