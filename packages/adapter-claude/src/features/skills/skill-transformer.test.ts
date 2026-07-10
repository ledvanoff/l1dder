import { describe, it, expect } from 'vitest';
import type { ParsedSkill } from '@l1dder/core';
import { transformSkill } from './skill-transformer.js';
import { claudeManifest } from '../../claude-manifest.js';

const SKILL_BODY = [
  '# Specify Feature',
  '',
  '## Summary',
  '',
  'Collects requirements for a feature through dialog.',
  '',
  '## When to Use',
  '',
  '- When Phase Machine enters SPECIFY.',
  '',
  '## Steps',
  '',
  '1. Read architecture',
  '2. Collect requirements',
  '',
  '## Validation',
  '',
  '- [ ] spec.md exists',
].join('\n');

function makeSkill(overrides: Partial<ParsedSkill> = {}): ParsedSkill {
  return {
    frontMatter: {
      id: 'specify-feature',
      name: 'Specify Feature',
      format_version: 1,
      phase: 'specify',
      roles: ['po', 'analyst'],
      trigger: 'auto',
      priority: 1,
      context_profile: null,
      tags: ['discovery'],
      builtin: true,
    },
    body: SKILL_BODY,
    summary: 'Collects requirements for a feature through dialog.',
    filePath: 'skills/built-in/specify-feature.md',
    category: 'builtin',
    ...overrides,
  };
}

describe('transformSkill (Claude)', () => {
  it('generates correct output path under .claude/skills', () => {
    const result = transformSkill(makeSkill(), claudeManifest);
    expect(result.relativePath).toBe('.claude/skills/specify-feature/SKILL.md');
  });

  it('includes Claude frontmatter with name and description', () => {
    const result = transformSkill(makeSkill(), claudeManifest);
    expect(result.content).toContain('name: specify-feature');
    expect(result.content).toContain('description:');
    expect(result.content).toContain('Roles: po, analyst');
    expect(result.content).toContain('Trigger: auto');
  });

  it('adds L1DDER:MANAGED marker with hash', () => {
    const result = transformSkill(makeSkill(), claudeManifest);
    expect(result.content).toMatch(/^<!-- L1DDER:MANAGED hash:[0-9a-f]{12} -->/);
    expect(result.hash).toHaveLength(12);
  });

  it('adds source comment', () => {
    const result = transformSkill(makeSkill(), claudeManifest);
    expect(result.content).toContain(
      '<!-- Source: skills/built-in/specify-feature.md -->',
    );
  });

  it('retains body sections', () => {
    const result = transformSkill(makeSkill(), claudeManifest);
    expect(result.content).toContain('## Summary');
    expect(result.content).toContain('## Steps');
    expect(result.content).toContain('## Validation');
  });

  it('is deterministic', () => {
    const skill = makeSkill();
    const a = transformSkill(skill, claudeManifest);
    const b = transformSkill(skill, claudeManifest);
    expect(a.content).toBe(b.content);
    expect(a.hash).toBe(b.hash);
  });
});
