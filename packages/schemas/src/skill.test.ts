import { describe, expect, it } from 'vitest';

import { SkillFrontMatterSchema } from './skill.js';

describe('SkillFrontMatterSchema', () => {
  const validMinimal = {
    id: 'specify-feature',
    name: 'Specify Feature',
    format_version: 1 as const,
    phase: 'specify',
  };

  const validFull = {
    ...validMinimal,
    roles: ['architect', 'po'],
    trigger: 'auto' as const,
    priority: 1,
    context_profile: 'specify-deep',
    tags: ['discovery', 'requirements'],
    override_strategy: 'replace' as const,
    keywords: ['specify', 'feature'],
    builtin: true,
  };

  it('validates valid skill front-matter with all fields', () => {
    const result = SkillFrontMatterSchema.parse(validFull);
    expect(result.id).toBe('specify-feature');
    expect(result.trigger).toBe('auto');
    expect(result.builtin).toBe(true);
    expect(result.roles).toEqual(['architect', 'po']);
  });

  it('applies defaults for optional skill fields', () => {
    const result = SkillFrontMatterSchema.parse(validMinimal);
    expect(result.trigger).toBe('manual');
    expect(result.priority).toBe(5);
    expect(result.roles).toEqual([]);
    expect(result.tags).toEqual([]);
    expect(result.builtin).toBe(false);
    expect(result.context_profile).toBeNull();
  });

  it('rejects invalid skill id (not kebab-case)', () => {
    expect(() =>
      SkillFrontMatterSchema.parse({ ...validMinimal, id: 'Invalid_ID' }),
    ).toThrow();
  });

  it('rejects id starting with number', () => {
    expect(() =>
      SkillFrontMatterSchema.parse({ ...validMinimal, id: '1-bad' }),
    ).toThrow();
  });

  it('rejects id with uppercase', () => {
    expect(() =>
      SkillFrontMatterSchema.parse({ ...validMinimal, id: 'Bad-Name' }),
    ).toThrow();
  });

  it('rejects format_version other than 1', () => {
    expect(() =>
      SkillFrontMatterSchema.parse({ ...validMinimal, format_version: 2 }),
    ).toThrow();
  });

  it('rejects priority out of range', () => {
    expect(() =>
      SkillFrontMatterSchema.parse({ ...validMinimal, priority: 0 }),
    ).toThrow();
    expect(() =>
      SkillFrontMatterSchema.parse({ ...validMinimal, priority: 11 }),
    ).toThrow();
  });

  it('rejects empty name', () => {
    expect(() =>
      SkillFrontMatterSchema.parse({ ...validMinimal, name: '' }),
    ).toThrow();
  });

  it('rejects an unknown phase value (typo protection)', () => {
    expect(() =>
      SkillFrontMatterSchema.parse({ ...validMinimal, phase: 'speicfy' }),
    ).toThrow();
  });

  it('accepts the "init" phase sentinel (pre-Phase-machine skills)', () => {
    const result = SkillFrontMatterSchema.parse({ ...validMinimal, phase: 'init' });
    expect(result.phase).toBe('init');
  });

  it('accepts the "*" phase wildcard (cross-phase skills)', () => {
    const result = SkillFrontMatterSchema.parse({ ...validMinimal, phase: '*' });
    expect(result.phase).toBe('*');
  });

  it('accepts every real Phase enum value', () => {
    const result = SkillFrontMatterSchema.parse({ ...validMinimal, phase: 'hygiene' });
    expect(result.phase).toBe('hygiene');
  });
});
