import { z } from 'zod/v4';

import { IsoDatetime } from './primitives.js';

/**
 * Machine index for the roadmap parking lots (`DEBT-NNN` / `BL-NNN`).
 *
 * Narrative lives in `knowledge/roadmap.md` cards; these schemas carry only the
 * structured facts a planner needs (id, status, weight, source anchor, links,
 * nomination). The canonical store is `knowledge/project-registry.yml`, read by
 * a real adapter in HARD-4 — HARD-2 only fixes the contract.
 */

/** Stable `DEBT-NNN` identifier of a technical debt card. */
export const DebtIdSchema = z.string().regex(/^DEBT-\d{3,}$/);

/** Stable `BL-NNN` identifier of a long-term backlog card. */
export const BacklogIdSchema = z.string().regex(/^BL-\d{3,}$/);

/** Lifecycle of a pooled item; `open` is the only plannable state. */
export const PoolItemStatusSchema = z.enum([
  'open',
  'nominated',
  'scheduled',
  'done',
  'dropped',
]);

/** Impact weight of a technical debt item. */
export const DebtSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

/** Planning weight of a long-term backlog item. */
export const BacklogPrioritySchema = z.enum(['low', 'medium', 'high']);

/** What kind of work a backlog item represents. */
export const BacklogKindSchema = z.enum([
  'feature',
  'improvement',
  'research',
  'infra',
]);

/**
 * Approved placement of a pooled item into the Delivery plan.
 *
 * Written only after explicit human approval — planning never auto-schedules.
 */
export const PoolNominationSchema = z.object({
  iteration: z.string().min(1),
  session: z.string().min(1).optional(),
  approved_by: z.string().min(1),
  approved_at: IsoDatetime,
});

/** Fields shared by both pools. */
const poolItemBase = {
  title: z.string().min(1),
  status: PoolItemStatusSchema.default('open'),
  /** Anchor of the narrative card, e.g. `knowledge/roadmap.md#debt-001`. */
  source: z.string().min(1),
  /** Related `FEAT-*` / `UC-*` / `DEC-*` ids or file anchors. */
  links: z.array(z.string()).default([]),
  nomination: PoolNominationSchema.optional(),
  created_at: IsoDatetime.optional(),
};

/** One technical debt entry in the registry index. */
export const DebtItemSchema = z.object({
  id: DebtIdSchema,
  severity: DebtSeveritySchema,
  ...poolItemBase,
});

/** One long-term backlog entry in the registry index. */
export const BacklogItemSchema = z.object({
  id: BacklogIdSchema,
  priority: BacklogPrioritySchema,
  kind: BacklogKindSchema,
  ...poolItemBase,
});

// ─── Inferred types ───

/** Lifecycle status of a pooled `DEBT-*`/`BL-*` item. */
export type PoolItemStatus = z.infer<typeof PoolItemStatusSchema>;
/** Impact weight of a technical debt item. */
export type DebtSeverity = z.infer<typeof DebtSeveritySchema>;
/** Planning weight of a backlog item. */
export type BacklogPriority = z.infer<typeof BacklogPrioritySchema>;
/** Kind of work a backlog item represents. */
export type BacklogKind = z.infer<typeof BacklogKindSchema>;
/** Approved placement of a pooled item into the Delivery plan. */
export type PoolNomination = z.infer<typeof PoolNominationSchema>;
/** Technical debt index entry. */
export type DebtItem = z.infer<typeof DebtItemSchema>;
/** Long-term backlog index entry. */
export type BacklogItem = z.infer<typeof BacklogItemSchema>;
