import { describe, it, expect } from 'vitest';

import {
  HookDefinitionSchema,
  HookConfigSchema,
  HookPayloadSchema,
  HookResultSchema,
  HookEventSchema,
  HookOutcomeSchema,
} from './hook.js';
import { ConfigSchema } from './config.js';

describe('HookEventSchema', () => {
  it('accepts all canonical events', () => {
    const events = ['PreToolUse', 'PostToolUse', 'UserPromptSubmit', 'Stop', 'SessionStart', 'SessionEnd', 'PreCompact'];
    for (const event of events) {
      expect(() => HookEventSchema.parse(event)).not.toThrow();
    }
  });

  it('rejects unknown event', () => {
    expect(() => HookEventSchema.parse('beforeShellExecution')).toThrow();
  });
});

describe('HookOutcomeSchema', () => {
  it('accepts allow, warn, block', () => {
    expect(HookOutcomeSchema.parse('allow')).toBe('allow');
    expect(HookOutcomeSchema.parse('warn')).toBe('warn');
    expect(HookOutcomeSchema.parse('block')).toBe('block');
  });

  it('rejects invalid outcome', () => {
    expect(() => HookOutcomeSchema.parse('deny')).toThrow();
  });
});

describe('HookDefinitionSchema', () => {
  it('parses a valid hook definition', () => {
    const def = {
      id: 'pre-commit-guard',
      name: 'Pre-Commit Guard',
      format_version: 1,
      event: 'PreToolUse',
      description: 'Blocks commits with secrets',
      profiles: ['minimal', 'standard', 'strict'],
      outcome_level: 'block',
      builtin: true,
    };
    const result = HookDefinitionSchema.parse(def);
    expect(result.id).toBe('pre-commit-guard');
    expect(result.format_version).toBe(1);
  });

  it('parses definition with optional matcher', () => {
    const def = {
      id: 'format-after-edit',
      name: 'Format After Edit',
      format_version: 1,
      event: 'PostToolUse',
      description: 'Runs prettier/tsc after file edits',
      matcher: { pathGlobs: ['**/*.ts', '**/*.md'] },
      profiles: ['standard', 'strict'],
      outcome_level: 'warn',
      builtin: true,
    };
    const result = HookDefinitionSchema.parse(def);
    expect(result.matcher?.pathGlobs).toEqual(['**/*.ts', '**/*.md']);
  });

  it('rejects definition with invalid event', () => {
    const def = {
      id: 'x',
      name: 'X',
      format_version: 1,
      event: 'afterFileEdit',
      description: 'bad',
      profiles: ['standard'],
      outcome_level: 'warn',
      builtin: true,
    };
    expect(() => HookDefinitionSchema.parse(def)).toThrow();
  });
});

describe('HookConfigSchema', () => {
  it('applies defaults when no fields provided', () => {
    const result = HookConfigSchema.parse({});
    expect(result.enabled).toBe(true);
    expect(result.profile).toBe('standard');
    expect(result.disabled).toEqual([]);
    expect(result.session_start_max_chars).toBe(8000);
  });

  it('accepts explicit values', () => {
    const result = HookConfigSchema.parse({
      enabled: false,
      profile: 'strict',
      disabled: ['format-after-edit'],
      session_start_max_chars: 4000,
    });
    expect(result.enabled).toBe(false);
    expect(result.profile).toBe('strict');
    expect(result.disabled).toEqual(['format-after-edit']);
    expect(result.session_start_max_chars).toBe(4000);
  });

  it('rejects invalid profile', () => {
    expect(() => HookConfigSchema.parse({ profile: 'ultra' })).toThrow();
  });
});

describe('HookPayloadSchema', () => {
  it('parses minimal payload (event only)', () => {
    const result = HookPayloadSchema.parse({ event: 'PreCompact' });
    expect(result.event).toBe('PreCompact');
    expect(result.command).toBeUndefined();
  });

  it('parses full payload', () => {
    const result = HookPayloadSchema.parse({
      event: 'PreToolUse',
      command: 'git commit -m "feat: x"',
      conversationId: 'abc-123',
      workspaceRoots: ['/workspace'],
    });
    expect(result.command).toBe('git commit -m "feat: x"');
    expect(result.conversationId).toBe('abc-123');
  });
});

describe('HookResultSchema', () => {
  it('parses valid result', () => {
    const result = HookResultSchema.parse({ outcome: 'block', messages: ['secret detected'] });
    expect(result.outcome).toBe('block');
    expect(result.messages).toHaveLength(1);
  });
});

describe('ConfigSchema — hooks section', () => {
  it('includes hooks with defaults when no hooks section', () => {
    const result = ConfigSchema.parse({});
    expect(result.hooks).toBeDefined();
    expect(result.hooks.enabled).toBe(true);
    expect(result.hooks.profile).toBe('standard');
  });

  it('merges hooks config when provided', () => {
    const result = ConfigSchema.parse({ hooks: { profile: 'strict' } });
    expect(result.hooks.profile).toBe('strict');
    expect(result.hooks.enabled).toBe(true);
  });
});
