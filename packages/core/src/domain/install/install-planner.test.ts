import { describe, expect, it } from 'vitest';

import { planInstall } from './install-planner.js';
import type { TransformedInstallFile } from './install-types.js';

const TARGET = 'cursor';

function file(
  path: string,
  hash: string,
  overrides: Partial<TransformedInstallFile> = {},
): TransformedInstallFile {
  return {
    path,
    hash,
    source: `source:${path}`,
    content: `content-${hash}`,
    profile: null,
    target: TARGET,
    ...overrides,
  };
}

describe('planInstall', () => {
  it('marks new transformed files as create', () => {
    const plan = planInstall([file('.cursor/rules/l1dder.mdc', 'h1')], { schema_version: 1, targets: {} }, TARGET);
    expect(plan.items).toEqual([
      expect.objectContaining({ path: '.cursor/rules/l1dder.mdc', action: 'create' }),
    ]);
  });

  it('marks unchanged hash as skip', () => {
    const plan = planInstall(
      [file('.cursor/rules/l1dder.mdc', 'same-hash')],
      {
        schema_version: 1,
        targets: {
          cursor: [
            {
              path: '.cursor/rules/l1dder.mdc',
              hash: 'same-hash',
              source: 'rule:l1dder',
              profile: null,
              target: TARGET,
              timestamp: '2026-01-01T00:00:00Z',
            },
          ],
        },
      },
      TARGET,
    );
    expect(plan.items[0]?.action).toBe('skip');
  });

  it('marks changed hash as update', () => {
    const plan = planInstall(
      [file('.cursor/rules/l1dder.mdc', 'new-hash')],
      {
        schema_version: 1,
        targets: {
          cursor: [
            {
              path: '.cursor/rules/l1dder.mdc',
              hash: 'old-hash',
              source: 'rule:l1dder',
              profile: null,
              target: TARGET,
              timestamp: '2026-01-01T00:00:00Z',
            },
          ],
        },
      },
      TARGET,
    );
    expect(plan.items[0]?.action).toBe('update');
  });

  it('marks state-only files as orphan', () => {
    const plan = planInstall([], {
      schema_version: 1,
      targets: {
        cursor: [
          {
            path: '.cursor/commands/l1dder-old.md',
            hash: 'old',
            source: 'command:old',
            profile: null,
            target: TARGET,
            timestamp: '2026-01-01T00:00:00Z',
          },
        ],
      },
    }, TARGET);

    expect(plan.items).toEqual([
      expect.objectContaining({ path: '.cursor/commands/l1dder-old.md', action: 'orphan' }),
    ]);
  });
});
