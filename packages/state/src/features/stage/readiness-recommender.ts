import type { CriterionResult, DeliveryCriteriaResult } from './delivery-criteria.js';

/** A single discovery milestone in the ordered checklist. */
export interface DiscoveryMilestone {
  /** Display order (1 = first milestone). */
  readonly order: number;
  /** Machine identifier: 'idea' | 'roadmap' | 'architecture' | 'data_model' | 'usecases'. */
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
  /** Human-readable score, e.g. "3/5". */
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
 * Ordered set of discovery milestone IDs (canonical order).
 *
 * Criteria beyond order 5 (design, no_skeleton_markers) are infrastructure
 * checks, not "milestones" — the Recommender tracks only the five discovery
 * artifacts for the ordered checklist.
 */
const MILESTONE_IDS: readonly string[] = [
  'idea',
  'roadmap',
  'architecture',
  'data_model',
  'usecases',
];

/**
 * Build an ordered Discovery Checklist and advisory recommendation from the
 * evaluated criteria result.
 *
 * Pure function — no I/O, no external dependencies.
 *
 * M2 compliance: only criteria present in `result` are included. If a milestone
 * flag was disabled in config (e.g. `require_erd_not_skeleton: false`), the
 * corresponding criterion is absent from `result`, so it won't appear in
 * `milestones` or `gaps`.
 */
export function recommend(result: DeliveryCriteriaResult): ReadinessRecommendation {
  // Build a lookup from criterion id → CriterionResult
  const byId = new Map<string, CriterionResult>();
  for (const c of result) {
    byId.set(c.id, c);
  }

  // Build ordered milestones (only enabled ones, in canonical order)
  const milestones: DiscoveryMilestone[] = [];
  for (const id of MILESTONE_IDS) {
    const c = byId.get(id);
    if (!c) continue; // milestone disabled in config → skip
    milestones.push({
      order: milestones.length + 1,
      id: c.id,
      label: c.label,
      met: c.met,
      detail: c.met ? undefined : c.detail,
    });
  }

  const allMet = result.every((c) => c.met);
  const totalEnabled = milestones.length;
  const metCount = milestones.filter((m) => m.met).length;

  const gaps = milestones.filter((m) => !m.met).map((m) => m.label);
  const firstUnmet = milestones.find((m) => !m.met);
  const nextMilestone = firstUnmet?.id;

  const score = `${String(metCount)}/${String(totalEnabled)}`;
  const message = buildMessage(allMet, milestones, firstUnmet);

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
  milestones: readonly DiscoveryMilestone[],
  nextMilestone: DiscoveryMilestone | undefined,
): string {
  if (allMet) {
    return 'All discovery milestones are complete — the project is ready to transition discovery → delivery.';
  }

  if (!nextMilestone) {
    return 'Complete the remaining discovery milestones before transitioning to delivery.';
  }

  // Specific advice based on which milestone is next
  switch (nextMilestone.id) {
    case 'idea':
      return 'Start by documenting the product idea (knowledge/idea.md) — describe the problem, solution, and target users.';

    case 'roadmap':
      return (
        'Work out the roadmap next: define the MVP scope, plan the discovery milestones ' +
        'with estimated sessions, and document them in knowledge/roadmap.md. ' +
        'Run the built-in "plan-roadmap" skill to get guided.'
      );

    case 'architecture': {
      const erdEnabled = milestones.some((m) => m.id === 'data_model');
      return erdEnabled
        ? 'Work out the to-be architecture and data model before transitioning to delivery.'
        : 'Work out the to-be architecture before transitioning to delivery.';
    }

    case 'data_model':
      return 'Add an erDiagram block to knowledge/to-be/erd.md to document the data model.';

    case 'usecases':
      return 'Document the key use cases in knowledge/to-be/usecases.md before transitioning to delivery.';

    default:
      return 'Complete the remaining discovery milestones before transitioning to delivery.';
  }
}
