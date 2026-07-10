import { describe, expect, it } from 'vitest';
import type { ParsedSkill } from '@l1dder/core';

import { mergeSkill } from './skill-merger.js';

function makeSkill(overrides: {
  body?: string;
  summary?: string;
  filePath?: string;
  category?: 'builtin' | 'custom';
  frontMatter?: Partial<ParsedSkill['frontMatter']>;
} = {}): ParsedSkill {
  const defaults = {
    id: 'test-skill',
    name: 'Test',
    format_version: 1 as const,
    phase: 'specify' as const,
    roles: [] as string[],
    trigger: 'auto' as const,
    priority: 5,
    context_profile: null,
    tags: [] as string[],
    builtin: true,
  };

  return {
    frontMatter: { ...defaults, ...overrides.frontMatter },
    body: overrides.body ?? '## Summary\n\nBuilt-in.\n\n## Steps\n\n1. Step one.\n2. Step two.',
    summary: overrides.summary ?? 'Built-in.',
    filePath: overrides.filePath ?? 'skills/built-in/test-skill.md',
    category: overrides.category ?? 'builtin',
  };
}

describe('mergeSkill', () => {
  it('replace strategy replaces body entirely', () => {
    const builtin = makeSkill();
    const override = makeSkill({
      body: '## Summary\n\nCustom body.',
      category: 'custom',
      frontMatter: { override_strategy: 'replace', builtin: false },
    });

    const result = mergeSkill(builtin, override);
    expect(result.body).toBe('## Summary\n\nCustom body.');
    expect(result.frontMatter.builtin).toBe(true);
  });

  it('append_steps appends custom Steps', () => {
    const builtin = makeSkill({
      body: '## Summary\n\nOriginal.\n\n## Steps\n\n1. Built-in step.',
    });
    const override = makeSkill({
      body: '## Steps\n\nA. Custom step A.\nB. Custom step B.',
      category: 'custom',
      frontMatter: { override_strategy: 'append_steps', builtin: false },
    });

    const result = mergeSkill(builtin, override);
    expect(result.body).toContain('1. Built-in step.');
    expect(result.body).toContain('A. Custom step A.');
    expect(result.body).toContain('B. Custom step B.');
  });

  it('patch replaces named section', () => {
    const builtin = makeSkill({
      body: '## Summary\n\nOriginal summary.\n\n## Validation\n\nOld validation.\n\n## Steps\n\n1. Step.',
    });
    const override = makeSkill({
      body: '## Validation\n\nNew validation content.',
      category: 'custom',
      frontMatter: { override_strategy: 'patch', builtin: false },
    });

    const result = mergeSkill(builtin, override);
    expect(result.body).toContain('New validation content.');
    expect(result.body).not.toContain('Old validation.');
    expect(result.body).toContain('## Steps');
    expect(result.body).toContain('1. Step.');
  });

  it('defaults to replace when no override_strategy', () => {
    const builtin = makeSkill();
    const override = makeSkill({
      body: '## Summary\n\nReplaced.',
      category: 'custom',
      frontMatter: { builtin: false },
    });

    const result = mergeSkill(builtin, override);
    expect(result.body).toBe('## Summary\n\nReplaced.');
  });

  it('preserves builtin flag from original', () => {
    const builtin = makeSkill();
    const override = makeSkill({
      category: 'custom',
      frontMatter: { override_strategy: 'replace', builtin: false },
    });

    const result = mergeSkill(builtin, override);
    expect(result.frontMatter.builtin).toBe(true);
  });
});
