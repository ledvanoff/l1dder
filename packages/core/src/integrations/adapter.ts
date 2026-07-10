/**
 * @deprecated Use `AIIdeAdapter` from `ports/ide-adapter.ts` instead.
 * Kept for backward compatibility during migration.
 */
export type { AIIdeAdapter as IdeAdapter } from '../ports/ide-adapter.js';

/**
 * In-memory registry of IDE adapters.
 *
 * Updated to use `AIIdeAdapter` interface. MVP: only Cursor adapter.
 */
import type { AIIdeAdapter } from '../ports/ide-adapter.js';

export class AdapterRegistry {
  private readonly adapters = new Map<string, AIIdeAdapter>();

  /** Register an adapter. */
  register(adapter: AIIdeAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  /** Get an adapter by ID. Returns `undefined` if not found. */
  get(id: string): AIIdeAdapter | undefined {
    return this.adapters.get(id);
  }

  /** List all registered adapters. */
  list(): readonly AIIdeAdapter[] {
    return [...this.adapters.values()];
  }
}
