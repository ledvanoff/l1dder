import type { ClockPort, Phase, WorkflowProfileId } from '@l1dder/core';
import {
  TransitionKind,
  listAvailableTransitions,
  listProfileTransitions,
  recommendProfile,
} from '@l1dder/core';
import type {
  Config,
  DiscoveryMilestone,
  DiscoveryMilestoneId,
  DiscoveryMilestoneStatus,
  GateRecord,
  InFlightTransition,
  PhaseStatus,
  ProjectStage,
  State,
  WorkflowMode,
} from '@l1dder/schemas';

import { DiscoveryOrchestrator } from '../discovery/discovery-orchestrator.js';
import type { MilestoneBlockerCode } from '../discovery/discovery-orchestrator.js';
import {
  EmptyDebtBacklogIndex,
  type DebtBacklogIndexPort,
  type PlanningCandidate,
} from './debt-backlog-index-port.js';
import {
  EmptyDeliveryRailIndex,
  type DeliveryRailIndexPort,
  type DeliveryRailSession,
} from './delivery-rail-index-port.js';
import {
  resolvePrimaryAction,
  type PrimaryAction,
} from './primary-action.js';
import {
  EmptyReadinessEvidence,
  type ReadinessEvidencePort,
  type ReadinessGap,
} from './readiness-evidence-port.js';
import { nextEligibleSession } from '../session/roadmap-rail-guard.js';
import {
  resolveNextAvailableTaskId,
  satisfiedDependencyIds,
} from '../tasks/dependency-graph.js';

/** Project stage slice of the workflow projection. */
export interface StageProjection {
  readonly current: ProjectStage;
  /** Whether discovery is READY (`readiness.ready`). */
  readonly discoveryReady: boolean;
}

/** One row in the ordered 7-item discovery checklist. */
export interface MilestoneChecklistItem {
  readonly id: DiscoveryMilestoneId;
  readonly status: DiscoveryMilestoneStatus;
  readonly required: boolean;
  readonly evidenceCount: number;
  readonly plannedSessionCount: number;
  /** Planned Agent Session ids linked from the milestone. */
  readonly plannedSessions: readonly string[];
}

/** Ordered discovery milestone checklist and cursor. */
export interface MilestoneProjection {
  /** Always 7 rows in IDEA→READY order (defaults fill gaps). */
  readonly items: readonly MilestoneChecklistItem[];
  /** Cursor from state, or `null` when unset / all closed. */
  readonly current: DiscoveryMilestoneId | null;
  readonly closed: number;
  readonly total: number;
}

/** Selected vs recommended workflow profile. */
export interface ProfileProjection {
  /** Explicit selection, or `null` when enforcement is off. */
  readonly selected: WorkflowProfileId | null;
  /** Advisory suggestion from {@link recommendProfile}; never auto-applied. */
  readonly recommended: WorkflowProfileId;
  /**
   * `true` only when a profile is explicitly selected (`workflow.profile !== null`).
   * `null` profile means enforcement off / legacy behavior.
   */
  readonly enforced: boolean;
}

/**
 * Active Agent Session rail projection from `state.workflow.session`.
 *
 * `null` on the parent {@link WorkflowProjection.session} when no session has
 * been started. Status/profile come from the rail index when available.
 * `iteration` is `null` when the session is not tracked on the delivery rails yet.
 */
export interface SessionProjection {
  readonly iteration: string | null;
  readonly session: string;
  readonly status: DeliveryRailSession['status'] | null;
  readonly profile: WorkflowProfileId;
}

/**
 * Transition-table facts for one reachable target phase.
 *
 * `trigger` is the machine trigger source (`slash:plan`, `cli:rollback`) — the
 * human-visible slash reference is derived by presentation via
 * `slashTriggerToRef`, never stored twice.
 */
export interface TransitionOptionProjection {
  readonly to: Phase;
  readonly trigger: string;
  readonly gates: readonly string[];
}

/** Current phase facts plus profile-filtered alternatives. */
export interface PhaseProjection {
  readonly current: Phase;
  readonly status: PhaseStatus;
  readonly mode: WorkflowMode;
  /**
   * Allowed MAIN-mode targets from {@link listProfileTransitions}.
   * Profile routes are a whitelist, not a mandatory linear path.
   */
  readonly alternatives: readonly Phase[];
  /**
   * Forward (or mode-switch) transition available from the current phase, with
   * its trigger and gates. `null` when the phase has no forward move.
   */
  readonly nextTransition: TransitionOptionProjection | null;
  /**
   * Rollback targets allowed from the current phase, filtered by the active
   * profile route in MAIN mode.
   */
  readonly rollbackTargets: readonly Phase[];
}

/** Gate awaiting / last evaluation facts. */
export interface GateProjection {
  readonly awaiting: boolean;
  readonly lastGate: GateRecord | null;
}

/** READY evidence + milestone-closure aggregate. */
export interface ReadinessProjection {
  /** Every applicable milestone is complete or not_applicable. */
  readonly milestonesClosed: boolean;
  /** Whether MVP coverage / registry consistency were actually verified. */
  readonly evidenceAvailable: boolean;
  readonly gaps: readonly ReadinessGap[];
  /** `milestonesClosed && gaps.length === 0`. */
  readonly ready: boolean;
}

/** Stable blocker codes owned by the projection itself. */
export type ProjectionBlockerCode =
  | 'IN_FLIGHT_TRANSITION'
  | 'PROFILE_NOT_SELECTED'
  | 'DISCOVERY_NOT_READY'
  | 'MVP_COVERAGE_MISSING'
  | 'REGISTRY_INCONSISTENT'
  | 'SESSION_OFF_ROAD';

/**
 * Stop vs status semantics for a projection blocker.
 *
 * `hard` — `/l1dder-next` must surface the blocker and STOP.
 * `advisory` — current workflow state already addressed by the Primary Action
 * (or otherwise non-blocking); print and continue.
 */
export type ProjectionBlockerLevel = 'hard' | 'advisory';

/** Stable, serializable blocker surfaced to humans and CLI. */
export interface ProjectionBlocker {
  readonly code: ProjectionBlockerCode | MilestoneBlockerCode;
  readonly message: string;
  readonly milestone?: DiscoveryMilestoneId;
  readonly level: ProjectionBlockerLevel;
}

/** Milestone and task progress counters. */
export interface ProgressProjection {
  readonly milestonesClosed: number;
  readonly milestonesTotal: number;
  readonly tasksTotal: number;
  readonly tasksDone: number;
  readonly tasksInProgress: number;
  /**
   * Pending tasks whose `depends_on` are all done/skipped (ready to start).
   */
  readonly tasksPending: number;
  /**
   * Pending tasks with at least one unmet dependency (not yet startable).
   */
  readonly tasksBlocked: number;
  readonly tasksSkipped: number;
  /**
   * Next pending task id in topological order with deps met, or `null`
   * when none is available (empty list, all finished, or cycle).
   */
  readonly nextAvailable: string | null;
}

/**
 * Crash-recovery facts from `state._in_flight_transition`, or a clean marker.
 */
export type RecoveryProjection =
  | {
      readonly clean: true;
    }
  | {
      readonly clean: false;
      readonly from: Phase;
      readonly to: Phase;
      readonly startedAt: string;
      readonly actor: InFlightTransition['actor'];
    };

/**
 * Single read model for "where am I and what should I do next".
 *
 * Flat, JSON-serializable, free of class instances so CLI `--json` can print
 * it directly. Assembled in fixed order:
 * Stage → Milestone → Profile → Session → Phase → Gate → Primary Action,
 * plus blockers, progress, recovery, readiness, and advisory planning candidates.
 *
 * This is the only recommender later consumers (CLI `status`/`helpme`/`doctor`,
 * `/l1dder-next`, Control Center) should consult.
 */
export interface WorkflowProjection {
  readonly stage: StageProjection;
  readonly milestone: MilestoneProjection;
  readonly profile: ProfileProjection;
  /**
   * Active Agent Session from `state.workflow.session`, or `null` when unset.
   */
  readonly session: SessionProjection | null;
  /**
   * Next eligible delivery-rail session (`pending` + deps met), or `null`
   * when the rail index is empty or nothing is eligible.
   */
  readonly nextEligible: { readonly iteration: string; readonly session: string } | null;
  readonly phase: PhaseProjection;
  readonly gate: GateProjection;
  readonly primaryAction: PrimaryAction;
  readonly blockers: readonly ProjectionBlocker[];
  readonly progress: ProgressProjection;
  readonly recovery: RecoveryProjection;
  readonly readiness: ReadinessProjection;
  readonly planningCandidates: readonly PlanningCandidate[];
}

/** Injectable collaborators for {@link WorkflowProjectionService}. */
export interface WorkflowProjectionDeps {
  readonly clock: ClockPort;
  /** Defaults to a new {@link DiscoveryOrchestrator} over `clock`. */
  readonly orchestrator?: DiscoveryOrchestrator;
  /** Defaults to {@link EmptyDebtBacklogIndex}. */
  readonly debtBacklog?: DebtBacklogIndexPort;
  /** Defaults to {@link EmptyReadinessEvidence}. */
  readonly readiness?: ReadinessEvidencePort;
  /** Defaults to {@link EmptyDeliveryRailIndex}. */
  readonly deliveryRails?: DeliveryRailIndexPort;
}

const CLOSED_STATUSES: ReadonlySet<DiscoveryMilestoneStatus> = new Set([
  'complete',
  'not_applicable',
]);

/**
 * Read-only assembler of {@link WorkflowProjection}.
 *
 * Hard invariants:
 * - no filesystem or CLI access;
 * - never mutates the input `State` (fresh objects only);
 * - all time via the injected {@link ClockPort} (used when constructing the
 *   default orchestrator; projection itself reads timestamps from state);
 * - `project` is async only because ports are async.
 */
export class WorkflowProjectionService {
  private readonly orchestrator: DiscoveryOrchestrator;
  private readonly debtBacklog: DebtBacklogIndexPort;
  private readonly readinessEvidence: ReadinessEvidencePort;
  private readonly deliveryRails: DeliveryRailIndexPort;

  /**
   * @param deps - clock (required; used for the default orchestrator) plus
   *   optional orchestrator / debt index / readiness / delivery-rails overrides.
   */
  constructor(deps: WorkflowProjectionDeps) {
    this.orchestrator =
      deps.orchestrator ?? new DiscoveryOrchestrator(deps.clock);
    this.debtBacklog = deps.debtBacklog ?? new EmptyDebtBacklogIndex();
    this.readinessEvidence = deps.readiness ?? new EmptyReadinessEvidence();
    this.deliveryRails = deps.deliveryRails ?? new EmptyDeliveryRailIndex();
  }

  /**
   * Build a full {@link WorkflowProjection} for `state`.
   *
   * @param state - current project state (not mutated)
   * @param _config - reserved for future gate/config-driven nuances; unused in HARD-2
   */
  async project(
    state: State,
    _config?: Config,
  ): Promise<WorkflowProjection> {
    const milestones = this.orchestrator.list(state);
    const milestonesClosed = this.orchestrator.isReady(state);
    const closed = milestones.filter((m) => CLOSED_STATUSES.has(m.status)).length;

    const evidence = await this.readinessEvidence.collect();
    const readiness: ReadinessProjection = {
      milestonesClosed,
      evidenceAvailable: evidence.available,
      gaps: evidence.gaps,
      ready: milestonesClosed && evidence.gaps.length === 0,
    };

    const stage: StageProjection = {
      current: state.project.stage,
      discoveryReady: readiness.ready,
    };

    const milestone: MilestoneProjection = {
      items: milestones.map(toChecklistItem),
      current: this.orchestrator.current(state),
      closed,
      total: milestones.length,
    };

    const selected = state.workflow.profile;
    const recommended = recommendProfile(state.project.stage);
    const profile: ProfileProjection = {
      selected,
      recommended,
      enforced: selected !== null,
    };

    const rails = await this.deliveryRails.load();
    const active = state.workflow.session ?? null;
    const railMatch =
      active === null
        ? undefined
        : rails.find((entry) => entry.session === active.session);
    const session: SessionProjection | null =
      active === null
        ? null
        : {
            iteration: active.iteration,
            session: active.session,
            status: railMatch?.status ?? null,
            profile: active.profile,
          };

    const eligible = nextEligibleSession(rails);
    const nextEligible =
      eligible === null
        ? null
        : { iteration: eligible.iteration, session: eligible.session };

    const currentPhase = state.workflow.current_phase;
    const alternatives = listProfileTransitions(selected, currentPhase);
    const mode = state.workflow.mode;
    const phase: PhaseProjection = {
      current: currentPhase,
      status: state.workflow.current_status,
      mode,
      alternatives,
      nextTransition: resolveNextTransition(currentPhase, mode, alternatives),
      rollbackTargets: resolveRollbackTargets(currentPhase, mode, alternatives),
    };

    const lastGateEntry =
      state.workflow.gate_history[state.workflow.gate_history.length - 1];
    const gate: GateProjection = {
      awaiting: state.workflow.current_status === 'awaiting_gate',
      lastGate: lastGateEntry ?? null,
    };

    const inFlight = state._in_flight_transition;
    const recovery: RecoveryProjection =
      inFlight === undefined
        ? { clean: true }
        : {
            clean: false,
            from: inFlight.from,
            to: inFlight.to,
            startedAt: inFlight.started_at,
            actor: inFlight.actor,
          };

    const openMilestone = resolveOpenMilestone(milestones, milestone.current);
    const openRecord = openMilestone
      ? (milestones.find((m) => m.id === openMilestone) ?? null)
      : null;
    const missingEvidence =
      openRecord !== null &&
      (openRecord.status === 'in_progress' ||
        openRecord.status === 'in_review') &&
      openRecord.evidence.length === 0;

    const blockers = collectBlockers({
      state,
      orchestrator: this.orchestrator,
      discoveryReady: readiness.ready,
      openMilestone,
      midFlight: isMidFlight(state, milestones),
      hasInFlight: inFlight !== undefined,
      profileSelected: selected !== null,
      readinessGaps: readiness.gaps,
      rails,
    });

    const progress: ProgressProjection = {
      milestonesClosed: closed,
      milestonesTotal: milestones.length,
      ...countTaskProgress(state),
    };

    const planningCandidates = await loadPlanningCandidates(this.debtBacklog);

    const primaryAction = resolvePrimaryAction({
      hasInFlightTransition: inFlight !== undefined,
      selectedProfile: selected,
      recommendedProfile: recommended,
      projectStage: state.project.stage,
      currentPhase,
      discoveryReady: readiness.ready,
      currentMilestoneId: openMilestone,
      currentMilestoneStatus: openRecord?.status ?? null,
      missingEvidence,
      allowedTransitions: alternatives,
    });

    return {
      stage,
      milestone,
      profile,
      session,
      nextEligible,
      phase,
      gate,
      primaryAction,
      blockers,
      progress,
      recovery,
      readiness,
      planningCandidates,
    };
  }
}

/**
 * Forward (or mode-switch) transition available from `from`, if any.
 *
 * In MAIN mode the target must also be allowed by the active profile route, so
 * the projection never advertises a move the profile would reject.
 */
function resolveNextTransition(
  from: Phase,
  mode: WorkflowMode,
  profileTargets: readonly Phase[],
): TransitionOptionProjection | null {
  const rule = listAvailableTransitions(from, mode).find(
    (candidate) =>
      (candidate.kind === TransitionKind.FORWARD ||
        candidate.kind === TransitionKind.MODE_SWITCH) &&
      (mode !== 'main' || profileTargets.includes(candidate.to)),
  );
  if (rule === undefined) {
    return null;
  }
  return { to: rule.to, trigger: rule.trigger, gates: [...rule.gates] };
}

/**
 * Rollback targets allowed from `from`, filtered by the profile route in MAIN.
 */
function resolveRollbackTargets(
  from: Phase,
  mode: WorkflowMode,
  profileTargets: readonly Phase[],
): readonly Phase[] {
  return listAvailableTransitions(from, mode)
    .filter((rule) => rule.kind === TransitionKind.ROLLBACK)
    .map((rule) => rule.to)
    .filter((to) => mode !== 'main' || profileTargets.includes(to));
}

/**
 * Count task rows by status and resolve the next startable task id.
 *
 * Pending tasks with unmet `depends_on` are counted as blocked (not pending).
 * `nextAvailable` is `null` when the dependency graph has a cycle.
 */
function countTaskProgress(
  state: State,
): Pick<
  ProgressProjection,
  | 'tasksTotal'
  | 'tasksDone'
  | 'tasksInProgress'
  | 'tasksPending'
  | 'tasksBlocked'
  | 'tasksSkipped'
  | 'nextAvailable'
> {
  const items = state.tasks.items;
  const doneIds = satisfiedDependencyIds(items);
  // A dependency cycle has no startable task; the cycle itself is reported by
  // task commands, not by the read-only projection.
  const nextAvailable = resolveNextAvailableTaskId(items);

  let tasksDone = 0;
  let tasksInProgress = 0;
  let tasksPending = 0;
  let tasksBlocked = 0;
  let tasksSkipped = 0;

  for (const task of items) {
    switch (task.status) {
      case 'done':
        tasksDone += 1;
        break;
      case 'in_progress':
        tasksInProgress += 1;
        break;
      case 'skipped':
        tasksSkipped += 1;
        break;
      case 'pending': {
        const unmet = task.depends_on.some((dep) => !doneIds.has(dep));
        if (unmet) {
          tasksBlocked += 1;
        } else {
          tasksPending += 1;
        }
        break;
      }
    }
  }

  return {
    tasksTotal: items.length,
    tasksDone,
    tasksInProgress,
    tasksPending,
    tasksBlocked,
    tasksSkipped,
    nextAvailable: nextAvailable.ok ? nextAvailable.value : null,
  };
}

/**
 * Map a milestone record to a flat checklist row.
 */
function toChecklistItem(m: DiscoveryMilestone): MilestoneChecklistItem {
  return {
    id: m.id,
    status: m.status,
    required: m.required,
    evidenceCount: m.evidence.length,
    plannedSessionCount: m.planned_sessions.length,
    plannedSessions: [...m.planned_sessions],
  };
}

/**
 * Resolve the milestone the primary action should target.
 *
 * Prefers `discovery.current` when it is still open; otherwise the first
 * non-closed row from the ordered checklist.
 */
function resolveOpenMilestone(
  milestones: readonly DiscoveryMilestone[],
  current: DiscoveryMilestoneId | null,
): DiscoveryMilestoneId | null {
  if (current !== null) {
    const cursor = milestones.find((m) => m.id === current);
    if (cursor && !CLOSED_STATUSES.has(cursor.status)) {
      return current;
    }
  }
  const firstOpen = milestones.find((m) => !CLOSED_STATUSES.has(m.status));
  return firstOpen?.id ?? null;
}

/**
 * Whether the project has left the fresh idle/pending baseline.
 *
 * Used only for the advisory `PROFILE_NOT_SELECTED` blocker — profile selection
 * remains a primary action whenever `workflow.profile === null`.
 */
function isMidFlight(
  state: State,
  milestones: readonly DiscoveryMilestone[],
): boolean {
  if (state.workflow.current_phase !== 'idle') {
    return true;
  }
  if (state.project.stage !== 'discovery') {
    return true;
  }
  return milestones.some((m) => m.status !== 'pending');
}

/**
 * Aggregate orchestrator + projection-level blockers.
 *
 * Existing blockers first; readiness gaps appended in port order.
 */
function collectBlockers(args: {
  readonly state: State;
  readonly orchestrator: DiscoveryOrchestrator;
  readonly discoveryReady: boolean;
  readonly openMilestone: DiscoveryMilestoneId | null;
  readonly midFlight: boolean;
  readonly hasInFlight: boolean;
  readonly profileSelected: boolean;
  readonly readinessGaps: readonly ReadinessGap[];
  readonly rails: readonly DeliveryRailSession[];
}): ProjectionBlocker[] {
  const blockers: ProjectionBlocker[] = [];

  if (args.hasInFlight) {
    const marker = args.state._in_flight_transition;
    blockers.push({
      code: 'IN_FLIGHT_TRANSITION',
      message: marker
        ? `Unresolved in-flight transition from "${marker.from}" to "${marker.to}".`
        : 'Unresolved in-flight transition marker.',
      level: 'hard',
    });
  }

  if (!args.profileSelected && args.midFlight) {
    blockers.push({
      code: 'PROFILE_NOT_SELECTED',
      message:
        'No workflow profile is selected while the project is mid-flight; choose a profile explicitly.',
      level: 'advisory',
    });
  }

  if (args.state.project.stage === 'discovery' && !args.discoveryReady) {
    blockers.push({
      code: 'DISCOVERY_NOT_READY',
      message:
        'Discovery stage is active but not every applicable milestone is closed.',
      level: 'advisory',
    });
  }

  if (args.openMilestone !== null) {
    for (const blocker of args.orchestrator.blockers(
      args.state,
      args.openMilestone,
    )) {
      blockers.push({
        ...blocker,
        milestone: args.openMilestone,
        level: milestoneBlockerLevel(blocker.code),
      });
    }
  }

  for (const gap of args.readinessGaps) {
    blockers.push({
      code: gap.code,
      message: gap.message,
      level: 'hard',
    });
  }

  const active = args.state.workflow.session ?? null;
  if (
    active !== null &&
    args.rails.length > 0 &&
    !args.rails.some((entry) => entry.session === active.session)
  ) {
    blockers.push({
      code: 'SESSION_OFF_ROAD',
      message: `Active session "${active.session}" is not present on the delivery rails.`,
      level: 'hard',
    });
  }

  return blockers;
}

/**
 * Milestone-lifecycle codes that describe work the Primary Action will collect
 * (plan summary / evidence) are advisory. Order, unknown-id, and already-closed
 * codes remain hard stops.
 */
function milestoneBlockerLevel(
  code: MilestoneBlockerCode,
): ProjectionBlockerLevel {
  switch (code) {
    case 'MILESTONE_PLAN_INCOMPLETE':
    case 'MILESTONE_EVIDENCE_REQUIRED':
      return 'advisory';
    default:
      return 'hard';
  }
}

/**
 * Load advisory planning candidates from the debt/backlog index.
 *
 * Never copies nomination fields — `approved` is always `false`.
 */
async function loadPlanningCandidates(
  port: DebtBacklogIndexPort,
): Promise<readonly PlanningCandidate[]> {
  const [debt, backlog] = await Promise.all([
    port.listOpenDebt(),
    port.listOpenBacklog(),
  ]);

  const candidates: PlanningCandidate[] = [];

  for (const item of debt) {
    candidates.push({
      id: item.id,
      kind: 'debt',
      title: item.title,
      weight: item.severity,
      source: item.source,
      links: [...item.links],
      approved: false,
    });
  }

  for (const item of backlog) {
    candidates.push({
      id: item.id,
      kind: 'backlog',
      title: item.title,
      weight: item.priority,
      source: item.source,
      links: [...item.links],
      approved: false,
    });
  }

  return candidates;
}
