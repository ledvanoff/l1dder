import { DISCOVERY_MILESTONE_ORDER } from '@l1dder/core';
import type { DiscoveryMilestoneId } from '@l1dder/schemas';

import type { CriterionResult, DeliveryCriteriaResult } from './delivery-criteria.js';

/** A single discovery milestone in the ordered checklist. */
export interface DiscoveryMilestone {
  /** Display order (1 = first milestone). */
  readonly order: number;
  /** Machine identifier from the IDEA→READY order. */
  readonly id: string;
  readonly label: string;
  readonly met: boolean;
  /** Human-readable reason for failure (absent when met). */
  readonly detail?: string | undefined;
}

/** Output of the Readiness Recommender. */
export interface ReadinessRecommendation {
  /** True when all enabled required criteria are met. */
  readonly ready: boolean;
  /** Human-readable score, e.g. "3/7". */
  readonly score: string;
  /** Ordered list of discovery milestones (only enabled ones). */
  readonly milestones: readonly DiscoveryMilestone[];
  /** ID of the first unmet milestone (hint for «next step»). Absent when all met. */
  readonly nextMilestone?: string | undefined;
  /** Labels of unmet milestones (for gap summary). */
  readonly gaps: readonly string[];
  /** Advisory message about the project-level discovery→delivery transition. */
  readonly message: string;
}

/**
 * Canonical ordered discovery milestone IDs for the readiness checklist.
 *
 * Roadmap is intentionally absent — it is the human control plane, not a gate
 * (DEC-HARD-01).
 */
const MILESTONE_IDS: readonly DiscoveryMilestoneId[] = DISCOVERY_MILESTONE_ORDER;

/**
 * Build an ordered Discovery Checklist and advisory recommendation from the
 * evaluated criteria result.
 *
 * Pure function — no I/O, no external dependencies.
 *
 * Only criteria whose ids are in the IDEA→READY order are included. Extraneous
 * legacy ids (e.g. `roadmap`, `design`) are ignored so callers cannot
 * reintroduce a second checklist.
 */
export function recommend(result: DeliveryCriteriaResult): ReadinessRecommendation {
  const byId = new Map<string, CriterionResult>();
  for (const c of result) {
    byId.set(c.id, c);
  }

  const milestones: DiscoveryMilestone[] = [];
  for (const id of MILESTONE_IDS) {
    const c = byId.get(id);
    if (!c) continue;
    milestones.push({
      order: milestones.length + 1,
      id: c.id,
      label: c.label,
      met: c.met,
      detail: c.met ? undefined : c.detail,
    });
  }

  const allMet = milestones.length > 0 && milestones.every((m) => m.met);
  const totalEnabled = milestones.length;
  const metCount = milestones.filter((m) => m.met).length;

  const gaps = milestones.filter((m) => !m.met).map((m) => m.label);
  const firstUnmet = milestones.find((m) => !m.met);
  const nextMilestone = firstUnmet?.id;

  const score = `${String(metCount)}/${String(totalEnabled)}`;
  const message = buildMessage(allMet, firstUnmet);

  return {
    ready: allMet,
    score,
    milestones,
    nextMilestone,
    gaps,
    message,
  };
}

function buildMessage(
  allMet: boolean,
  nextMilestone: DiscoveryMilestone | undefined,
): string {
  if (allMet) {
    return 'All discovery milestones are complete — the project is ready to transition discovery → delivery.';
  }

  if (!nextMilestone) {
    return 'Complete the remaining discovery milestones before transitioning to delivery.';
  }

  switch (nextMilestone.id) {
    case 'idea':
      return 'Start by brainstorming the product idea (`l1dder discovery start idea`).';
    case 'product':
      return 'Plan and complete the product milestone (use cases / MVP scope) next.';
    case 'architecture':
      return 'Work out the to-be architecture before advancing further.';
    case 'integrations':
      return 'Close integrations (complete with evidence, or `l1dder discovery skip integrations --reason ...`).';
    case 'data':
      return 'Document the data model before continuing.';
    case 'standards':
      return 'Close standards (complete, or skip with rationale when inherited).';
    case 'ready':
      return 'Close the ready milestone once every prior applicable milestone is done.';
    default:
      return 'Complete the remaining discovery milestones before transitioning to delivery.';
  }
}
