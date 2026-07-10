import { describe, expect, it } from 'vitest';
import { IdeAdapterRegistry } from '@l1dder/core';
import { InMemoryFileSystem, NullLogger } from '@l1dder/core/testing';
import { CursorAdapter } from '@l1dder/adapter-cursor';
import { ClaudeAdapter } from '@l1dder/adapter-claude';

import { checkIde } from './ide.js';
import type { CliContext } from '../../../context.js';

describe('checkIde with real adapters (integration smoke)', () => {
  it('passes for both the real Cursor and Claude adapters (E8 regression guard)', async () => {
    const fs = new InMemoryFileSystem();
    const logger = new NullLogger();
    const registry = new IdeAdapterRegistry();
    registry.register(new CursorAdapter({ fs, logger }));
    registry.register(new ClaudeAdapter({ fs, logger }));

    const ctx = { cwd: '/project', fs, logger } as unknown as CliContext;
    const checks = await checkIde(ctx, registry);

    for (const check of checks) {
      expect(check.level).toBe('pass');
    }
  });
});
