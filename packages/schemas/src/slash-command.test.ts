import { describe, expect, it } from 'vitest';

import {
  SlashTriggerKindSchema,
  SlashCommandFrontMatterSchema,
  ParsedSlashCommandSchema,
} from './slash-command.js';

describe('SlashTriggerKindSchema', () => {
  it('accepts all 3 trigger kinds', () => {
    expect(SlashTriggerKindSchema.parse('transition')).toBe('transition');
    expect(SlashTriggerKindSchema.parse('no_transition')).toBe('no_transition');
    expect(SlashTriggerKindSchema.parse('status_change')).toBe('status_change');
  });

  it('rejects invalid trigger kind', () => {
    expect(() => SlashTriggerKindSchema.parse('unknown')).toThrow();
  });
});

describe('SlashCommandFrontMatterSchema', () => {
  const validMinimal = {
    id: 'specify',
    name: 'Specify Feature',
    format_version: 1 as const,
    phase: 'specify',
  };

  const validFull = {
    ...validMinimal,
    trigger_kind: 'transition' as const,
    role: 'analyst',
    skill: 'specify-feature',
    artifact_template: 'templates/specs/spec-template.md',
    artifact_path: 'specs/{{FEATURE_NAME}}/spec.md',
    context_profile: 'specify-deep',
    accepts_argument: true,
    idempotent: false,
    requires_owner_approve: false,
    tags: ['discovery', 'specify'],
    builtin: true,
    override_strategy: 'replace' as const,
  };

  it('validates complete specify slash command front-matter', () => {
    const result = SlashCommandFrontMatterSchema.parse(validFull);
    expect(result.id).toBe('specify');
    expect(result.trigger_kind).toBe('transition');
    expect(result.role).toBe('analyst');
    expect(result.skill).toBe('specify-feature');
    expect(result.builtin).toBe(true);
    expect(result.tags).toEqual(['discovery', 'specify']);
  });

  it('applies defaults for optional fields', () => {
    const result = SlashCommandFrontMatterSchema.parse(validMinimal);
    expect(result.trigger_kind).toBe('transition');
    expect(result.role).toBe('developer');
    expect(result.skill).toBeNull();
    expect(result.artifact_template).toBeNull();
    expect(result.artifact_path).toBeNull();
    expect(result.context_profile).toBeNull();
    expect(result.accepts_argument).toBe(false);
    expect(result.idempotent).toBe(true);
    expect(result.requires_owner_approve).toBe(false);
    expect(result.tags).toEqual([]);
    expect(result.builtin).toBe(false);
    expect(result.override_strategy).toBeUndefined();
  });

  it('rejects invalid id format', () => {
    expect(() =>
      SlashCommandFrontMatterSchema.parse({ ...validMinimal, id: 'Invalid_Id' }),
    ).toThrow();
  });

  it('rejects id starting with number', () => {
    expect(() =>
      SlashCommandFrontMatterSchema.parse({ ...validMinimal, id: '1-bad' }),
    ).toThrow();
  });

  it('rejects id with uppercase', () => {
    expect(() =>
      SlashCommandFrontMatterSchema.parse({ ...validMinimal, id: 'Bad-Name' }),
    ).toThrow();
  });

  it('rejects format_version other than 1', () => {
    expect(() =>
      SlashCommandFrontMatterSchema.parse({ ...validMinimal, format_version: 2 }),
    ).toThrow();
  });

  it('rejects empty name', () => {
    expect(() =>
      SlashCommandFrontMatterSchema.parse({ ...validMinimal, name: '' }),
    ).toThrow();
  });

  it('rejects missing id', () => {
    const { id: _, ...noId } = validMinimal;
    expect(() => SlashCommandFrontMatterSchema.parse(noId)).toThrow();
  });

  it('rejects missing name', () => {
    const { name: _, ...noName } = validMinimal;
    expect(() => SlashCommandFrontMatterSchema.parse(noName)).toThrow();
  });
});

describe('ParsedSlashCommandSchema', () => {
  it('validates full parsed command', () => {
    const parsed = ParsedSlashCommandSchema.parse({
      frontMatter: {
        id: 'specify',
        name: 'Specify Feature',
        format_version: 1,
        phase: 'specify',
        trigger_kind: 'transition',
        role: 'analyst',
        skill: 'specify-feature',
        builtin: true,
      },
      sections: {
        summary: 'Launches SPECIFY phase.',
        steps: '1. Read existing specs\n2. Generate spec',
        acceptance_criteria: 'Spec file created',
      },
      body: '## Summary\n\nLaunches SPECIFY phase.',
      filePath: 'commands/built-in/specify.md',
    });
    expect(parsed.filePath).toBe('commands/built-in/specify.md');
    expect(parsed.sections.summary).toBe('Launches SPECIFY phase.');
    expect(parsed.sections.steps).toBeDefined();
  });

  it('accepts parsed command with empty sections', () => {
    const parsed = ParsedSlashCommandSchema.parse({
      frontMatter: {
        id: 'test',
        name: 'Test',
        format_version: 1,
        phase: 'idle',
      },
      sections: {},
      body: '',
      filePath: 'commands/built-in/test.md',
    });
    expect(parsed.sections.summary).toBeUndefined();
  });

  it('rejects invalid front-matter in parsed command', () => {
    expect(() =>
      ParsedSlashCommandSchema.parse({
        frontMatter: { id: 'INVALID' },
        sections: {},
        body: '',
        filePath: 'x.md',
      }),
    ).toThrow();
  });
});
