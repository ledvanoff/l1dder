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

/**
 * Canonical file / human-visible slash-command id prefix (`l1dder-<id>`).
 *
 * Shared with harness file names (e.g. `.cursor/commands/l1dder-<id>.md`).
 * The dotted form `/l1dder.<id>` is obsolete and must never be emitted.
 */
export const SLASH_COMMAND_FILE_PREFIX = 'l1dder-';

/** Internal transition-table trigger prefix (`slash:<id>`). Never show to humans. */
const SLASH_TRIGGER_PREFIX = 'slash:';

/**
 * Format the canonical human-visible slash command reference.
 *
 * @param commandId - command id without prefix (e.g. `"complete"`, `"update-tobe"`)
 * @returns `/l1dder-<id>` (hyphen form only)
 */
export function slashCommandRef(commandId: string): string {
  return `/${SLASH_COMMAND_FILE_PREFIX}${commandId}`;
}

/**
 * Map an internal trigger source `slash:<id>` to a human-visible slash ref.
 *
 * @param trigger - e.g. `"slash:complete"` from the transition table
 * @returns `/l1dder-<id>`, or `null` when the string is not `slash:<non-empty-id>`
 */
export function slashTriggerToRef(trigger: string): string | null {
  if (!trigger.startsWith(SLASH_TRIGGER_PREFIX)) {
    return null;
  }
  const commandId = trigger.slice(SLASH_TRIGGER_PREFIX.length);
  if (commandId.length === 0) {
    return null;
  }
  return slashCommandRef(commandId);
}

/**
 * Resolve the canonical human slash ref for the default command of a phase.
 *
 * @param phase - workflow phase
 * @returns `/l1dder-<id>` via {@link PHASE_COMMAND_MAP}, or `null` when unmapped
 */
export function phaseSlashRef(phase: Phase): string | null {
  const commandId = PHASE_COMMAND_MAP[phase];
  if (commandId === undefined) {
    return null;
  }
  return slashCommandRef(commandId);
}

/**
 * `role` value marking a command that deliberately has no persona.
 *
 * Used by dispatcher-style commands, where baking in a domain persona would
 * push the agent into that role's work before the projection asked for it.
 */
export const ROLE_NONE = 'none';

/** Wildcard command that can be invoked from any phase. */
export const WILDCARD_COMMANDS: readonly string[] = [
  'pause',
  'constitution',
  'next',
];

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
