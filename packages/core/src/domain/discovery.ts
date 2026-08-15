// SYNC WARNING: DiscoveryMilestone values MUST match @l1dder/schemas DiscoveryMilestoneIdSchema.
// Any change here requires a corresponding update in packages/schemas/src/discovery.ts.

/** All 7 product-discovery milestone identifiers (IDEA→READY flow). */
export const DiscoveryMilestone = {
  IDEA: 'idea',
  PRODUCT: 'product',
  ARCHITECTURE: 'architecture',
  INTEGRATIONS: 'integrations',
  DATA: 'data',
  STANDARDS: 'standards',
  READY: 'ready',
} as const;

/** Union of all 7 discovery milestone string literals. */
export type DiscoveryMilestoneId =
  (typeof DiscoveryMilestone)[keyof typeof DiscoveryMilestone];

/**
 * Canonical ordered list of discovery milestones.
 *
 * Single source of truth for IDEA→PRODUCT→ARCHITECTURE→INTEGRATIONS→DATA→STANDARDS→READY.
 */
export const DISCOVERY_MILESTONE_ORDER: readonly DiscoveryMilestoneId[] = [
  DiscoveryMilestone.IDEA,
  DiscoveryMilestone.PRODUCT,
  DiscoveryMilestone.ARCHITECTURE,
  DiscoveryMilestone.INTEGRATIONS,
  DiscoveryMilestone.DATA,
  DiscoveryMilestone.STANDARDS,
  DiscoveryMilestone.READY,
] as const;

/**
 * Milestones that may be marked `not_applicable`.
 *
 * Only `integrations` and `standards` are conditional: some projects have no
 * external integrations, and standards may already be inherited. All other
 * milestones remain always-required.
 */
export const CONDITIONAL_MILESTONES: readonly DiscoveryMilestoneId[] = [
  DiscoveryMilestone.INTEGRATIONS,
  DiscoveryMilestone.STANDARDS,
] as const;

/**
 * Return the zero-based index of a milestone in {@link DISCOVERY_MILESTONE_ORDER}.
 *
 * Returns `-1` when `id` is not in the order list (should not happen for typed ids).
 */
export function milestoneIndex(id: DiscoveryMilestoneId): number {
  return DISCOVERY_MILESTONE_ORDER.indexOf(id);
}

/**
 * Return the milestone immediately after `id`, or `undefined` when `id` is last / unknown.
 */
export function nextMilestoneAfter(
  id: DiscoveryMilestoneId,
): DiscoveryMilestoneId | undefined {
  const index = milestoneIndex(id);
  if (index < 0 || index >= DISCOVERY_MILESTONE_ORDER.length - 1) {
    return undefined;
  }
  return DISCOVERY_MILESTONE_ORDER[index + 1];
}

/**
 * Return the milestone immediately before `id`, or `undefined` when `id` is first / unknown.
 */
export function previousMilestoneOf(
  id: DiscoveryMilestoneId,
): DiscoveryMilestoneId | undefined {
  const index = milestoneIndex(id);
  if (index <= 0) {
    return undefined;
  }
  return DISCOVERY_MILESTONE_ORDER[index - 1];
}

/**
 * Whether a milestone may be set to `not_applicable`.
 *
 * Only members of {@link CONDITIONAL_MILESTONES} return `true`.
 */
export function isConditionalMilestone(id: DiscoveryMilestoneId): boolean {
  return CONDITIONAL_MILESTONES.includes(id);
}
