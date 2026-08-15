import { describe, expect, it } from 'vitest';
import {
  DISCOVERY_MILESTONE_ORDER,
  listProfileTransitions,
} from '@l1dder/core';
import { FixedClock } from '@l1dder/core/testing';
import type { BacklogItem, DebtItem, State } from '@l1dder/schemas';

import { createTestState } from '../../testing.js';
import { DiscoveryOrchestrator } from '../discovery/discovery-orchestrator.js';
import type { DebtBacklogIndexPort } from './debt-backlog-index-port.js';
import type {
  DeliveryRailIndexPort,
  DeliveryRailSession,
} from './delivery-rail-index-port.js';
import type { ReadinessEvidencePort } from './readiness-evidence-port.js';
import { WorkflowProjectionService } from './workflow-projection-service.js';

const NOW = '2026-05-11T12:00:00Z';
const ACTOR = { kind: 'human' as const, id: 'dev' };

function createService(opts?: {
  debtBacklog?: DebtBacklogIndexPort;
  readiness?: ReadinessEvidencePort;
  deliveryRails?: DeliveryRailIndexPort;
}): {
  service: WorkflowProjectionService;
  orch: DiscoveryOrchestrator;
} {
  const clock = new FixedClock(NOW);
  const orch = new DiscoveryOrchestrator(clock);
  const service = new WorkflowProjectionService({
    clock,
    orchestrator: orch,
    ...(opts?.debtBacklog !== undefined ? { debtBacklog: opts.debtBacklog } : {}),
    ...(opts?.readiness !== undefined ? { readiness: opts.readiness } : {}),
    ...(opts?.deliveryRails !== undefined
      ? { deliveryRails: opts.deliveryRails }
      : {}),
  });
  return { service, orch };
}

/** Inline fake delivery-rail index for session projection tests. */
class FakeDeliveryRailIndex implements DeliveryRailIndexPort {
  constructor(private readonly sessions: readonly DeliveryRailSession[]) {}

  load(): Promise<readonly DeliveryRailSession[]> {
    return Promise.resolve(this.sessions);
  }
}

function initialized(orch: DiscoveryOrchestrator): State {
  const result = orch.initialize(
    createTestState({
      workflow: { profile: 'product_discovery' },
    }),
  );
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error('initialize failed');
  }
  return result.value;
}

/** Delivery-stage state parked at a given phase, all milestones closed. */
function deliveryStateAtPhase(
  orch: DiscoveryOrchestrator,
  phase: State['workflow']['current_phase'],
): State {
  const closed = closeAll(orch, initialized(orch));
  return {
    ...closed,
    project: { ...closed.project, stage: 'delivery' },
    workflow: {
      ...closed.workflow,
      profile: 'delivery',
      current_phase: phase,
      current_status: 'in_progress',
      mode: 'main',
    },
  };
}

function closeAll(orch: DiscoveryOrchestrator, state: State): State {
  let current = state;
  for (const mid of DISCOVERY_MILESTONE_ORDER) {
    const m = current.discovery.milestones.find((x) => x.id === mid);
    if (!m || m.status === 'complete' || m.status === 'not_applicable') {
      continue;
    }
    const waived = orch.waive(current, mid, {
      reason: `test close ${mid}`,
      actor: ACTOR,
    });
    expect(waived.ok).toBe(true);
    if (!waived.ok) {
      throw new Error(`failed to close ${mid}`);
    }
    current = waived.value;
  }
  return current;
}

/** Inline fake index for TC-001-05-A. */
class FakeDebtBacklogIndex implements DebtBacklogIndexPort {
  constructor(
    private readonly debt: readonly DebtItem[],
    private readonly backlog: readonly BacklogItem[],
  ) {}

  listOpenDebt(): Promise<readonly DebtItem[]> {
    return Promise.resolve(this.debt);
  }

  listOpenBacklog(): Promise<readonly BacklogItem[]> {
    return Promise.resolve(this.backlog);
  }
}

describe('WorkflowProjectionService', () => {
  it('given an in-flight marker, primaryAction is resolve_recovery and recovery exposes from/to', async () => {
    const { service, orch } = createService();
    let state = initialized(orch);
    const started = orch.startBrainstorm(state, 'idea');
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    state = {
      ...started.value,
      _in_flight_transition: {
        from: 'idle',
        to: 'specify',
        started_at: NOW,
        actor: ACTOR,
        trigger: { kind: 'cli', command: 'l1dder transition' },
      },
    };

    const projection = await service.project(state);

    expect(projection.primaryAction.kind).toBe('resolve_recovery');
    expect(
      projection.blockers.some(
        (b) => b.code === 'IN_FLIGHT_TRANSITION' && b.level === 'hard',
      ),
    ).toBe(true);
    expect(projection.recovery).toEqual({
      clean: false,
      from: 'idle',
      to: 'specify',
      startedAt: NOW,
      actor: ACTOR,
    });
  });

  it('given workflow.profile === null, action is select_profile, enforced false, recommended matches stage', async () => {
    const { service } = createService();
    const state = createTestState({
      project: { stage: 'discovery' },
      workflow: { profile: null },
    });

    const projection = await service.project(state);

    expect(projection.primaryAction.kind).toBe('select_profile');
    expect(projection.profile.enforced).toBe(false);
    expect(projection.profile.selected).toBeNull();
    expect(projection.profile.recommended).toBe('product_discovery');
    expect(projection.primaryAction.reason).toContain('product_discovery');
    expect(
      projection.blockers.filter((b) => b.level === 'hard'),
    ).toEqual([]);
    expect(
      projection.blockers.some(
        (b) => b.code === 'DISCOVERY_NOT_READY' && b.level === 'advisory',
      ),
    ).toBe(true);
  });

  it('maps selected-profile milestone statuses to the matching primary actions', async () => {
    const { service, orch } = createService();
    let state = initialized(orch);

    let projection = await service.project(state);
    expect(projection.primaryAction.kind).toBe('start_brainstorm');
    expect(projection.primaryAction.milestone).toBe('idea');

    const brainstorming = orch.startBrainstorm(state, 'idea');
    expect(brainstorming.ok).toBe(true);
    if (!brainstorming.ok) return;
    state = brainstorming.value;
    projection = await service.project(state);
    expect(projection.primaryAction.kind).toBe('plan_milestone');
    expect(projection.primaryAction.needsInput).toBe(true);
    expect(
      projection.blockers.some(
        (b) =>
          b.code === 'MILESTONE_PLAN_INCOMPLETE' && b.level === 'advisory',
      ),
    ).toBe(true);
    expect(
      projection.blockers.filter((b) => b.level === 'hard'),
    ).toEqual([]);

    const planned = orch.plan(state, 'idea', {
      summary: 'Ship the idea narrative',
      sessions: ['S-idea-1'],
    });
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    state = planned.value;
    projection = await service.project(state);
    expect(projection.primaryAction.kind).toBe('start_milestone');

    const inProgress = orch.startWork(state, 'idea');
    expect(inProgress.ok).toBe(true);
    if (!inProgress.ok) return;
    state = inProgress.value;
    projection = await service.project(state);
    expect(projection.primaryAction.kind).toBe('complete_milestone');
    expect(projection.primaryAction.needsInput).toBe(true);
    expect(
      projection.blockers.some(
        (b) =>
          b.code === 'MILESTONE_EVIDENCE_REQUIRED' &&
          b.level === 'advisory' &&
          b.message.toLowerCase().includes('evidence'),
      ),
    ).toBe(true);
    expect(
      projection.blockers.filter((b) => b.level === 'hard'),
    ).toEqual([]);
  });

  it('given every milestone closed while stage is discovery → advance_stage', async () => {
    const { service, orch } = createService();
    const state = closeAll(orch, initialized(orch));

    const projection = await service.project(state);

    expect(projection.stage.discoveryReady).toBe(true);
    expect(projection.stage.current).toBe('discovery');
    expect(projection.primaryAction.kind).toBe('advance_stage');
  });

  it('given delivery + delivery profile + closed discovery → transition_phase with allowed to', async () => {
    const { service, orch } = createService();
    let state = closeAll(orch, initialized(orch));
    state = {
      ...state,
      project: {
        ...state.project,
        stage: 'delivery',
      },
      workflow: {
        ...state.workflow,
        profile: 'delivery',
        current_phase: 'tasks',
        current_status: 'in_progress',
        mode: 'main',
      },
    };

    const allowed = listProfileTransitions('delivery', 'tasks');
    expect(allowed.length).toBeGreaterThan(0);

    const projection = await service.project(state);

    expect(projection.primaryAction.kind).toBe('transition_phase');
    expect(projection.primaryAction.to).toBeDefined();
    expect(allowed).toContain(projection.primaryAction.to);
    expect(projection.phase.alternatives).toEqual([...allowed]);
  });

  it('exposes the forward transition with its real trigger and gates', async () => {
    const { service, orch } = createService();
    const state = deliveryStateAtPhase(orch, 'implement');

    const projection = await service.project(state);

    expect(projection.phase.nextTransition).toEqual({
      to: 'update_asis',
      trigger: 'slash:update-asis',
      gates: ['implementation-gate'],
    });
  });

  it('exposes rollback targets allowed from the current phase', async () => {
    const { service, orch } = createService();
    const state = deliveryStateAtPhase(orch, 'implement');

    const projection = await service.project(state);

    expect(projection.phase.rollbackTargets).toEqual(['tasks']);
  });

  it('hides a rollback target the active profile route forbids', async () => {
    const { service, orch } = createService();
    const state = deliveryStateAtPhase(orch, 'tasks');

    // The table allows tasks → plan, but the delivery profile route does not.
    const projection = await service.project(state);

    expect(projection.phase.rollbackTargets).toEqual([]);
  });

  // @tc TC-001-05-A
  it('TC-001-05-A: open DEBT/BL items become advisory planningCandidates with approved === false', async () => {
    const debt: DebtItem = {
      id: 'DEBT-001',
      title: 'Tighten projection contracts',
      status: 'open',
      severity: 'high',
      source: 'knowledge/roadmap.md#debt-001',
      links: ['FEAT-005'],
      nomination: {
        iteration: 'iter-hard',
        approved_by: 'should-not-leak',
        approved_at: NOW,
      },
    };
    const backlog: BacklogItem = {
      id: 'BL-001',
      title: 'Control Center polish',
      status: 'open',
      priority: 'medium',
      kind: 'feature',
      source: 'knowledge/roadmap.md#bl-001',
      links: ['UC-005-01'],
    };
    const { service } = createService({
      debtBacklog: new FakeDebtBacklogIndex([debt], [backlog]),
    });
    const state = createTestState({
      workflow: { profile: 'product_discovery' },
    });
    const before = structuredClone(state);

    const projection = await service.project(state);

    expect(projection.planningCandidates).toHaveLength(2);
    expect(projection.planningCandidates[0]).toEqual({
      id: 'DEBT-001',
      kind: 'debt',
      title: 'Tighten projection contracts',
      weight: 'high',
      source: 'knowledge/roadmap.md#debt-001',
      links: ['FEAT-005'],
      approved: false,
    });
    expect(projection.planningCandidates[1]).toEqual({
      id: 'BL-001',
      kind: 'backlog',
      title: 'Control Center polish',
      weight: 'medium',
      source: 'knowledge/roadmap.md#bl-001',
      links: ['UC-005-01'],
      approved: false,
    });
    for (const candidate of projection.planningCandidates) {
      expect(candidate.approved).toBe(false);
    }
    expect(projection.session).toBeNull();
    expect(projection.nextEligible).toBeNull();
    expect(state).toEqual(before);
    expect(JSON.stringify(projection)).not.toContain('should-not-leak');
    expect(JSON.stringify(projection)).not.toContain('nomination');
  });

  it('READY gaps from evidence port block discoveryReady and surface as blockers', async () => {
    const readiness: ReadinessEvidencePort = {
      collect: () =>
        Promise.resolve({
          available: true,
          gaps: [
            {
              code: 'MVP_COVERAGE_MISSING',
              ref: 'FEAT-001',
              message: 'FEAT-001 has no covering delivery plan row',
            },
          ],
        }),
    };
    const { service, orch } = createService({ readiness });
    const state = closeAll(orch, initialized(orch));

    const projection = await service.project(state);

    expect(projection.readiness.milestonesClosed).toBe(true);
    expect(projection.readiness.evidenceAvailable).toBe(true);
    expect(projection.readiness.ready).toBe(false);
    expect(projection.stage.discoveryReady).toBe(false);
    expect(
      projection.blockers.some(
        (b) => b.code === 'MVP_COVERAGE_MISSING' && b.level === 'hard',
      ),
    ).toBe(true);
  });

  it('default empty readiness port: closed milestones ⇒ ready true, evidenceAvailable false', async () => {
    const { service, orch } = createService();
    const state = closeAll(orch, initialized(orch));

    const projection = await service.project(state);

    expect(projection.readiness.milestonesClosed).toBe(true);
    expect(projection.readiness.evidenceAvailable).toBe(false);
    expect(projection.readiness.gaps).toEqual([]);
    expect(projection.readiness.ready).toBe(true);
    expect(projection.stage.discoveryReady).toBe(true);
  });

  it('session stays null when workflow.session is unset', async () => {
    const { service, orch } = createService();
    const states: State[] = [
      createTestState(),
      initialized(orch),
      closeAll(orch, initialized(orch)),
    ];

    for (const state of states) {
      const projection = await service.project(state);
      expect(projection.session).toBeNull();
      expect(projection.nextEligible).toBeNull();
    }
  });

  it('projects workflow.session and nextEligible from the delivery rail index', async () => {
    const rails: DeliveryRailSession[] = [
      {
        iteration: 'ITER-001',
        session: 'HARD-4',
        title: 'Prior',
        status: 'done',
        profile: 'delivery',
        dependsOn: [],
      },
      {
        iteration: 'ITER-001',
        session: 'HARD-5',
        title: 'Current',
        status: 'in_progress',
        profile: 'delivery',
        dependsOn: ['HARD-4'],
      },
      {
        iteration: 'ITER-001',
        session: 'HARD-6',
        title: 'Next',
        status: 'pending',
        profile: 'delivery',
        dependsOn: ['HARD-5'],
      },
    ];
    const { service } = createService({
      deliveryRails: new FakeDeliveryRailIndex(rails),
    });
    const state = createTestState({
      workflow: {
        profile: 'delivery',
        session: {
          iteration: 'ITER-001',
          session: 'HARD-5',
          profile: 'delivery',
          started_at: NOW,
          waiver: null,
        },
      },
    });

    const projection = await service.project(state);

    expect(projection.session).toEqual({
      iteration: 'ITER-001',
      session: 'HARD-5',
      status: 'in_progress',
      profile: 'delivery',
    });
    expect(projection.nextEligible).toBeNull();
    expect(
      projection.blockers.some((blocker) => blocker.code === 'SESSION_OFF_ROAD'),
    ).toBe(false);
  });

  it('emits SESSION_OFF_ROAD only when an active session is missing from non-empty rails', async () => {
    const { service } = createService({
      deliveryRails: new FakeDeliveryRailIndex([
        {
          iteration: 'ITER-001',
          session: 'HARD-5',
          title: 'On rail',
          status: 'pending',
          profile: 'delivery',
          dependsOn: [],
        },
      ]),
    });
    const state = createTestState({
      workflow: {
        profile: 'delivery',
        session: {
          iteration: null,
          session: 'HARD-9',
          profile: 'delivery',
          started_at: NOW,
          waiver: null,
        },
      },
    });

    const projection = await service.project(state);

    expect(
      projection.blockers.some(
        (blocker) =>
          blocker.code === 'SESSION_OFF_ROAD' && blocker.level === 'hard',
      ),
    ).toBe(true);
    expect(projection.nextEligible).toEqual({
      iteration: 'ITER-001',
      session: 'HARD-5',
    });
  });

  it('project() does not mutate its input state', async () => {
    const { service, orch } = createService();
    const state = initialized(orch);
    const before = structuredClone(state);

    await service.project(state);

    expect(state).toEqual(before);
  });

  it('given mixed task statuses, progress exposes per-status counters and nextAvailable', async () => {
    const { service } = createService();
    const state = createTestState({
      workflow: { profile: 'delivery' },
      tasks: {
        items: [
          {
            id: 'T-01',
            title: 'Done',
            status: 'done',
            depends_on: [],
          },
          {
            id: 'T-02',
            title: 'In progress',
            status: 'in_progress',
            depends_on: [],
          },
          {
            id: 'T-03',
            title: 'Ready pending',
            status: 'pending',
            depends_on: [],
          },
          {
            id: 'T-04',
            title: 'Blocked pending',
            status: 'pending',
            depends_on: ['T-03'],
          },
          {
            id: 'T-05',
            title: 'Skipped',
            status: 'skipped',
            depends_on: [],
          },
        ],
      },
    });
    const before = structuredClone(state);

    const projection = await service.project(state);

    expect(projection.progress).toMatchObject({
      tasksTotal: 5,
      tasksDone: 1,
      tasksInProgress: 1,
      tasksPending: 1,
      tasksBlocked: 1,
      tasksSkipped: 1,
      nextAvailable: 'T-03',
    });
    expect(state).toEqual(before);
  });

  it('given an empty task list, progress counters are zero and nextAvailable is null', async () => {
    const { service } = createService();
    const state = createTestState({ workflow: { profile: 'delivery' } });

    const projection = await service.project(state);

    expect(projection.progress.tasksTotal).toBe(0);
    expect(projection.progress.tasksDone).toBe(0);
    expect(projection.progress.tasksInProgress).toBe(0);
    expect(projection.progress.tasksPending).toBe(0);
    expect(projection.progress.tasksBlocked).toBe(0);
    expect(projection.progress.tasksSkipped).toBe(0);
    expect(projection.progress.nextAvailable).toBeNull();
  });

  it('milestone always yields the 7 ordered milestones even when discovery.milestones is empty', async () => {
    const { service } = createService();
    const state = createTestState({
      discovery: { milestones: [], current: null, waivers: [] },
      workflow: { profile: 'product_discovery' },
    });
    expect(state.discovery.milestones).toHaveLength(0);

    const projection = await service.project(state);

    expect(projection.milestone.items).toHaveLength(7);
    expect(projection.milestone.items.map((m) => m.id)).toEqual([
      ...DISCOVERY_MILESTONE_ORDER,
    ]);
    expect(projection.milestone.total).toBe(7);
    expect(projection.milestone.items.every((m) => m.status === 'pending')).toBe(
      true,
    );
  });

});
