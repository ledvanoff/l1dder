import { z } from 'zod/v4';

import {
  PhaseSchema,
  PhaseStatusSchema,
  WorkflowModeSchema,
  ProjectStageSchema,
  TransitionKindSchema,
  TriggerSourceSchema,
  TaskStatusSchema,
} from './state.js';
import { EnforcementSchema } from './config.js';

// ─── Generic envelopes ───

/** Successful command response envelope. */
export const CommandSuccessSchema = z.object({
  ok: z.literal(true),
  command: z.string(),
  data: z.unknown(),
});

/** Error detail inside the error envelope. */
export const CommandErrorDetailSchema = z.object({
  code: z.string(),
  message: z.string(),
  hint: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

/** Failed command response envelope. */
export const CommandErrorSchema = z.object({
  ok: z.literal(false),
  exit_code: z.number().int().min(0).max(12),
  error: CommandErrorDetailSchema,
});

// ─── Per-command data schemas ───

/** Next step suggestion shown in status / init output. */
const NextStepSchema = z.object({
  label: z.string(),
  command: z.string().nullable(),
  blocking: z.boolean(),
});

/** JSON output data for `l1dder init`. */
export const InitOutputSchema = z.object({
  project: z.object({
    name: z.string(),
    stage: ProjectStageSchema,
  }),
  mode: z.enum(['greenfield', 'brownfield']),
  files_created: z.array(z.string()),
  next_steps: z.array(NextStepSchema),
});

/** Discovery milestone for status/helpme/stage output (ordered IDEA→READY checklist). */
const DiscoveryMilestoneBriefSchema = z.object({
  order: z.number().int(),
  id: z.string(),
  label: z.string(),
  status: z.string(),
  met: z.boolean(),
  required: z.boolean(),
  evidence_count: z.number().int(),
  planned_session_count: z.number().int(),
  planned_sessions: z.array(z.string()).optional(),
  current: z.boolean().optional(),
  detail: z.string().optional(),
});

/**
 * One flag the agent must collect from a human before running the Primary Action.
 *
 * Values must be substantive project content — never placeholders such as
 * `TODO` or `<text>`.
 */
export const PrimaryActionRequiredInputSchema = z.object({
  flag: z.string(),
  description: z.string(),
  repeatable: z.boolean().optional(),
});

/**
 * Canonical Primary Action brief emitted by every projection-backed command.
 *
 * Mirrors `PrimaryAction` from the workflow projection; commands must not
 * derive a second recommendation shape.
 *
 * When `needs_input` is true the `command` string is a prefix only — the agent
 * must collect {@link PrimaryActionRequiredInputSchema} values from the human
 * and append them before executing. Do not run the prefix as-is.
 */
export const PrimaryActionBriefSchema = z.object({
  kind: z.string(),
  command: z.string(),
  reason: z.string(),
  needs_input: z.boolean().optional(),
  required_inputs: z.array(PrimaryActionRequiredInputSchema).optional(),
});

/**
 * Optional workflow-status snapshot for Project Brief (DF-025 / T-16).
 *
 * Pure data contract so `@l1dder/context` can render authoritative status
 * without importing `@l1dder/state`. CLI (or any caller) maps
 * `WorkflowProjectionService.project()` into this shape before calling
 * `buildBrief` / `ContextEngine.brief`.
 */
export const BriefWorkflowSnapshotSchema = z.object({
  /** Authoritative project stage from the workflow projection. */
  stage: ProjectStageSchema,
  /** Current discovery milestone cursor, when applicable. */
  milestone: z
    .object({
      id: z.string(),
      status: z.string(),
    })
    .nullable()
    .optional(),
  /** Selected workflow profile id, or null when unset. */
  profile: z.string().nullable().optional(),
  /** Active Agent Session id, or null when none. */
  session: z.string().nullable().optional(),
  /** Current Phase Machine phase. */
  phase: PhaseSchema,
  /** Current phase execution status. */
  phase_status: PhaseStatusSchema.optional(),
  /** Latest / awaiting gate label, when present. */
  gate: z.string().nullable().optional(),
  /** Single next action from the projection (one-line Primary Action). */
  primary_action: PrimaryActionBriefSchema.optional(),
});

/**
 * Stop vs status semantics for a projection blocker.
 *
 * `hard` (default when omitted) — the agent must surface the blocker and STOP.
 * `advisory` — current workflow state, not an obstacle; print and continue.
 */
export const BlockerLevelSchema = z.enum(['hard', 'advisory']);

/** Blocker entry as exposed by projection-backed commands. */
const DiscoveryBlockerSchema = z.object({
  code: z.string(),
  message: z.string(),
  milestone: z.string().optional(),
  level: BlockerLevelSchema.optional(),
});

/** Brief discovery readiness block in `l1dder status` (discovery stage only). */
const DiscoveryBriefSchema = z.object({
  score: z.string(),
  ready: z.boolean(),
  next_milestone: z.string().nullable(),
  milestones: z.array(DiscoveryMilestoneBriefSchema),
  message: z.string().optional(),
  primary_action: PrimaryActionBriefSchema.optional(),
  blockers: z.array(DiscoveryBlockerSchema).optional(),
});

/** READY evidence slice in `l1dder discovery status`. */
const DiscoveryReadinessOutputSchema = z.object({
  milestones_closed: z.boolean(),
  evidence_available: z.boolean(),
  ready: z.boolean(),
  gaps: z.array(
    z.object({
      code: z.string(),
      ref: z.string(),
      message: z.string(),
    }),
  ),
});

/** Advisory planning candidate in `l1dder discovery status` (never auto-scheduled). */
const PlanningCandidateOutputSchema = z.object({
  id: z.string(),
  kind: z.string(),
  title: z.string(),
  weight: z.string(),
  source: z.string(),
  approved: z.literal(false),
});

/** JSON output data for `l1dder discovery status`. */
export const DiscoveryStatusOutputSchema = z.object({
  score: z.string(),
  ready: z.boolean(),
  current: z.string().nullable(),
  next_milestone: z.string().nullable(),
  milestones: z.array(DiscoveryMilestoneBriefSchema),
  blockers: z.array(DiscoveryBlockerSchema),
  primary_action: PrimaryActionBriefSchema,
  message: z.string(),
  detailed: z.boolean(),
  readiness: DiscoveryReadinessOutputSchema.optional(),
  planning_candidates: z.array(PlanningCandidateOutputSchema).optional(),
});

/** JSON output data for `l1dder status`. */
export const StatusOutputSchema = z.object({
  project: z.object({
    name: z.string(),
    stage: ProjectStageSchema,
    created: z.string(),
  }),
  workflow: z.object({
    phase: PhaseSchema,
    status: PhaseStatusSchema,
    mode: WorkflowModeSchema,
    iteration: z.string().nullable(),
  }),
  tasks: z.object({
    total: z.number().int(),
    done: z.number().int(),
    in_progress: z.number().int(),
    pending: z.number().int(),
    blocked: z.number().int(),
    skipped: z.number().int(),
    next_available: z.string().nullable(),
  }),
  next_steps: z.array(NextStepSchema),
  discovery: DiscoveryBriefSchema.optional(),
  /** Single next action from the projection — same value across all surfaces. */
  primary_action: PrimaryActionBriefSchema,
  /**
   * Projection blockers. Only `level: "hard"` (or omitted level) is a stop;
   * `advisory` entries are status and must not halt `/l1dder-next`.
   */
  blockers: z.array(DiscoveryBlockerSchema),
});

/**
 * Individual check result inside doctor / check output.
 *
 * `info` (added in Iteration 6 for `doctor --deep`) is a non-blocking
 * observation — it never contributes to the pass/warn/fail summary counts.
 */
const CheckEntrySchema = z.object({
  id: z.string(),
  level: z.enum(['pass', 'warn', 'fail', 'info']),
  message: z.string(),
  hint: z.string().optional(),
  fixable: z.boolean().optional(),
  details: z.array(z.object({
    path: z.string(),
    message: z.string(),
    code: z.string().optional(),
  })).optional(),
});

/** Doctor section with grouped checks. */
const DoctorSectionSchema = z.object({
  id: z.string(),
  label: z.string(),
  checks: z.array(CheckEntrySchema),
});

/** JSON output data for `l1dder check`. */
export const CheckOutputSchema = z.object({
  summary: z.object({
    pass: z.number().int(),
    warn: z.number().int(),
    fail: z.number().int(),
  }),
  checks: z.array(CheckEntrySchema),
});

/** JSON output data for `l1dder doctor`. */
export const DoctorOutputSchema = z.object({
  summary: z.object({
    pass: z.number().int(),
    warn: z.number().int(),
    fail: z.number().int(),
    auto_fixable: z.number().int(),
  }),
  sections: z.array(DoctorSectionSchema),
  /**
   * Projection Primary Action / blockers, present when doctor ran against a
   * loadable state. Absent for diagnostics that could not read state at all.
   */
  primary_action: PrimaryActionBriefSchema.optional(),
  blockers: z.array(DiscoveryBlockerSchema).optional(),
});

/** One registry validation finding for CLI JSON output. */
export const RegistryIssueOutputSchema = z.object({
  code: z.string(),
  ref: z.string(),
  message: z.string(),
  path: z.string().optional(),
  severity: z.enum(['error', 'warning']).default('error'),
});

/** JSON output data for `l1dder registry check|sync|show`. */
export const RegistryOutputSchema = z.object({
  action: z.enum(['check', 'sync', 'show', 'init']),
  manifest_path: z.string(),
  view_path: z.string(),
  content_hash: z.string().optional(),
  view_stale: z.boolean().optional(),
  wrote: z.boolean().optional(),
  unchanged: z.boolean().optional(),
  counts: z.record(z.string(), z.number().int()).optional(),
  issue_summary: z
    .object({
      error: z.number().int(),
      warning: z.number().int(),
    })
    .optional(),
  issues: z.array(RegistryIssueOutputSchema).optional(),
  lookup_instruction: z.string().optional(),
  ai_context: z
    .object({
      status: z.enum(['fresh', 'stale', 'missing_marker', 'missing_file']),
      path: z.string(),
      embedded_hash: z.string().optional(),
    })
    .optional(),
  filter: z.string().optional(),
  matches: z
    .array(
      z.object({
        collection: z.string(),
        id: z.string(),
        title: z.string().optional(),
        name: z.string().optional(),
      }),
    )
    .optional(),
});

/** JSON output data for `l1dder context` (brief mode). */
export const ContextBriefOutputSchema = z.object({
  content: z.string(),
  token_estimate: z.number().int(),
  char_count: z.number().int(),
  sections: z.array(z.string()),
});

/** JSON output data for `l1dder quick` / `l1dder fast`. */
export const QuickOutputSchema = z.object({
  quick_task: z.object({
    id: z.string(),
    mode: z.enum(['quick', 'fast']),
    title: z.string(),
    status: TaskStatusSchema,
    started_at: z.string().optional(),
    completed_at: z.string().optional(),
    knowledge_drift_warning: z.boolean().optional(),
  }),
  transition: z.object({
    from: PhaseSchema,
    to: PhaseSchema,
  }).optional(),
  active_skill: z.string().optional(),
});

/** Readiness criterion for delivery stage advance (same ids as discovery checklist). */
const ReadinessCriterionSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.string().optional(),
  met: z.boolean(),
  required: z.boolean().optional(),
  evidence_count: z.number().int().optional(),
  planned_session_count: z.number().int().optional(),
  current: z.boolean().optional(),
  detail: z.string().optional(),
});

/** JSON output data for `l1dder stage status`. */
export const StageStatusOutputSchema = z.object({
  stage: ProjectStageSchema,
  enforcement: EnforcementSchema,
  readiness: z.object({
    score: z.string(),
    ready: z.boolean(),
    criteria: z.array(ReadinessCriterionSchema),
  }),
  history: z.array(z.object({
    from: ProjectStageSchema,
    to: ProjectStageSchema,
    timestamp: z.string(),
    reason: z.string().optional(),
  })),
  /** Single next action from the projection — same value across all surfaces. */
  primary_action: PrimaryActionBriefSchema,
  /**
   * Projection blockers. Only `level: "hard"` (or omitted level) is a stop;
   * `advisory` entries are status and must not halt `/l1dder-next`.
   */
  blockers: z.array(DiscoveryBlockerSchema),
});

/** JSON output data for `l1dder transition`. */
export const TransitionOutputSchema = z.object({
  from: PhaseSchema,
  to: PhaseSchema,
  kind: TransitionKindSchema,
  trigger: TriggerSourceSchema,
  forced: z.boolean(),
  timestamp: z.string(),
});

/** Next transition hint for helpme output. */
const HelpmeTransitionSchema = z.object({
  phase: PhaseSchema,
  trigger: z.string(),
  gates: z.array(z.string()),
});

/** Delivery-phase artifact readiness row for `l1dder helpme`. */
const DeliveryArtifactBriefSchema = z.object({
  id: z.string(),
  path: z.string(),
  label: z.string(),
  status: z.enum(['missing', 'in_progress', 'ready']),
});

/** JSON output data for `l1dder helpme`. */
export const HelpmeOutputSchema = z.object({
  position: z.object({
    stage: ProjectStageSchema,
    phase: PhaseSchema,
    status: PhaseStatusSchema,
    mode: WorkflowModeSchema,
    iteration: z.string().nullable(),
    role_mode: z.string().optional(),
  }),
  discovery: z.object({
    score: z.string(),
    ready: z.boolean(),
    next_milestone: z.string().nullable(),
    milestones: z.array(DiscoveryMilestoneBriefSchema),
    message: z.string(),
    gaps: z.array(z.string()),
  }).optional(),
  delivery_artifacts: z.array(DeliveryArtifactBriefSchema).optional(),
  /**
   * Canonical next action from the workflow projection. `/l1dder-next`
   * dispatches this instead of re-deriving a route.
   */
  primary_action: PrimaryActionBriefSchema,
  /**
   * Projection blockers. Only `level: "hard"` (or omitted level) is a stop;
   * `advisory` entries are status and must not halt `/l1dder-next`.
   */
  blockers: z.array(DiscoveryBlockerSchema),
  phase_guidance: z.array(z.string()),
  transitions: z.object({
    next: HelpmeTransitionSchema.nullable(),
    rollback_available: z.boolean(),
    rollback_targets: z.array(PhaseSchema),
  }),
});

// ─── Inferred types ───

export type CommandSuccess = z.infer<typeof CommandSuccessSchema>;
export type CommandErrorDetail = z.infer<typeof CommandErrorDetailSchema>;
export type CommandError = z.infer<typeof CommandErrorSchema>;
export type InitOutput = z.infer<typeof InitOutputSchema>;
export type StatusOutput = z.infer<typeof StatusOutputSchema>;
export type CheckOutput = z.infer<typeof CheckOutputSchema>;
export type DoctorOutput = z.infer<typeof DoctorOutputSchema>;
export type ContextBriefOutput = z.infer<typeof ContextBriefOutputSchema>;
export type QuickOutput = z.infer<typeof QuickOutputSchema>;
export type StageStatusOutput = z.infer<typeof StageStatusOutputSchema>;
export type TransitionOutput = z.infer<typeof TransitionOutputSchema>;
export type HelpmeOutput = z.infer<typeof HelpmeOutputSchema>;
export type DiscoveryStatusOutput = z.infer<typeof DiscoveryStatusOutputSchema>;
export type RegistryIssueOutput = z.infer<typeof RegistryIssueOutputSchema>;
export type RegistryOutput = z.infer<typeof RegistryOutputSchema>;
/** Primary Action brief shared by projection-backed CLI / brief consumers. */
export type PrimaryActionBrief = z.infer<typeof PrimaryActionBriefSchema>;
/** One required flag listed on a Primary Action that needs human input. */
export type PrimaryActionRequiredInput = z.infer<
  typeof PrimaryActionRequiredInputSchema
>;
/** Stop vs status semantics for a projection blocker. */
export type BlockerLevel = z.infer<typeof BlockerLevelSchema>;
/** Workflow-status snapshot accepted by Project Brief builders. */
export type BriefWorkflowSnapshot = z.infer<typeof BriefWorkflowSnapshotSchema>;
