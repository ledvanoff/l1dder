import { z } from 'zod/v4';

import { ActorSchema, IsoDatetime } from './primitives.js';

// SYNC WARNING: DiscoveryMilestoneIdSchema values MUST match @l1dder/core DiscoveryMilestone const object.
// Any change here requires a corresponding update in packages/core/src/domain/discovery.ts.

/** Zod schema for the 7 product-discovery milestone identifiers. */
export const DiscoveryMilestoneIdSchema = z.enum([
  'idea',
  'product',
  'architecture',
  'integrations',
  'data',
  'standards',
  'ready',
]);

/** Zod schema for discovery milestone lifecycle statuses. */
export const DiscoveryMilestoneStatusSchema = z.enum([
  'pending',
  'brainstorming',
  'planned',
  'in_progress',
  'in_review',
  'complete',
  'not_applicable',
]);

/** A single product-discovery milestone record in state.yml. */
export const DiscoveryMilestoneSchema = z.object({
  id: DiscoveryMilestoneIdSchema,
  status: DiscoveryMilestoneStatusSchema,
  required: z.boolean(),
  brainstorm_summary: z.string().min(1).optional(),
  planned_sessions: z.array(z.string()).default([]),
  evidence: z.array(z.string()).default([]),
  rationale: z.string().min(1).optional(),
  completed_at: IsoDatetime.optional(),
});

/**
 * Audited `--force --reason` bypass of a discovery milestone.
 *
 * Records who waived which milestone, why, and optionally which decision id
 * documents the waiver.
 */
export const DiscoveryWaiverSchema = z.object({
  milestone: DiscoveryMilestoneIdSchema,
  reason: z.string().min(1),
  decision_id: z.string().optional(),
  actor: ActorSchema,
  timestamp: IsoDatetime,
});

/** Discovery section of state.yml — milestone progress, cursor, and waivers. */
export const DiscoverySchema = z.object({
  milestones: z.array(DiscoveryMilestoneSchema).default([]),
  current: DiscoveryMilestoneIdSchema.nullable().default(null),
  waivers: z.array(DiscoveryWaiverSchema).default([]),
});

// ─── Inferred types ───

/** One of 7 product-discovery milestone identifiers. */
export type DiscoveryMilestoneId = z.infer<typeof DiscoveryMilestoneIdSchema>;
/** Discovery milestone lifecycle status. */
export type DiscoveryMilestoneStatus = z.infer<typeof DiscoveryMilestoneStatusSchema>;
/** A single discovery milestone record. */
export type DiscoveryMilestone = z.infer<typeof DiscoveryMilestoneSchema>;
/** Audited discovery milestone waiver. */
export type DiscoveryWaiver = z.infer<typeof DiscoveryWaiverSchema>;
/** Discovery section of state.yml. */
export type Discovery = z.infer<typeof DiscoverySchema>;
