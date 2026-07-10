import { z } from 'zod/v4';

// ─── Hook Event ───

/**
 * Canonical lifecycle events for L1DDER hooks.
 *
 * These are IDE-neutral events. Each adapter maps them to its native equivalents.
 * Cursor mapping: PreToolUse→beforeShellExecution, PostToolUse→afterFileEdit,
 * UserPromptSubmit→beforeSubmitPrompt, Stop→stop, SessionStart→sessionStart,
 * SessionEnd→sessionEnd, PreCompact→preCompact.
 */
export const HookEventSchema = z.enum([
  'PreToolUse',
  'PostToolUse',
  'UserPromptSubmit',
  'Stop',
  'SessionStart',
  'SessionEnd',
  'PreCompact',
]);

// ─── Hook Outcome ───

/**
 * Possible outcomes of a hook execution.
 *
 * - `allow`: pass-through (echo stdin, exit 0).
 * - `warn`: print messages to stderr, but still pass-through (exit 0).
 * - `block`: print messages to stderr, abort the operation (exit 2).
 */
export const HookOutcomeSchema = z.enum(['allow', 'warn', 'block']);

// ─── Hook Profile ───

/**
 * Enforcement profile controlling which built-in hooks are active.
 *
 * - `minimal`: only security-critical hooks (secrets, precompact save, session start).
 * - `standard`: recommended default — adds doc guard and format-after-edit.
 * - `strict`: full enforcement — adds compact reminder.
 */
export const HookProfileSchema = z.enum(['minimal', 'standard', 'strict']);

// ─── Hook Matcher ───

/**
 * Matcher criteria for selectively activating a hook within an event.
 *
 * All fields are optional; an empty/absent matcher always matches.
 * - `tool`: match by IDE tool name (e.g. "shell", "file_edit").
 * - `pathGlobs`: match by affected file path using glob patterns.
 * - `commandPattern`: match by shell command using a substring or regex pattern.
 */
export const HookMatcherSchema = z.object({
  tool: z.string().optional(),
  pathGlobs: z.array(z.string()).optional(),
  commandPattern: z.string().optional(),
});

// ─── Hook Definition ───

/**
 * Full definition of a single hook.
 *
 * Each built-in hook is declared as a `HookDefinition` stored in the core registry.
 * User-defined hooks may extend this in the future.
 */
export const HookDefinitionSchema = z.object({
  /** Unique stable identifier (e.g. "pre-commit-guard"). */
  id: z.string().min(1),
  /** Human-readable name shown in listings. */
  name: z.string().min(1),
  /** Schema version — always 1 for current format. */
  format_version: z.literal(1),
  /** Canonical event this hook listens to. */
  event: HookEventSchema,
  /** Short description of what this hook does. */
  description: z.string().min(1),
  /** Optional matcher to filter when this hook fires within the event. */
  matcher: HookMatcherSchema.optional(),
  /** Profiles in which this hook is active. */
  profiles: z.array(HookProfileSchema).min(1),
  /** Default outcome level when the hook fires. */
  outcome_level: HookOutcomeSchema,
  /** Whether this is a built-in L1DDER hook (not user-defined). */
  builtin: z.boolean(),
});

// ─── Hook Payload (dispatcher input) ───

/**
 * Normalised hook payload parsed from stdin JSON sent by the IDE.
 *
 * Fields map from the Cursor/ECC stdin contract:
 * - command / args.command → `command`
 * - path / file / args.filePath → `filePath`
 * - prompt / content / message → `prompt`
 * - output / result → `output`
 * - conversation_id → `conversationId`
 * - workspace_roots → `workspaceRoots`
 */
export const HookPayloadSchema = z.object({
  /** Canonical event name, inferred from the CLI argument. */
  event: HookEventSchema,
  /** Shell command string (for PreToolUse / PostToolUse). */
  command: z.string().optional(),
  /** File path affected by the action (for PostToolUse). */
  filePath: z.string().optional(),
  /** Prompt text (for UserPromptSubmit). */
  prompt: z.string().optional(),
  /** Output/result text (for PostToolUse / Stop). */
  output: z.string().optional(),
  /** IDE conversation/session identifier. */
  conversationId: z.string().optional(),
  /** Workspace root paths provided by the IDE. */
  workspaceRoots: z.array(z.string()).optional(),
  /** Raw stdin object (preserved for pass-through echo). */
  raw: z.record(z.string(), z.unknown()).optional(),
});

// ─── Hook Result (dispatcher output) ───

/**
 * Aggregated result returned by the hook dispatcher after running all active hooks.
 */
export const HookResultSchema = z.object({
  /** Final outcome (worst-case aggregation across all hooks). */
  outcome: HookOutcomeSchema,
  /** Human-readable messages to emit (to stderr for warn/block). */
  messages: z.array(z.string()),
});

// ─── Hook Config (config.yml section) ───

/**
 * Configuration for the hooks system, stored under the `hooks:` key in config.yml.
 *
 * All fields have safe defaults so existing projects without a `hooks:` section
 * continue to work without modification.
 */
export const HookConfigSchema = z.object({
  /** Whether the hook system is enabled. Overridable via L1DDER_HOOKS=off. */
  enabled: z.boolean().default(true),
  /** Active enforcement profile. Overridable via L1DDER_HOOK_PROFILE env var. */
  profile: HookProfileSchema.default('standard'),
  /**
   * Hook IDs to disable regardless of profile.
   * Overridable via L1DDER_DISABLED_HOOKS (comma-separated).
   */
  disabled: z.array(z.string()).default([]),
  /**
   * Maximum characters loaded from handoff.md on SessionStart (E3).
   * Overridable via L1DDER_SESSION_START_MAX_CHARS env var.
   */
  session_start_max_chars: z.number().int().positive().default(8000),
});

// ─── Inferred types ───

/** Canonical lifecycle event type. */
export type HookEvent = z.infer<typeof HookEventSchema>;
/** Hook outcome type. */
export type HookOutcome = z.infer<typeof HookOutcomeSchema>;
/** Enforcement profile type. */
export type HookProfile = z.infer<typeof HookProfileSchema>;
/** Hook matcher type. */
export type HookMatcher = z.infer<typeof HookMatcherSchema>;
/** Full hook definition type. */
export type HookDefinition = z.infer<typeof HookDefinitionSchema>;
/** Normalised hook payload from IDE stdin. */
export type HookPayload = z.infer<typeof HookPayloadSchema>;
/** Hook dispatcher result. */
export type HookResult = z.infer<typeof HookResultSchema>;
/** Hooks config section type. */
export type HookConfig = z.infer<typeof HookConfigSchema>;
