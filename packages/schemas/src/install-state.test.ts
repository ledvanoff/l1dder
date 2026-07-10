import { describe, expect, it } from 'vitest';

import { InstallStateSchema } from './install-state.js';

describe('InstallStateSchema', () => {
  it('parses valid install state', () => {
    const result = InstallStateSchema.parse({
      schema_version: 1,
      targets: {
        cursor: [
          {
            path: '.cursor/rules/l1dder.mdc',
            hash: 'abc123',
            source: 'rule:l1dder',
            profile: null,
            target: 'cursor',
            timestamp: '2026-06-29T00:00:00Z',
          },
        ],
      },
    });

    expect(result.schema_version).toBe(1);
    expect(result.targets.cursor).toHaveLength(1);
    expect(result.targets.cursor?.[0]?.path).toBe('.cursor/rules/l1dder.mdc');
  });

  it('defaults empty object to schema_version 1 and empty targets', () => {
    const result = InstallStateSchema.parse({});
    expect(result).toEqual({ schema_version: 1, targets: {} });
  });
});
