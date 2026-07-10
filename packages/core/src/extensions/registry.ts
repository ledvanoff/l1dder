import { L1dderError } from '../errors/l1dder-error.js';
import type { Tool } from './tool.js';

/**
 * Raised when attempting to register a tool with an ID that is already taken.
 */
export class ToolAlreadyRegisteredError extends L1dderError {
  readonly code = 'TOOL_ALREADY_REGISTERED' as const;

  constructor(readonly toolId: string) {
    super(`Tool "${toolId}" is already registered`);
  }
}

/**
 * In-memory registry of tools.
 *
 * MVP skeleton — populated by extension system in P2.
 */
export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  /** Register a tool. Throws if a tool with the same ID already exists. */
  register(tool: Tool): void {
    if (this.tools.has(tool.meta.id)) {
      throw new ToolAlreadyRegisteredError(tool.meta.id);
    }
    this.tools.set(tool.meta.id, tool);
  }

  /** Get a tool by ID. Returns `undefined` if not found. */
  get(id: string): Tool | undefined {
    return this.tools.get(id);
  }

  /** List all registered tools. */
  list(): readonly Tool[] {
    return [...this.tools.values()];
  }
}
