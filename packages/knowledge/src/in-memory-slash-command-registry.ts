import type { Phase, SlashCommandRegistry } from '@l1dder/core';
import type { ParsedSlashCommand } from '@l1dder/core';
import { PHASE_COMMAND_MAP } from '@l1dder/core';

/**
 * In-memory Map-based implementation of SlashCommandRegistry.
 *
 * `register()` with id dedup (last wins).
 * `getByPhase()` uses PHASE_COMMAND_MAP for resolution.
 */
export class InMemorySlashCommandRegistry implements SlashCommandRegistry {
  private readonly commands = new Map<string, ParsedSlashCommand>();

  get(id: string): ParsedSlashCommand | undefined {
    return this.commands.get(id);
  }

  getAll(): readonly ParsedSlashCommand[] {
    return [...this.commands.values()];
  }

  getByPhase(phase: Phase): ParsedSlashCommand | undefined {
    const commandId = PHASE_COMMAND_MAP[phase];
    if (!commandId) return undefined;
    return this.commands.get(commandId);
  }

  register(command: ParsedSlashCommand): void {
    this.commands.set(command.frontMatter.id, command);
  }

  has(id: string): boolean {
    return this.commands.has(id);
  }
}
