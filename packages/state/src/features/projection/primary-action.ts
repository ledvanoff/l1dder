import type { Phase, WorkflowProfileId } from '@l1dder/core';
import type {
  DiscoveryMilestoneId,
  DiscoveryMilestoneStatus,
  ProjectStage,
} from '@l1dder/schemas';

/** Discriminator for the single next action a human (or `/l1dder-next`) should take. */
export type PrimaryActionKind =
  | 'resolve_recovery'
  | 'select_profile'
  | 'start_brainstorm'
  | 'plan_milestone'
  | 'start_milestone'
  | 'complete_milestone'
  | 'advance_stage'
  | 'transition_phase'
  | 'none';

/**
 * One flag a human must supply before the Primary Action command can run.
 *
 * Values must be substantive project content — never placeholders.
 */
export interface PrimaryActionRequiredInput {
  readonly flag: string;
  readonly description: string;
  readonly repeatable?: boolean;
}

/**
 * One recommended next step produced by the workflow projection.
 *
 * Commands are kept in {@link PRIMARY_ACTION_COMMANDS} so CLI surface renames
 * stay localized to this module.
 *
 * When {@link PrimaryAction.needsInput} is true, `command` is a prefix only:
 * collect {@link PrimaryAction.requiredInputs} from the human and append those
 * flags before executing. Do not run the prefix as-is and do not invent values.
 */
export interface PrimaryAction {
  readonly kind: PrimaryActionKind;
  /** Suggested CLI invocation, e.g. `l1dder discovery start product`. */
  readonly command: string;
  /** Why this action is next — surfaced to the human verbatim. */
  readonly reason: string;
  readonly milestone?: DiscoveryMilestoneId;
  readonly to?: Phase;
  /**
   * True when the command cannot run until the human supplies
   * {@link PrimaryAction.requiredInputs}.
   */
  readonly needsInput?: boolean;
  readonly requiredInputs?: readonly PrimaryActionRequiredInput[];
}

/**
 * Plausible CLI invocations for each {@link PrimaryActionKind}.
 *
 * Keep templates here so HARD-5/HARD-7 consumers do not hard-code strings.
 */
export const PRIMARY_ACTION_COMMANDS = {
  resolveRecovery: 'l1dder doctor --fix',
  selectProfile: (profile: WorkflowProfileId) =>
    `l1dder profile select ${profile}`,
  startBrainstorm: (id: DiscoveryMilestoneId) =>
    `l1dder discovery start ${id}`,
  planMilestone: (id: DiscoveryMilestoneId) => `l1dder discovery plan ${id}`,
  startMilestone: (id: DiscoveryMilestoneId) =>
    `l1dder discovery start ${id}`,
  completeMilestone: (id: DiscoveryMilestoneId) =>
    `l1dder discovery complete ${id}`,
  advanceStage: 'l1dder stage advance',
  transitionPhase: (to: Phase) => `l1dder transition --to ${to}`,
  none: '',
} as const;

/**
 * Required human-authored flags for Primary Actions that cannot run as a
 * prefix. Keep descriptions free of placeholder values the agent could copy.
 */
export const PRIMARY_ACTION_REQUIRED_INPUTS = {
  planMilestone: [
    {
      flag: '--summary',
      description:
        'Non-empty brainstorm/plan summary for this milestone. Write the real decision, not a placeholder.',
    },
    {
      flag: '--session',
      description:
        'At least one planned Agent Session id to attach to this milestone.',
      repeatable: true,
    },
  ],
  completeMilestone: [
    {
      flag: '--evidence',
      description:
        'At least one evidence path or note that this milestone is done. Do not use a placeholder.',
      repeatable: true,
    },
  ],
} as const satisfies {
  readonly planMilestone: readonly PrimaryActionRequiredInput[];
  readonly completeMilestone: readonly PrimaryActionRequiredInput[];
};

/** Facts already assembled by {@link import('./workflow-projection-service.js').WorkflowProjectionService}. */
export interface PrimaryActionInput {
  /** Whether `state._in_flight_transition` is present. */
  readonly hasInFlightTransition: boolean;
  /** Explicitly selected profile, or `null` when enforcement is off. */
  readonly selectedProfile: WorkflowProfileId | null;
  /** Advisory recommendation — never silently applied. */
  readonly recommendedProfile: WorkflowProfileId;
  readonly projectStage: ProjectStage;
  /** Phase the workflow currently sits in. */
  readonly currentPhase: Phase;
  /** True when every applicable discovery milestone is closed. */
  readonly discoveryReady: boolean;
  /**
   * Current open milestone cursor, or `null` when unset / all closed.
   * Callers resolve defaults (e.g. first open from the checklist).
   */
  readonly currentMilestoneId: DiscoveryMilestoneId | null;
  /** Status of {@link PrimaryActionInput.currentMilestoneId}, when known. */
  readonly currentMilestoneStatus: DiscoveryMilestoneStatus | null;
  /**
   * True when the current milestone lacks evidence required to complete
   * (`in_progress` / `in_review` with empty evidence).
   */
  readonly missingEvidence: boolean;
  /**
   * Allowed MAIN-mode targets from {@link import('@l1dder/core').listProfileTransitions}.
   * First entry is treated as the sensible forward target.
   */
  readonly allowedTransitions: readonly Phase[];
}

/**
 * Map already-computed projection facts to a single next action.
 *
 * Pure and table-driven: does not read `State`, perform I/O, or invent session
 * rails. Priority order is fixed — see implementation.
 */
export function resolvePrimaryAction(input: PrimaryActionInput): PrimaryAction {
  if (input.hasInFlightTransition) {
    return {
      kind: 'resolve_recovery',
      command: PRIMARY_ACTION_COMMANDS.resolveRecovery,
      reason:
        'An in-flight phase transition marker is unresolved; recover before continuing.',
    };
  }

  if (input.selectedProfile === null) {
    const recommended = input.recommendedProfile;
    return {
      kind: 'select_profile',
      command: PRIMARY_ACTION_COMMANDS.selectProfile(recommended),
      reason: `No workflow profile is selected; recommended profile for stage "${input.projectStage}" is "${recommended}".`,
    };
  }

  if (!input.discoveryReady) {
    return resolveDiscoveryAction(input);
  }

  if (input.projectStage === 'discovery') {
    return {
      kind: 'advance_stage',
      command: PRIMARY_ACTION_COMMANDS.advanceStage,
      reason:
        'All discovery milestones are closed while the project stage is still discovery; advance to delivery.',
    };
  }

  const to = pickForwardTarget(input.allowedTransitions);
  if (to !== undefined) {
    return {
      kind: 'transition_phase',
      command: PRIMARY_ACTION_COMMANDS.transitionPhase(to),
      reason: `Discovery is complete; next allowed phase transition is to "${to}".`,
      to,
    };
  }

  // A profile route is a phase whitelist, so it can legitimately offer no
  // forward step from the current phase (e.g. `delivery` at `idle`, whose entry
  // transition is owned by the roadmap rail work, not by this read model).
  // Say so instead of implying the project has nothing left to do.
  return {
    kind: 'none',
    command: PRIMARY_ACTION_COMMANDS.none,
    reason: `Profile "${input.selectedProfile}" allows no forward transition from phase "${input.currentPhase}"; start from a roadmap entry or switch profile.`,
  };
}

/**
 * Derive the discovery-lifecycle action from the current milestone status.
 */
function resolveDiscoveryAction(input: PrimaryActionInput): PrimaryAction {
  const id = input.currentMilestoneId;
  const status = input.currentMilestoneStatus;

  if (id === null || status === null) {
    return {
      kind: 'none',
      command: PRIMARY_ACTION_COMMANDS.none,
      reason: 'Discovery is incomplete but no current milestone is available.',
    };
  }

  switch (status) {
    case 'pending':
      return {
        kind: 'start_brainstorm',
        command: PRIMARY_ACTION_COMMANDS.startBrainstorm(id),
        reason: `Milestone "${id}" is pending; start brainstorming.`,
        milestone: id,
      };
    case 'brainstorming':
      return {
        kind: 'plan_milestone',
        command: PRIMARY_ACTION_COMMANDS.planMilestone(id),
        reason: `Milestone "${id}" is brainstorming; capture the plan next.`,
        milestone: id,
        needsInput: true,
        requiredInputs: PRIMARY_ACTION_REQUIRED_INPUTS.planMilestone,
      };
    case 'planned':
      return {
        kind: 'start_milestone',
        command: PRIMARY_ACTION_COMMANDS.startMilestone(id),
        reason: `Milestone "${id}" is planned; start execution.`,
        milestone: id,
      };
    case 'in_progress':
    case 'in_review': {
      const evidenceNote = input.missingEvidence
        ? ' Evidence is missing — add at least one evidence entry before completing.'
        : '';
      return {
        kind: 'complete_milestone',
        command: PRIMARY_ACTION_COMMANDS.completeMilestone(id),
        reason: `Milestone "${id}" is ${status}; complete it when ready.${evidenceNote}`,
        milestone: id,
        needsInput: true,
        requiredInputs: PRIMARY_ACTION_REQUIRED_INPUTS.completeMilestone,
      };
    }
    case 'complete':
    case 'not_applicable':
      return {
        kind: 'none',
        command: PRIMARY_ACTION_COMMANDS.none,
        reason: `Current milestone "${id}" is already closed (${status}).`,
        milestone: id,
      };
  }
}

/**
 * Prefer the first allowed target as the sensible forward step.
 *
 * `listProfileTransitions` already preserves transition-table order and
 * filters by profile whitelist.
 */
function pickForwardTarget(allowed: readonly Phase[]): Phase | undefined {
  return allowed[0];
}
