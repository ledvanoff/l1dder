import { describe, expect, it } from 'vitest';

import { parseSkill } from './skill-parser.js';

const VALID_SKILL = `---
id: specify-feature
name: Specify Feature
format_version: 1
phase: specify
roles: [architect, po]
trigger: auto
priority: 1
tags: [discovery]
builtin: true
---
## Summary

Specifies a new feature.

## Steps

1. Read context.
2. Write spec.
`;

describe('parseSkill', () => {
  it('parses valid skill file', () => {
    const result = parseSkill('skills/built-in/specify-feature.md', VALID_SKILL, 'builtin');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.frontMatter.id).toBe('specify-feature');
    expect(result.value.frontMatter.trigger).toBe('auto');
    expect(result.value.frontMatter.priority).toBe(1);
    expect(result.value.body).toContain('## Summary');
    expect(result.value.body).toContain('## Steps');
    expect(result.value.summary).toBe('Specifies a new feature.');
    expect(result.value.filePath).toBe('skills/built-in/specify-feature.md');
    expect(result.value.category).toBe('builtin');
  });

  it('returns ParseError for invalid front-matter (missing id)', () => {
    const content = `---
name: Bad Skill
format_version: 1
phase: specify
---
Body.`;

    const result = parseSkill('bad.md', content, 'custom');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('PARSE_ERROR');
  });

  it('returns ParseError when no front-matter fence', () => {
    const content = '# Just Markdown\n\nNo front-matter.';
    const result = parseSkill('plain.md', content, 'builtin');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('PARSE_ERROR');
    expect(result.error.details).toContain('No YAML front-matter');
  });

  it('applies defaults for optional fields', () => {
    const content = `---
id: minimal-skill
name: Minimal
format_version: 1
phase: implement
---
## Summary

A minimal skill.`;

    const result = parseSkill('minimal.md', content, 'custom');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.frontMatter.trigger).toBe('manual');
    expect(result.value.frontMatter.priority).toBe(5);
    expect(result.value.frontMatter.roles).toEqual([]);
    expect(result.value.frontMatter.builtin).toBe(false);
  });
});
