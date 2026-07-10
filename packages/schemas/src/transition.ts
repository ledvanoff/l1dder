import { z } from 'zod/v4';

import { ActorSchema, PhaseSchema, TriggerSourceSchema } from './state.js';

/**
 * Schema for a transition request — submitted to StateManager.transition().
 * Validated before executing any phase transition (PM5).
 */
export const TransitionRequestSchema = z.object({
  to: PhaseSchema,
  trigger: TriggerSourceSchema,
  actor: ActorSchema,
  dryRun: z.boolean().default(false),
  force: z.boolean().default(false),
});

/**
 * Schema for a rollback request — submitted for adjacent phase rollback (PM3).
 */
export const RollbackRequestSchema = z.object({
  to: PhaseSchema,
  reason: z.string(),
  actor: ActorSchema,
});

// ─── Inferred types ───

/** Transition request type. */
export type TransitionRequest = z.infer<typeof TransitionRequestSchema>;
/** Rollback request type. */
export type RollbackRequest = z.infer<typeof RollbackRequestSchema>;
