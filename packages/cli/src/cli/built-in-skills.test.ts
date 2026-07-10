import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parseSkill, validateSkillRegistry } from '@l1dder/knowledge';
import type { ParsedSkill } from '@l1dder/core';

/**
 * Contract for the shipped built-in skill assets: every file must parse
 * against SkillFrontMatterSchema (SK1) and the whole set must pass
 * `validateSkillRegistry()` (SK10). Regression guard for skills carrying a
 * `phase` value that is not a real Phase enum member (e.g. the pre-Iteration-6
 * long-form `to_be_knowledge_update`), which silently broke skill loading
 * once phase typing became strict.
 */
describe('built-in skill assets', () => {
  const dir = join(process.cwd(), 'packages/cli/assets/skills/built-in');
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));

  it('has built-in skills to validate', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s parses against SkillFrontMatterSchema', (file) => {
    const result = parseSkill(join(dir, file), readFileSync(join(dir, file), 'utf-8'), 'builtin');
    if (!result.ok) throw result.error;
    expect(result.value.frontMatter.id).toBeTruthy();
  });

  it('passes validateSkillRegistry with no errors (SK10)', () => {
    const skills: ParsedSkill[] = files.map((file) => {
      const result = parseSkill(join(dir, file), readFileSync(join(dir, file), 'utf-8'), 'builtin');
      if (!result.ok) throw result.error;
      return result.value;
    });

    const validation = validateSkillRegistry(skills);
    expect(validation.errors).toEqual([]);
  });
});
