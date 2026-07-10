import { describe, expect, it } from 'vitest';

import { IdeAdapterRegistry } from './adapter-registry.js';
import type { AIIdeAdapter } from '../../ports/ide-adapter.js';

function stubAdapter(id: string): AIIdeAdapter {
  return {
    id,
    manifest: {
      id,
      name: id,
      version: 1,
      outputs: {},
      marker: '',
      managedPrefix: 'l1dder-',
    },
    transformForInstall: () => Promise.resolve([]),
    generate: () =>
      Promise.resolve({ created: [], updated: [], skipped: [], errors: [] }),
    validate: () => Promise.resolve({ checks: [], passed: true }),
  };
}

describe('IdeAdapterRegistry', () => {
  it('resolves registered adapter and returns undefined for unknown id', () => {
    const registry = new IdeAdapterRegistry();
    const cursor = stubAdapter('cursor');
    registry.register(cursor);

    expect(registry.resolve('cursor')).toBe(cursor);
    expect(registry.resolve('unknown')).toBeUndefined();
  });

  it('lists registered adapter ids', () => {
    const registry = new IdeAdapterRegistry();
    registry.register(stubAdapter('cursor'));
    registry.register(stubAdapter('claude'));

    expect(registry.ids()).toEqual(['cursor', 'claude']);
  });
});
