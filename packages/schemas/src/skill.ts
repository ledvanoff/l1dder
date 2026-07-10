import { z } from 'zod/v4';

import { PhaseSchema } from './state.js';

// ─── Enums ───

/** Activation trigger type for skills. */
export const SkillTriggerSchema = z.enum(['auto', 'manual', 'keyword']);

/** Override strategy when custom skill overrides built-in by id. */
export const SkillOverrideStrategySchema = z.enum(['replace', 'append_steps', 'patch']);

/** Skill category: framework-managed or user-defined. */
export const SkillCategorySchema = z.enum(['builtin', 'custom']);

/**
 * Valid values for a skill's front-matter `phase` field.
 *
 * A superset of {@link PhaseSchema}: `'init'` is a sentinel for skills
 * activated during `l1dder init` (before any Phase exists — INIT is not a
 * runtime Phase, see transitions-table.ts), and `'*'` marks skills relevant
 * across every phase (e.g. `session-handoff`).
 */
export const SkillPhaseSchema = z.union([PhaseSchema, z.literal('init'), z.literal('*')]);

// ─── Front-matter schema ───

/**
 * YAML front-matter schema for L1DDER skill files.
 *
 * Matches SK1 §4 from design/skills.md.
 */
export const SkillFrontMatterSchema = z.object({
  /** Unique skill identifier (kebab-case). */
  id: z.string().regex(/^[a-z][a-z0-9-]*$/, 'kebab-case required'),

  /** Human-readable display name. */
  name: z.string().min(1),

  /** Format version for migration support. */
  format_version: z.literal(1),

  /** Primary phase where this skill activates. */
  phase: SkillPhaseSchema,

  /** Roles that can use this skill (empty = all roles). */
  roles: z.array(z.string()).default([]),

  /** Activation trigger type. */
  trigger: SkillTriggerSchema.default('manual'),

  /** Priority for resolution conflicts (1 = highest). */
  priority: z.number().int().min(1).max(10).default(5),

  /** Context profile override (CE3 profile id); null = inherit from phase. */
  context_profile: z.string().nullable().default(null),

  /** Categorization tags for discovery and filtering. */
  tags: z.array(z.string()).default([]),

  /** Override strategy when custom skill overrides built-in by id. */
  override_strategy: SkillOverrideStrategySchema.optional(),

  /** Keyword patterns for trigger: keyword (regex strings). */
  keywords: z.array(z.string()).optional(),

  /** Whether this is a built-in (framework-managed) skill. */
  builtin: z.boolean().default(false),
});

// NOTE: the runtime "parsed skill" shape (front-matter + body + file metadata)
// is NOT re-declared here as a Zod schema — it's never parsed as one unit
// (only `frontMatter` is validated via SkillFrontMatterSchema; `body`/`summary`/
// `filePath` are assembled programmatically by `parseSkill()`). The single
// source of truth for that runtime type is `ParsedSkill` in `@l1dder/core`
// (`domain/skill-types.ts`), which reuses `SkillFrontMatter`/`SkillCategory`
// from this file to avoid duplicating the front-matter/category shape.

// ─── Inferred types ───

/** Skill trigger type. */
export type SkillTrigger = z.infer<typeof SkillTriggerSchema>;
/** Skill override strategy type. */
export type SkillOverrideStrategy = z.infer<typeof SkillOverrideStrategySchema>;
/** Skill category type. */
export type SkillCategory = z.infer<typeof SkillCategorySchema>;
/** Skill front-matter phase type (Phase | 'init' | '*'). */
export type SkillPhase = z.infer<typeof SkillPhaseSchema>;
/** Skill front-matter type. */
export type SkillFrontMatter = z.infer<typeof SkillFrontMatterSchema>;
