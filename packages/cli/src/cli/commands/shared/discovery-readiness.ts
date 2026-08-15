import type { StateManager, WorkflowProjection, ReadinessRecommendation } from '@l1dder/state';
import { recommend } from '@l1dder/state';
import type { DiscoveryMilestoneId, PrimaryActionBrief } from '@l1dder/schemas';

import {
  toBlockerBriefs,
  toPrimaryActionBrief,
  type BlockerBrief,
} from './projection-brief.js';

/** Human labels for the ordered discovery checklist. */
const MILESTONE_LABELS: Readonly<Record<DiscoveryMilestoneId, string>> = {
  idea: 'Idea',
  product: 'Product',
  architecture: 'Architecture',
  integrations: 'Integrations',
  data: 'Data',
  standards: 'Standards',
  ready: 'Ready',
};

/** One row in the shared ordered discovery checklist. */
export interface ChecklistMilestone {
  readonly order: number;
  readonly id: string;
  readonly label: string;
  readonly status: string;
  readonly met: boolean;
  readonly required: boolean;
  readonly evidence_count: number;
  readonly planned_session_count: number;
  readonly planned_sessions: readonly string[];
  readonly current: boolean;
  readonly detail?: string | undefined;
}

/** Shared discovery checklist view used by status / helpme / stage / doctor / discovery. */
export interface DiscoveryChecklistView {
  readonly ready: boolean;
  readonly score: string;
  readonly current: string | null;
  readonly next_milestone: string | null;
  readonly milestones: readonly ChecklistMilestone[];
  readonly gaps: readonly string[];
  readonly message: string;
  readonly blockers: readonly BlockerBrief[];
  readonly primary_action: PrimaryActionBrief;
  /** READY evidence slice from the single projection. */
  readonly readiness: WorkflowProjection['readiness'];
  /** Underlying projection — available for detailed mode. */
  readonly projection: WorkflowProjection;
  /** Legacy recommendation shape for recommend()-compatible callers. */
  readonly recommendation: ReadinessRecommendation;
}

/**
 * Build the single ordered discovery checklist from {@link StateManager.projection}.
 *
 * This is the only place CLI commands should obtain checklist ids/statuses.
 * Do not re-derive readiness from file heuristics here.
 */
export async function evaluateDiscoveryReadiness(
  sm: StateManager,
): Promise<DiscoveryChecklistView> {
  const projection = await sm.projection.project();
  const cursor = projection.milestone.current;
  const milestones: ChecklistMilestone[] = projection.milestone.items.map(
    (item, index) => {
      const met = item.status === 'complete' || item.status === 'not_applicable';
      const label = MILESTONE_LABELS[item.id];
      return {
        order: index + 1,
        id: item.id,
        label,
        status: item.status,
        met,
        required: item.required,
        evidence_count: item.evidenceCount,
        planned_session_count: item.plannedSessionCount,
        planned_sessions: item.plannedSessions,
        current: cursor === item.id,
        detail: met ? undefined : `Status: ${item.status}`,
      };
    },
  );

  const criteria = milestones.map((m) => ({
    id: m.id,
    order: m.order,
    label: m.label,
    met: m.met,
    detail: m.detail ?? (m.met ? 'ok' : `Status: ${m.status}`),
  }));

  const recommendation = recommend(criteria);
  const firstOpen = milestones.find((m) => !m.met);

  return {
    ready: projection.stage.discoveryReady,
    score: `${String(projection.milestone.closed)}/${String(projection.milestone.total)}`,
    current: cursor,
    next_milestone: firstOpen?.id ?? null,
    milestones,
    gaps: recommendation.gaps,
    message: recommendation.message,
    blockers: toBlockerBriefs(projection),
    primary_action: toPrimaryActionBrief(projection),
    readiness: projection.readiness,
    projection,
    recommendation,
  };
}
