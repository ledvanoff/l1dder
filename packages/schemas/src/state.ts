import { z } from 'zod/v4';

// ─── ISO Datetime helper ───

/**
 * ISO 8601 datetime string validator.
 * Used across all timestamp fields in state.yml.
 */
const IsoDatetime = z.iso.datetime();

// ─── Enums as Zod schemas ───
// SYNC WARNING: PhaseSchema values MUST match @l1dder/core Phase const object.
// Any change here requires a corresponding update in packages/core/src/domain/phase.ts.

/** Zod schema for the 15 workflow phases (9 main + 1 hygiene + 3 quick + 2 fast). */
export const PhaseSchema = z.enum([
  'idle',
  'specify',
  'plan',
  'update_tobe',
  'tasks',
  'implement',
  'update_asis',
  'complete',
  'review',
  'hygiene',
  'quick_plan',
  'quick_implement',
  'quick_complete',
  'fast_implement',
  'fast_complete',
]);

// SYNC WARNING: PhaseStatusSchema values MUST match @l1dder/core PhaseStatus const object.

/** Zod schema for the 6 phase statuses. */
export const PhaseStatusSchema = z.enum([
  'in_progress',
  'awaiting_gate',
  'blocked',
  'completed',
  'revisited',
  'interrupted',
]);

// SYNC WARNING: WorkflowModeSchema values MUST match @l1dder/core WorkflowMode const object.

/** Zod schema for the 3 workflow modes. */
export const WorkflowModeSchema = z.enum(['main', 'quick', 'fast']);

/** Zod schema for the 3 project stages. */
export const ProjectStageSchema = z.enum(['discovery', 'delivery', 'maintenance']);

/** Zod schema for the 4 transition kinds. */
export const TransitionKindSchema = z.enum([
  'forward',
  'rollback',
  'skip',
  'mode_switch',
]);

// ─── TriggerSource (discriminated union with 4 variants) ───

const CliTrigger = z.object({
  kind: z.literal('cli'),
  command: z.string(),
});

const SlashTrigger = z.object({
  kind: z.literal('slash'),
  command: z.string(),
});

const AutoTrigger = z.object({
  kind: z.literal('auto'),
  reason: z.string(),
});

const RecoveryTrigger = z.object({
  kind: z.literal('recovery'),
  original_phase: PhaseSchema,
});

/** Discriminated union for trigger sources (cli | slash | auto | recovery). */
export const TriggerSourceSchema = z.discriminatedUnion('kind', [
  CliTrigger,
  SlashTrigger,
  AutoTrigger,
  RecoveryTrigger,
]);

// ─── Actor (discriminated union with 3 variants) ───

const HumanActor = z.object({
  kind: z.literal('human'),
  id: z.string(),
});

const AiActor = z.object({
  kind: z.literal('ai'),
  model: z.string(),
  session_id: z.string().optional(),
});

const SystemActor = z.object({
  kind: z.literal('system'),
});

/** Discriminated union for actors (human | ai | system). */
export const ActorSchema = z.discriminatedUnion('kind', [
  HumanActor,
  AiActor,
  SystemActor,
]);

// ─── Project ───

/** Stage history entry — records project stage transitions. */
export const StageHistoryEntrySchema = z.object({
  from: ProjectStageSchema,
  to: ProjectStageSchema,
  timestamp: IsoDatetime,
  reason: z.string().optional(),
});

/** Project metadata in state.yml. */
export const ProjectSchema = z.object({
  name: z.string(),
  stage: ProjectStageSchema.default('delivery'),
  stage_history: z.array(StageHistoryEntrySchema).default([]),
  created_at: IsoDatetime,
  updated_at: IsoDatetime,
});

// ─── Workflow ───

/** Gate evaluation outcome. */
export const GateOutcomeSchema = z.enum(['approved', 'rejected', 'skipped']);

/** Phase history entry — one record per phase transition. */
export const PhaseHistoryEntrySchema = z.object({
  phase: PhaseSchema,
  status: PhaseStatusSchema,
  started_at: IsoDatetime,
  completed_at: IsoDatetime.optional(),
  actor: ActorSchema,
  trigger: TriggerSourceSchema,
  transition_kind: TransitionKindSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/** Gate history action — individual approve/reject/skip action. */
export const GateHistoryActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'skip']),
  approver: z.string(),
  timestamp: IsoDatetime,
  comment: z.string().optional(),
});

/** Gate record — result of gate evaluation. */
export const GateRecordSchema = z.object({
  gate_id: z.string(),
  phase: PhaseSchema,
  outcome: GateOutcomeSchema,
  evaluated_at: IsoDatetime,
  approver: z.string(),
  comment: z.string().optional(),
  history: z.array(GateHistoryActionSchema).default([]),
});

/** Workflow section of state.yml — tracks current phase, mode, and history. */
export const WorkflowSchema = z.object({
  current_phase: PhaseSchema.default('idle'),
  current_status: PhaseStatusSchema.default('in_progress'),
  mode: WorkflowModeSchema.default('main'),
  iteration: z.number().int().nonnegative().default(0),
  phase_history: z.array(PhaseHistoryEntrySchema).default([]),
  gate_history: z.array(GateRecordSchema).default([]),
});

// ─── Tasks ───

/** Task status within an iteration. */
export const TaskStatusSchema = z.enum([
  'pending',
  'in_progress',
  'done',
  'skipped',
]);

/** Individual task tracking entry. */
export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: TaskStatusSchema.default('pending'),
  depends_on: z.array(z.string()).default([]),
  assigned_to: z.string().optional(),
  started_at: IsoDatetime.optional(),
  completed_at: IsoDatetime.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/** Tasks section of state.yml. */
export const TasksSchema = z.object({
  current_feature: z.string().optional(),
  items: z.array(TaskSchema).default([]),
});

// ─── Quick Tasks ───

/** Quick task entry — lightweight task for quick/fast mode with optional drift warning. */
export const QuickTaskSchema = z.object({
  id: z.string(),
  description: z.string(),
  status: TaskStatusSchema.default('pending'),
  created_at: IsoDatetime,
  completed_at: IsoDatetime.optional(),
  knowledge_drift_warning: z.boolean().default(false),
});

// ─── Knowledge Updates ───

/** Knowledge update audit entry — append-only log of knowledge file changes. */
export const KnowledgeUpdateSchema = z.object({
  file: z.string(),
  operation: z.enum(['create', 'update', 'delete']),
  timestamp: IsoDatetime,
  actor: ActorSchema,
  summary: z.string(),
});

// ─── Decision Ledger ───

/** Status of a recorded architectural decision. */
export const DecisionStatusSchema = z.enum(['accepted', 'superseded', 'proposed']);

/**
 * A single recorded decision in the Decision Ledger.
 *
 * Advisory — append-only; decisions can be marked `superseded` but not deleted.
 * Intended to be populated by the specify/plan AI flow (via `addDecision()`),
 * paired with a human-facing ADR document.
 */
export const DecisionSchema = z.object({
  /** Unique identifier (e.g. "DEC-DM-1"). */
  id: z.string(),
  /** Short human-readable title. */
  title: z.string(),
  /** Why this decision was made. */
  rationale: z.string(),
  /** Alternative options that were considered but rejected. */
  alternatives: z.array(z.string()).default([]),
  /** ID of the decision this supersedes, if applicable. */
  supersedes: z.string().optional(),
  /** Current status of the decision. */
  status: DecisionStatusSchema.default('accepted'),
  /** ISO 8601 timestamp when the decision was recorded. */
  timestamp: IsoDatetime,
});

// ─── Skill Telemetry & Versioning (Iteration 6, E5) ───

/** Outcome of a single skill activation, as reported by the invoking flow. */
export const SkillRunOutcomeSchema = z.enum(['success', 'failure']);

/**
 * A single recorded skill activation (append-only telemetry).
 *
 * Populated at the point a skill is invoked (CLI or slash-command flow);
 * consumed by `l1dder doctor --deep --section skills` to surface per-skill
 * health (ratio of `failure` outcomes). Advisory only — never blocks.
 */
export const SkillRunSchema = z.object({
  /** Id of the invoked skill (`SkillFrontMatter.id`). */
  skillId: z.string(),
  /** Phase the skill ran in. */
  phase: PhaseSchema,
  /** Whether the skill's session/task completed successfully. */
  outcome: SkillRunOutcomeSchema,
  /** Approximate tokens consumed by the skill-driven session, if known. */
  tokensUsed: z.number().int().nonnegative().optional(),
  /** Wall-clock duration of the skill-driven session in milliseconds, if known. */
  durationMs: z.number().int().nonnegative().optional(),
  /** Optional free-text human feedback on the skill's output quality. */
  userFeedback: z.string().optional(),
  /** ISO 8601 timestamp when the run was recorded. */
  timestamp: IsoDatetime,
});

/**
 * A recorded skill content version (append-only, for future drift/rollback analysis).
 *
 * `contentHash` is a stable hash of the skill file's body — recorded whenever
 * a skill file changes, enabling detection of skill content drift over time.
 * Rollback itself is out of scope for Iteration 6 (backlog).
 */
export const SkillVersionSchema = z.object({
  /** Id of the skill (`SkillFrontMatter.id`). */
  skillId: z.string(),
  /** Content hash of the skill file body at this version. */
  contentHash: z.string(),
  /** ISO 8601 timestamp when this version was recorded. */
  timestamp: IsoDatetime,
});

// ─── InFlightTransition (crash recovery marker) ───

/** Crash recovery marker — present only during an active transition (SM7). */
export const InFlightTransitionSchema = z.object({
  from: PhaseSchema,
  to: PhaseSchema,
  started_at: IsoDatetime,
  actor: ActorSchema,
  trigger: TriggerSourceSchema,
});

// ─── Root StateSchema ───

/** Root schema for `.l1dder/state.yml` — the complete project state. */
export const StateSchema = z.object({
  schema_version: z.number().int().positive().default(1),
  project: ProjectSchema,
  workflow: WorkflowSchema.prefault({}),
  tasks: TasksSchema.prefault({}),
  quick_tasks: z.array(QuickTaskSchema).default([]),
  knowledge_updates: z.array(KnowledgeUpdateSchema).default([]),
  /** Decision Ledger — append-only list of architectural decisions (advisory). */
  decisions: z.array(DecisionSchema).default([]),
  /** Skill activation telemetry (Iteration 6, E5) — append-only, advisory. */
  skillRuns: z.array(SkillRunSchema).default([]),
  /** Skill content version history (Iteration 6, E5) — append-only, advisory. */
  skillVersions: z.array(SkillVersionSchema).default([]),
  _in_flight_transition: InFlightTransitionSchema.optional(),
});

// ─── Inferred types ───

/** One of 15 workflow phases (9 main + 1 hygiene + 3 quick + 2 fast). */
export type Phase = z.infer<typeof PhaseSchema>;
/** Phase execution status (6 values). */
export type PhaseStatus = z.infer<typeof PhaseStatusSchema>;
/** Workflow mode: main, quick, or fast. */
export type WorkflowMode = z.infer<typeof WorkflowModeSchema>;
/** Project lifecycle stage: discovery, delivery, or maintenance. */
export type ProjectStage = z.infer<typeof ProjectStageSchema>;
/** Transition kind: forward, rollback, skip, or mode_switch. */
export type TransitionKind = z.infer<typeof TransitionKindSchema>;
/** Trigger source discriminated union (cli | slash | auto | recovery). */
export type TriggerSource = z.infer<typeof TriggerSourceSchema>;
/** Actor discriminated union (human | ai | system). */
export type Actor = z.infer<typeof ActorSchema>;
/** Stage history entry type. */
export type StageHistoryEntry = z.infer<typeof StageHistoryEntrySchema>;
/** Project metadata type. */
export type Project = z.infer<typeof ProjectSchema>;
/** Gate evaluation outcome type. */
export type GateOutcome = z.infer<typeof GateOutcomeSchema>;
/** Phase history entry type. */
export type PhaseHistoryEntry = z.infer<typeof PhaseHistoryEntrySchema>;
/** Gate history action type. */
export type GateHistoryAction = z.infer<typeof GateHistoryActionSchema>;
/** Gate record type. */
export type GateRecord = z.infer<typeof GateRecordSchema>;
/** Workflow section type. */
export type Workflow = z.infer<typeof WorkflowSchema>;
/** Task status type. */
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
/** Individual task type. */
export type Task = z.infer<typeof TaskSchema>;
/** Tasks section type. */
export type Tasks = z.infer<typeof TasksSchema>;
/** Quick task type. */
export type QuickTask = z.infer<typeof QuickTaskSchema>;
/** Knowledge update audit entry type. */
export type KnowledgeUpdate = z.infer<typeof KnowledgeUpdateSchema>;
/** In-flight transition crash recovery marker type. */
export type InFlightTransition = z.infer<typeof InFlightTransitionSchema>;
/** Decision status type. */
export type DecisionStatus = z.infer<typeof DecisionStatusSchema>;
/** Architectural decision record type. */
export type Decision = z.infer<typeof DecisionSchema>;
/** Skill run outcome type. */
export type SkillRunOutcome = z.infer<typeof SkillRunOutcomeSchema>;
/** Skill run telemetry entry type. */
export type SkillRun = z.infer<typeof SkillRunSchema>;
/** Skill version record type. */
export type SkillVersion = z.infer<typeof SkillVersionSchema>;
/** Complete state.yml type. */
export type State = z.infer<typeof StateSchema>;
