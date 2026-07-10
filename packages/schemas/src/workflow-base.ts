import { z } from 'zod/v4';

/** Metadata section present in all base workflow YAML files. */
export const BaseMetaSchema = z.object({
  format_version: z.number(),
  description: z.string(),
  last_updated: z.string(),
});

/**
 * Session discipline defaults from workflow.base.yml.
 *
 * Typed keys used by rule-generator and L1DDER session rules; additional
 * keys are allowed via passthrough for forward compatibility.
 */
export const SessionDisciplineSchema = z
  .object({
    two_session_types: z.boolean().optional(),
    ask_session_type_on_start: z.boolean().optional(),
    one_topic_per_session: z.boolean().optional(),
    branch_before_changes: z.boolean().optional(),
    discovery_generates_spec: z.boolean().optional(),
    delivery_tracks_via_tasks_md: z.boolean().optional(),
    handoff_on_interrupt: z.boolean().optional(),
    doctor_before_commit: z.boolean().optional(),
    update_worklog: z.boolean().optional(),
    discovery_use_plan_mode: z.boolean().optional(),
    mark_recommended_option: z.boolean().optional(),
  })
  .catchall(z.unknown());

/**
 * Pragmatic Zod schema for framework-managed workflow.base.yml.
 *
 * Validates `meta` and `session_discipline`; other sections passthrough
 * without data loss (language_policy, knowledge_update, etc.).
 */
export const WorkflowBaseSchema = z
  .object({
    meta: BaseMetaSchema,
    session_discipline: SessionDisciplineSchema.optional(),
  })
  .catchall(z.unknown());

export type BaseMeta = z.infer<typeof BaseMetaSchema>;
export type SessionDiscipline = z.infer<typeof SessionDisciplineSchema>;
export type WorkflowBaseParsed = z.infer<typeof WorkflowBaseSchema>;
