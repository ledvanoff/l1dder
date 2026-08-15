import { z } from 'zod/v4';

import { PhaseSchema } from './state.js';

// ─── Enums ───

/** Trigger kind for slash commands: whether the command triggers a phase transition. */
export const SlashTriggerKindSchema = z.enum([
  'transition',
  'no_transition',
  'status_change',
]);

/** Override strategy when custom command overrides built-in by id. */
export const SlashOverrideStrategySchema = z.enum([
  'replace',
  'append_steps',
  'patch',
]);

/**
 * Slash-command front-matter `phase`: canonical {@link PhaseSchema} or `"*"`
 * for any-phase commands (e.g. pause / handoff).
 *
 * Reuses {@link PhaseSchema} — does not define a second phase enum.
 */
export const SlashCommandPhaseSchema = z.union([PhaseSchema, z.literal('*')]);

// ─── Front-matter schema ───

/**
 * YAML front-matter schema for L1DDER canonical slash-command files.
 *
 * Matches SC4 from design/slash-commands.md.
 */
export const SlashCommandFrontMatterSchema = z.object({
  /** Unique command identifier (kebab-case, e.g. "specify", "update-tobe"). */
  id: z.string().regex(/^[a-z][a-z0-9-]*$/, 'kebab-case required'),

  /** Human-readable display name. */
  name: z.string().min(1),

  /** Format version for migration support. */
  format_version: z.literal(1),

  /** Phase Machine phase this command operates in. Use "*" for any-phase commands. */
  phase: SlashCommandPhaseSchema,

  /** Whether the command triggers a phase transition. */
  trigger_kind: SlashTriggerKindSchema.default('transition'),

  /** Primary role executing this command. */
  role: z.string().default('developer'),

  /** Linked skill id (null = no skill, e.g. constitution). */
  skill: z.string().nullable().default(null),

  /** Template path for artifact generation (null = no artifact). */
  artifact_template: z.string().nullable().default(null),

  /** Output path for generated artifact (null = no artifact). */
  artifact_path: z.string().nullable().default(null),

  /** Context profile override (CE3 profile id); null = inherit from phase. */
  context_profile: z.string().nullable().default(null),

  /** Whether the command accepts a user argument (e.g. task id). */
  accepts_argument: z.boolean().default(false),

  /** Whether repeated invocations produce the same result. */
  idempotent: z.boolean().default(true),

  /** Whether the command requires knowledge owner approval. */
  requires_owner_approve: z.boolean().default(false),

  /** Categorization tags for discovery and filtering. */
  tags: z.array(z.string()).default([]),

  /** Whether this is a built-in (framework-managed) command. */
  builtin: z.boolean().default(false),

  /** Override strategy when custom command overrides built-in by id. */
  override_strategy: SlashOverrideStrategySchema.optional(),
});

// ─── Body sections (runtime representation) ───

/** Parsed body sections of a slash command Markdown file. */
export const SlashCommandBodySchema = z.object({
  summary: z.string().optional(),
  when_to_use: z.string().optional(),
  system_prompt: z.string().optional(),
  steps: z.string().optional(),
  acceptance_criteria: z.string().optional(),
  post_conditions: z.string().optional(),
  error_handling: z.string().optional(),
  examples: z.string().optional(),
  context_profile: z.string().optional(),
});

/** Full parsed slash command: front-matter + body sections + file metadata. */
export const ParsedSlashCommandSchema = z.object({
  frontMatter: SlashCommandFrontMatterSchema,
  sections: SlashCommandBodySchema,
  body: z.string(),
  filePath: z.string(),
});

// ─── Inferred types ───

/** Slash command trigger kind. */
export type SlashTriggerKind = z.infer<typeof SlashTriggerKindSchema>;
/** Slash command override strategy. */
export type SlashOverrideStrategy = z.infer<typeof SlashOverrideStrategySchema>;
/** Slash-command front-matter phase (`Phase` or `"*"`). */
export type SlashCommandPhase = z.infer<typeof SlashCommandPhaseSchema>;
/** Slash command front-matter type. */
export type SlashCommandFrontMatter = z.infer<typeof SlashCommandFrontMatterSchema>;
/** Slash command body sections type. */
export type SlashCommandBody = z.infer<typeof SlashCommandBodySchema>;
/** Full parsed slash command type (runtime). */
export type ParsedSlashCommand = z.infer<typeof ParsedSlashCommandSchema>;
