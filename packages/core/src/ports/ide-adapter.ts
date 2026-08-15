import type { Config } from '@l1dder/schemas';
import type { ParsedSkill } from '../domain/skill-types.js';
import type { WorkflowPosition } from '../domain/transition-types.js';

/**
 * Opaque resolved standards data passed through to the adapter.
 *
 * Concrete type at runtime: `MergedStandards` from `@l1dder/knowledge`.
 * Core layer does not depend on knowledge — adapters narrow via cast.
 */
export type ResolvedStandards = Readonly<Record<string, unknown>>;

/**
 * Opaque resolved team configuration.
 *
 * Concrete type at runtime: team data from `@l1dder/knowledge` or config.
 * Team mode is P1; placeholder for forward compatibility.
 */
export type ResolvedTeam = Readonly<Record<string, unknown>>;

// ─── Forward-declared domain types used by AdapterContext ───
// ParsedPersona and ParsedSlashCommand are defined in core/domain/ (T-03).
// Re-imported here to keep the port self-contained.

import type { ParsedPersona } from '../domain/persona.js';
import type { ParsedSlashCommand } from '../domain/slash-command.js';
import type { TransformedInstallFile } from '../domain/install/install-types.js';

export type { TransformedInstallFile } from '../domain/install/install-types.js';

// ─── Manifest ───

/** Configuration for a specific output type (commands, skills, rules, agents_md, hooks). */
export interface AdapterOutputConfig {
  readonly commands?: {
    readonly directory: string;
    readonly filePattern: string;
    readonly frontMatter: readonly string[];
  };
  readonly skills?: {
    readonly directory: string;
    readonly structure: string;
  };
  readonly rules?: {
    readonly directory: string;
    readonly file: string;
    readonly frontMatter: readonly string[];
  };
  readonly agents_md?: {
    readonly directory: string;
    readonly file: string;
  };
  /** Hooks output: generates the IDE-native hooks dispatch file (e.g. .cursor/hooks.json). */
  readonly hooks?: {
    readonly directory: string;
    readonly file: string;
  };
}

/** Per-target content exclusion rules declared in an adapter manifest. */
export interface AdapterContentExclusions {
  readonly skillIds?: readonly string[];
  readonly commandIds?: readonly string[];
}

/** Static metadata for an adapter: paths, marker format, version. */
export interface AdapterManifest {
  readonly id: string;
  readonly name: string;
  readonly version: number;
  readonly outputs: AdapterOutputConfig;
  readonly marker: string;
  readonly managedPrefix: string;
  /** Explicit skill/command ids to skip for this target. */
  readonly contentExclusions?: AdapterContentExclusions;
  /** Skip items whose tags intersect this list. */
  readonly excludeTags?: readonly string[];
}

// ─── Context (input to generate/validate) ───

/** Full context passed to adapter's generate/validate methods. */
export interface AdapterContext {
  readonly projectRoot: string;
  readonly config: Config;
  readonly skills: readonly ParsedSkill[];
  readonly commands: readonly ParsedSlashCommand[];
  readonly personas: readonly ParsedPersona[];
  readonly standards: ResolvedStandards;
  readonly team?: ResolvedTeam;
  readonly state?: WorkflowPosition;
  /**
   * Canonical project name from `state.project.name`.
   * Adapters fall back to `basename(projectRoot)` when omitted.
   */
  readonly projectName?: string;
  readonly force: boolean;
  readonly dryRun: boolean;
}

// ─── Report types ───

/** A single generation error for a specific file. */
export interface GenerationError {
  readonly path: string;
  readonly message: string;
  readonly cause?: unknown;
}

/** Report returned by adapter after generation. */
export interface GenerationReport {
  readonly created: readonly string[];
  readonly updated: readonly string[];
  readonly skipped: readonly string[];
  readonly errors: readonly GenerationError[];
}

/** A single validation check result. */
export interface Check {
  readonly name: string;
  readonly passed: boolean;
  readonly message?: string;
}

/** Report returned by adapter after validation. */
export interface ValidationReport {
  readonly checks: readonly Check[];
  readonly passed: boolean;
}

// ─── Adapter interface ───

/**
 * Port interface for AI IDE adapters (AD10).
 *
 * Each adapter transforms L1DDER canonical artifacts into IDE-native files.
 * P0: Cursor adapter generates `.cursor/commands/`, `.cursor/skills-l1dder/`,
 * `.cursor/rules/l1dder.mdc`, and `AGENTS.md`.
 */
export interface AIIdeAdapter {
  /** Unique adapter identifier (e.g. "cursor", "claude-code"). */
  readonly id: string;

  /** Static metadata: output paths, marker format. */
  readonly manifest: AdapterManifest;

  /**
   * Transform canonical artifacts into install-ready IDE files (OQ-XH-4).
   *
   * Pure transformation — no disk I/O. Used by InstallPlanner in sync/init.
   */
  transformForInstall(ctx: AdapterContext): Promise<readonly TransformedInstallFile[]>;

  /** Generate all IDE-specific files from project context. */
  generate(ctx: AdapterContext): Promise<GenerationReport>;

  /** Validate generated files against expected state. */
  validate(ctx: AdapterContext): Promise<ValidationReport>;
}
