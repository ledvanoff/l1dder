import type { SlashCommandFrontMatter, SlashCommandBody } from '@l1dder/schemas';
import type { Phase } from './phase.js';

/**
 * Runtime representation of a parsed L1DDER canonical slash command.
 *
 * Combines validated YAML front-matter with extracted body sections and file metadata.
 */
export interface ParsedSlashCommand {
  readonly frontMatter: SlashCommandFrontMatter;
  readonly sections: SlashCommandBody;
  readonly body: string;
  readonly filePath: string;
}

/**
 * Registry for loaded and merged L1DDER slash commands.
 *
 * Mirrors `SkillRegistry` interface pattern.
 * Implementation: `InMemorySlashCommandRegistry` in `@l1dder/knowledge`.
 */
export interface SlashCommandRegistry {
  /** Return a command by its unique id. */
  get(id: string): ParsedSlashCommand | undefined;

  /** Return all registered commands. */
  getAll(): readonly ParsedSlashCommand[];

  /** Return the default command mapped to a phase (via PHASE_COMMAND_MAP). */
  getByPhase(phase: Phase): ParsedSlashCommand | undefined;

  /** Register a command (last wins on id conflict). */
  register(command: ParsedSlashCommand): void;

  /** Check whether a command with the given id is registered. */
  has(id: string): boolean;
}

/**
 * Maps Phase Machine phases to default slash command ids (SC3).
 *
 * Each entry maps a phase to the command that transitions INTO that phase.
 * Special cases:
 * - `idle` → `"specify"` (from IDLE, the next action is to specify)
 * - `"*"` key handled separately for `pause` (any-phase command)
 */
export const PHASE_COMMAND_MAP: Readonly<Partial<Record<Phase, string>>> & { readonly '*'?: string } = {
  idle: 'specify',
  specify: 'plan',
  plan: 'update-tobe',
  update_tobe: 'tasks',
  tasks: 'implement',
  implement: 'update-asis',
  update_asis: 'complete',
  complete: 'specify',
};

/** Wildcard command that can be invoked from any phase. */
export const WILDCARD_COMMANDS: readonly string[] = ['pause', 'constitution'];

/**
 * Resolve the default slash command for a given phase.
 *
 * Uses `PHASE_COMMAND_MAP` for phase-specific commands.
 * Returns `undefined` if no command is mapped to the phase.
 */
export function resolveSlashCommand(
  phase: Phase,
  registry: SlashCommandRegistry,
): ParsedSlashCommand | undefined {
  const commandId = PHASE_COMMAND_MAP[phase];
  if (!commandId) return undefined;
  return registry.get(commandId);
}
