import { describe, expect, it } from 'vitest';
import type { ParsedSkill } from '@l1dder/core';

import { validateSkillRegistry } from './skill-validator.js';

function makeSkill(overrides: {
  id: string;
  trigger?: 'auto' | 'manual' | 'keyword';
  keywords?: string[];
  phase?: ParsedSkill['frontMatter']['phase'];
  filePath?: string;
  formatVersion?: 1;
}): ParsedSkill {
  return {
    frontMatter: {
      id: overrides.id,
      name: overrides.id,
      format_version: overrides.formatVersion ?? (1 as const),
      phase: overrides.phase ?? 'specify',
      roles: [] as string[],
      trigger: overrides.trigger ?? 'auto',
      priority: 5,
      context_profile: null,
      tags: [] as string[],
      builtin: true,
      ...(overrides.keywords !== undefined ? { keywords: overrides.keywords } : {}),
    },
    body: '',
    summary: '',
    filePath: overrides.filePath ?? `skills/${overrides.id}.md`,
    category: 'builtin',
  };
}

describe('validateSkillRegistry', () => {
  it('returns valid for correct skill list', () => {
    const result = validateSkillRegistry([makeSkill({ id: 'specify-feature' })]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects duplicate skill id across files', () => {
    const skills = [
      makeSkill({ id: 'specify-feature', filePath: 'skills/built-in/specify-feature.md' }),
      makeSkill({ id: 'specify-feature', filePath: 'skills/custom/specify-feature.md', trigger: 'manual' }),
    ];

    const result = validateSkillRegistry(skills);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Duplicate skill id'))).toBe(true);
  });

  it('detects duplicate auto-trigger per phase', () => {
    const skills = [
      makeSkill({ id: 'specify-feature', trigger: 'auto' }),
      makeSkill({ id: 'specify-custom', trigger: 'auto' }),
    ];

    const result = validateSkillRegistry(skills);
    expect(result.errors.some((e) => e.message.includes('Duplicate auto-trigger'))).toBe(true);
  });

  it('errors on keyword skill without keywords', () => {
    const result = validateSkillRegistry([makeSkill({ id: 'keyword-skill', trigger: 'keyword' })]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('keywords required'))).toBe(true);
  });

  it('warns on unexpected format_version', () => {
    const skill: ParsedSkill = {
      frontMatter: {
        id: 'old-skill',
        name: 'Old',
        format_version: 2 as unknown as 1,
        phase: 'specify',
        roles: [] as string[],
        trigger: 'manual',
        priority: 5,
        context_profile: null,
        tags: [] as string[],
        builtin: false,
      },
      body: '',
      summary: '',
      filePath: 'old.md',
      category: 'custom',
    };

    const result = validateSkillRegistry([skill]);
    expect(result.warnings.some((w) => w.message.includes('format_version'))).toBe(true);
  });

  it('validates empty list as valid', () => {
    const result = validateSkillRegistry([]);
    expect(result.valid).toBe(true);
  });

  it('keyword skill with keywords passes', () => {
    const result = validateSkillRegistry([
      makeSkill({ id: 'kw-skill', trigger: 'keyword', keywords: ['test', 'debug'] }),
    ]);
    expect(result.valid).toBe(true);
  });
});
