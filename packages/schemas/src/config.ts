import { z } from 'zod/v4';

import { HookConfigSchema } from './hook.js';

// ─── Enums ───

/** Role mode: solo (single developer) or team (multiple roles). */
export const RoleModeSchema = z.enum(['solo', 'team']);

/** Enforcement level: off, advisory (warn), or enforced (block). */
export const EnforcementSchema = z.enum(['off', 'advisory', 'enforced']);

// ─── Language ───

/** Supported language code: English or Russian. */
export const LanguageCodeSchema = z.enum(['en', 'ru']);

/**
 * Language configuration — two independent parameters.
 *
 * - `docs`: language of scaffolded templates, knowledge, specs, and standards.
 * - `chat`: language the AI agent uses when communicating with the user.
 *
 * Both default to `en`. Code and commits always stay English by convention.
 */
export const LanguageSchema = z.object({
  docs: LanguageCodeSchema.default('en'),
  chat: LanguageCodeSchema.default('en'),
});

// ─── Gates ───

/** Per-gate configuration entry. */
export const GateConfigEntrySchema = z.object({
  enabled: z.boolean().default(true),
  skip_allowed: z.boolean().default(false),
  min_approvers: z.number().int().nonnegative().default(1),
  custom_gates: z.array(z.string()).default([]),
});

/** Gates configuration — default + per-phase overrides. */
export const GatesConfigSchema = z.object({
  default: GateConfigEntrySchema.prefault({}),
  overrides: z.record(z.string(), GateConfigEntrySchema).default({}),
});

// ─── Stage ───

/** Stage enforcement settings — how strictly stage rules are applied. */
export const StageEnforcementSchema = z.object({
  restrict_phases: EnforcementSchema.default('advisory'),
  require_criteria: EnforcementSchema.default('advisory'),
});

/**
 * Delivery readiness criteria — semantic milestones for discovery artifacts.
 *
 * Each flag controls whether the corresponding discovery milestone is required
 * before transitioning to delivery. Set a flag to `false` to disable a milestone
 * that is not applicable to the project (e.g. `require_erd_not_skeleton: false`
 * for a CLI tool without a database).
 *
 * Milestones ordered: idea → roadmap → architecture → data model → usecases.
 */
export const DeliveryCriteriaSchema = z.object({
  /** Milestone 1: knowledge/idea.md must exist and not be a skeleton. */
  require_idea_not_skeleton: z.boolean().default(true),
  /** Milestone 2: knowledge/roadmap.md must exist and not be a skeleton. */
  require_roadmap: z.boolean().default(true),
  /** Milestone 3: knowledge/to-be/architecture.md must exist, not be a skeleton, and contain ## Details. */
  require_architecture_not_skeleton: z.boolean().default(true),
  /** Milestone 4: knowledge/to-be/erd.md must exist and contain an erDiagram block. */
  require_erd_not_skeleton: z.boolean().default(true),
  /** Milestone 5: knowledge/to-be/usecases.md must exist and not be a skeleton. */
  require_usecases_not_skeleton: z.boolean().default(true),
  /** design/ directory must contain at least this many .md files. */
  min_design_files: z.number().int().nonnegative().default(1),
  /** Check for skeleton markers (TODO/TBD/placeholder/skeleton) in ## Summary sections. */
  check_skeleton_markers: z.boolean().default(true),
});

/** Stage configuration section in config.yml. */
export const StageConfigSchema = z.object({
  enforcement: StageEnforcementSchema.prefault({}),
  delivery_criteria: DeliveryCriteriaSchema.prefault({}),
});

// ─── Hygiene ───

/**
 * Hygiene Sessions configuration — drift threshold and maintenance cadence.
 *
 * `drift_threshold`: number of structural/orphan drift findings from
 * `l1dder doctor --deep` at or above which the hybrid trigger recommends
 * running a Hygiene session (advisory only, never blocking).
 *
 * `maintenance_cadence_days`: expected interval (in days) between Hygiene
 * sessions once the project reaches the `maintenance` stage; used for the
 * cadence advisory (closes OQ-PS-1). `0` disables the cadence advisory.
 */
export const HygieneConfigSchema = z.object({
  drift_threshold: z.number().int().nonnegative().default(3),
  maintenance_cadence_days: z.number().int().nonnegative().default(30),
});

// ─── Context ───

/** Include mode for context entries. */
export const IncludeModeSchema = z.enum(['full', 'summary', 'exclude']);

/** Context Injection Engine configuration. */
export const ContextConfigSchema = z.object({
  token_budget: z.number().int().positive().default(120_000),
  reserved_tokens: z.number().int().nonnegative().default(30_000),
  chars_per_token: z.number().positive().default(3.0),
  overrides: z.record(z.string(), IncludeModeSchema).default({}),
  extra_files: z.array(z.string()).default([]),
});

// ─── Presets ───

/** Preset configuration for custom project profiles. */
export const PresetsSchema = z.object({
  active: z.string().default('default'),
  custom: z.record(z.string(), z.unknown()).default({}),
});

/** Active AI IDE adapter used by `l1dder sync` when `--ai` is omitted. */
export const AdapterIdSchema = z.string().min(1);

// ─── Root ConfigSchema ───

/** Root schema for `.l1dder/config.yml` — project configuration. */
export const ConfigSchema = z.object({
  schema_version: z.number().int().positive().default(1),
  role_mode: RoleModeSchema.default('solo'),
  language: LanguageSchema.prefault({}),
  /** Active AI IDE targets for `l1dder sync` / `l1dder init --ai`. */
  adapters: z.array(AdapterIdSchema).default([]),
  /** @deprecated Legacy single adapter — normalized to `adapters[]` on read. */
  adapter: AdapterIdSchema.optional(),
  gates: GatesConfigSchema.prefault({}),
  stage: StageConfigSchema.prefault({}),
  hygiene: HygieneConfigSchema.prefault({}),
  context: ContextConfigSchema.prefault({}),
  presets: PresetsSchema.prefault({}),
  hooks: HookConfigSchema.prefault({}),
});

// ─── Inferred types ───

/** Role mode type. */
export type RoleMode = z.infer<typeof RoleModeSchema>;
/** Enforcement level type. */
export type Enforcement = z.infer<typeof EnforcementSchema>;
/** Supported language code type. */
export type LanguageCode = z.infer<typeof LanguageCodeSchema>;
/** Language configuration type. */
export type Language = z.infer<typeof LanguageSchema>;
/** Gate configuration entry type. */
export type GateConfigEntry = z.infer<typeof GateConfigEntrySchema>;
/** Gates configuration type. */
export type GatesConfig = z.infer<typeof GatesConfigSchema>;
/** Stage enforcement type. */
export type StageEnforcement = z.infer<typeof StageEnforcementSchema>;
/** Delivery criteria type. */
export type DeliveryCriteria = z.infer<typeof DeliveryCriteriaSchema>;
/** Stage configuration type. */
export type StageConfig = z.infer<typeof StageConfigSchema>;
/** Hygiene configuration type. */
export type HygieneConfig = z.infer<typeof HygieneConfigSchema>;
/** Include mode type for context entries. */
export type IncludeMode = z.infer<typeof IncludeModeSchema>;
/** Context configuration type. */
export type ContextConfig = z.infer<typeof ContextConfigSchema>;
/** Presets type. */
export type Presets = z.infer<typeof PresetsSchema>;
/** Adapter ID type. */
export type AdapterId = z.infer<typeof AdapterIdSchema>;
/** Complete config.yml type. */
export type Config = z.infer<typeof ConfigSchema>;

