import type { WorkflowProjection } from '@l1dder/state';
import type {
  BriefWorkflowSnapshot,
  PrimaryActionBrief,
} from '@l1dder/schemas';

/** Blocker brief shared by projection-backed CLI commands. */
export interface BlockerBrief {
  readonly code: string;
  readonly message: string;
  readonly milestone?: string;
  readonly level: 'hard' | 'advisory';
}

/**
 * Map {@link WorkflowProjection.primaryAction} into the CLI/schema brief shape.
 *
 * Always emits `needs_input` and `required_inputs` so every projection-backed
 * surface shares one object (HARD-7). `required_inputs` is empty when the
 * command is executable as issued.
 */
export function toPrimaryActionBrief(
  projection: WorkflowProjection,
): PrimaryActionBrief {
  const action = projection.primaryAction;
  const needsInput = action.needsInput === true;
  return {
    kind: action.kind,
    command: action.command,
    reason: action.reason,
    needs_input: needsInput,
    required_inputs: needsInput
      ? (action.requiredInputs ?? []).map((input) => ({
          flag: input.flag,
          description: input.description,
          ...(input.repeatable === true ? { repeatable: true } : {}),
        }))
      : [],
  };
}

/**
 * Map projection blockers into the CLI brief shape (stable `code` preserved).
 */
export function toBlockerBriefs(
  projection: WorkflowProjection,
): readonly BlockerBrief[] {
  return projection.blockers.map((b) => ({
    code: b.code,
    message: b.message,
    level: b.level,
    ...(b.milestone !== undefined ? { milestone: b.milestone } : {}),
  }));
}

/**
 * Map {@link WorkflowProjection} into {@link BriefWorkflowSnapshot} for Project Brief.
 *
 * Single reusable mapping for `l1dder context` and cross-command consistency checks.
 */
export function toBriefWorkflowSnapshot(
  projection: WorkflowProjection,
): BriefWorkflowSnapshot {
  const currentId = projection.milestone.current;
  const milestoneItem =
    currentId === null
      ? undefined
      : projection.milestone.items.find((item) => item.id === currentId);

  return {
    stage: projection.stage.current,
    milestone:
      milestoneItem !== undefined
        ? { id: milestoneItem.id, status: milestoneItem.status }
        : currentId !== null
          ? { id: currentId, status: 'pending' }
          : null,
    profile: projection.profile.selected,
    session: projection.session?.session ?? null,
    phase: projection.phase.current,
    phase_status: projection.phase.status,
    gate: resolveGateLabel(projection),
    primary_action: toPrimaryActionBrief(projection),
  };
}

/**
 * One-line quiet summary: current phase + Primary Action.
 */
export function formatQuietSummary(
  phase: string,
  primaryAction: PrimaryActionBrief,
): string {
  const action = primaryAction.command || primaryAction.kind;
  return `${phase} → ${action}`;
}

function resolveGateLabel(projection: WorkflowProjection): string | null {
  if (projection.gate.awaiting) {
    return projection.gate.lastGate?.gate_id ?? 'awaiting';
  }
  return projection.gate.lastGate?.gate_id ?? null;
}
