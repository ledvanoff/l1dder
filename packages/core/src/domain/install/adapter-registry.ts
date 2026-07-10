import type { AIIdeAdapter } from '../../ports/ide-adapter.js';

/**
 * In-memory registry of AI IDE adapters (DEC-XH-3).
 *
 * Instantiated at the CLI composition root; adapters register at startup.
 */
export class IdeAdapterRegistry {
  private readonly adapters = new Map<string, AIIdeAdapter>();

  /** Register an adapter instance. Overwrites any existing entry with the same id. */
  register(adapter: AIIdeAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  /** Resolve an adapter by id. Returns `undefined` when not registered. */
  resolve(id: string): AIIdeAdapter | undefined {
    return this.adapters.get(id);
  }

  /** List all registered adapter ids. */
  ids(): readonly string[] {
    return [...this.adapters.keys()];
  }
}
