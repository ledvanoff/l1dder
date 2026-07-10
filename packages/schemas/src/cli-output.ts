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
  exit_code: z.number().int().min(0).max(9),
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

/** Discovery milestone for status/helpme output. */
const DiscoveryMilestoneBriefSchema = z.object({
  order: z.number().int(),
  id: z.string(),
  label: z.string(),
  met: z.boolean(),
  detail: z.string().optional(),
});

/** Brief discovery readiness block in `l1dder status` (discovery stage only). */
const DiscoveryBriefSchema = z.object({
  score: z.string(),
  ready: z.boolean(),
  next_milestone: z.string().nullable(),
  milestones: z.array(DiscoveryMilestoneBriefSchema),
  message: z.string().optional(),
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

/** Readiness criterion for delivery stage advance. */
const ReadinessCriterionSchema = z.object({
  id: z.string(),
  label: z.string(),
  met: z.boolean(),
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
