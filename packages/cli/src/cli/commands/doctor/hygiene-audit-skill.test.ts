import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parseSkill } from '@l1dder/knowledge';

/**
 * Validates the built-in `hygiene-audit` skill (T-05, DEC-6-3) parses cleanly
 * against SK1/SkillFrontMatterSchema and satisfies the single-auto-trigger
 * invariant (trivially, since it uses `trigger: manual`).
 */
describe('hygiene-audit built-in skill', () => {
  const skillPath = join(
    process.cwd(),
    'packages/cli/assets/skills/built-in/hygiene-audit.md',
  );
  const content = readFileSync(skillPath, 'utf-8');

  it('parses successfully against SkillFrontMatterSchema', () => {
    const result = parseSkill(skillPath, content, 'builtin');
    expect(result.ok).toBe(true);
  });

  it('declares phase: hygiene and trigger: manual (single-auto-trigger invariant not violated)', () => {
    const result = parseSkill(skillPath, content, 'builtin');
    if (!result.ok) throw result.error;
    expect(result.value.frontMatter.phase).toBe('hygiene');
    expect(result.value.frontMatter.trigger).toBe('manual');
    expect(result.value.frontMatter.id).toBe('hygiene-audit');
    expect(result.value.frontMatter.builtin).toBe(true);
  });

  it('body contains the required sections (Summary/When to Use/Steps/Validation/Output)', () => {
    const result = parseSkill(skillPath, content, 'builtin');
    if (!result.ok) throw result.error;
    for (const section of ['## Summary', '## When to Use', '## Steps', '## Validation', '## Output']) {
      expect(result.value.body).toContain(section);
    }
  });
});
