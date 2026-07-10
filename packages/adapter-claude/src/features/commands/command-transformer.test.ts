import { describe, it, expect } from 'vitest';
import type { ParsedSlashCommand } from '@l1dder/core';
import { transformCommand } from './command-transformer.js';
import { claudeManifest } from '../../claude-manifest.js';

function makeCommand(overrides: Partial<ParsedSlashCommand> = {}): ParsedSlashCommand {
  return {
    frontMatter: {
      id: 'specify',
      name: 'Specify Feature',
      format_version: 1,
      phase: 'specify',
      trigger_kind: 'transition',
      role: 'analyst',
      skill: 'specify-feature',
      artifact_template: null,
      artifact_path: null,
      context_profile: null,
      accepts_argument: true,
      idempotent: true,
      requires_owner_approve: false,
      tags: [],
      builtin: true,
    },
    sections: {
      summary: 'Launches the SPECIFY phase. Collects requirements through dialog.',
      when_to_use: 'Current phase is IDLE and user wants to start a new iteration.',
    },
    body: '',
    filePath: 'commands/built-in/specify.md',
    ...overrides,
  };
}

describe('transformCommand (Claude)', () => {
  const composedBody = '## Persona: Analyst\n\n## Command Instructions\n\nDo specify.\n';

  it('generates path under .claude/skills/l1dder-<id>/SKILL.md', () => {
    const result = transformCommand(makeCommand(), composedBody, claudeManifest);
    expect(result.relativePath).toBe('.claude/skills/l1dder-specify/SKILL.md');
  });

  it('includes Claude skill frontmatter for user-invokable commands', () => {
    const result = transformCommand(makeCommand(), composedBody, claudeManifest);
    expect(result.content).toContain('name: l1dder-specify');
    expect(result.content).toContain('description:');
    expect(result.content).toContain('user-invocable: true');
    expect(result.content).toContain('disable-model-invocation: false');
  });

  it('description includes phase and argument info', () => {
    const result = transformCommand(makeCommand(), composedBody, claudeManifest);
    expect(result.content).toContain('specify');
    expect(result.content).toContain('Accepts argument');
  });

  it('adds L1DDER:MANAGED marker', () => {
    const result = transformCommand(makeCommand(), composedBody, claudeManifest);
    expect(result.content).toContain('<!-- L1DDER:MANAGED hash:');
    expect(result.hash).toHaveLength(12);
  });

  it('includes composed body', () => {
    const result = transformCommand(makeCommand(), composedBody, claudeManifest);
    expect(result.content).toContain('## Persona: Analyst');
  });

  it('is deterministic', () => {
    const cmd = makeCommand();
    const a = transformCommand(cmd, composedBody, claudeManifest);
    const b = transformCommand(cmd, composedBody, claudeManifest);
    expect(a.content).toBe(b.content);
    expect(a.hash).toBe(b.hash);
  });
});
