import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { validateHandoff } from '@l1dder/context';

const ASSETS_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../assets',
);

describe('shipped handoff templates', () => {
  it('en handoff-template.md passes validateHandoff', () => {
    const content = readFileSync(
      join(ASSETS_ROOT, 'i18n/en/templates/handoff-template.md'),
      'utf8',
    );

    const result = validateHandoff(content);
    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('ru handoff-template.md passes validateHandoff', () => {
    const content = readFileSync(
      join(ASSETS_ROOT, 'i18n/ru/templates/handoff-template.md'),
      'utf8',
    );

    const result = validateHandoff(content);
    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });
});
