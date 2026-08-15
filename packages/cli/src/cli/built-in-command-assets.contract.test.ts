import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { SlashCommandFrontMatterSchema } from '@l1dder/schemas';
import { parseFrontMatter } from '@l1dder/yaml';
import { describe, expect, it } from 'vitest';

/**
 * DF-010 / DF-022: shipped command assets are what the AI IDE actually reads,
 * so a non-canonical phase id or a dotted slash reference in an asset reaches
 * the user directly — the composer inlines `phase` into the transition command
 * it generates. Front-matter schema validation alone runs on fixtures, so the
 * real files need their own guard.
 */
describe('built-in command assets use canonical names', () => {
  const assetsDir = join(
    process.cwd(),
    'packages/cli/assets/commands/built-in',
  );
  const assetFiles = readdirSync(assetsDir).filter((name) =>
    name.endsWith('.md'),
  );

  it('ships at least the known built-in commands', () => {
    expect(assetFiles.length).toBeGreaterThanOrEqual(9);
  });

  it.each(assetFiles)('%s declares a canonical phase', (fileName) => {
    const content = readFileSync(join(assetsDir, fileName), 'utf-8');
    const { data } = parseFrontMatter(content);

    const parsed = SlashCommandFrontMatterSchema.safeParse(data);

    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it.each(assetFiles)('%s never references the dotted slash form', (fileName) => {
    const content = readFileSync(join(assetsDir, fileName), 'utf-8');

    expect(content).not.toMatch(/\/l1dder\.[a-z]/);
  });
});
