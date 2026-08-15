import { describe, it, expect } from 'vitest';
import type { ParsedSlashCommand } from '@l1dder/core';
import { transformCommand } from './command-transformer.js';
import { cursorManifest } from '../../cursor-manifest.js';

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

describe('transformCommand', () => {
  const composedBody = '# Specify Feature\n\n## Persona: Analyst\n...\n';

  it('generates correct output path', () => {
    const result = transformCommand(makeCommand(), composedBody, cursorManifest);
    expect(result.relativePath).toBe('.cursor/commands/l1dder-specify.md');
  });

  it('generates Cursor front-matter with description and when_to_use', () => {
    const result = transformCommand(makeCommand(), composedBody, cursorManifest);
    expect(result.content).toContain('---');
    expect(result.content).toContain('description:');
    expect(result.content).toContain('when_to_use:');
  });

  it('escapes quotes in prose so the front-matter stays parseable', () => {
    const command = makeCommand({
      sections: {
        summary: 'Primary entrypoint',
        when_to_use: 'When you ask "what should I do next?" mid-session.',
      },
    });

    const result = transformCommand(command, composedBody, cursorManifest);
    const whenToUse = result.content
      .split('\n')
      .find((line) => line.startsWith('when_to_use:'));

    expect(whenToUse).toContain('\\"what should I do next?\\"');
  });

  it('omits the phase hint for a wildcard command that runs anywhere', () => {
    const command = makeCommand({
      frontMatter: { ...makeCommand().frontMatter, phase: '*' },
    });

    const result = transformCommand(command, composedBody, cursorManifest);
    const description = result.content
      .split('\n')
      .find((line) => line.startsWith('description:'));

    expect(description).not.toContain('Phase: *');
    expect(description).not.toContain('..');
  });

  it('description includes phase and argument info', () => {
    const result = transformCommand(makeCommand(), composedBody, cursorManifest);
    expect(result.content).toContain('specify');
    expect(result.content).toContain('Accepts argument');
  });

  it('description mentions owner approval when required', () => {
    const cmd = makeCommand({
      frontMatter: {
        ...makeCommand().frontMatter,
        requires_owner_approve: true,
        accepts_argument: false,
      },
    });
    const result = transformCommand(cmd, composedBody, cursorManifest);
    expect(result.content).toContain('Requires owner approval');
  });

  it('adds L1DDER:MANAGED marker', () => {
    const result = transformCommand(makeCommand(), composedBody, cursorManifest);
    expect(result.content).toContain('<!-- L1DDER:MANAGED hash:');
    expect(result.hash).toHaveLength(12);
  });

  it('adds source comment', () => {
    const result = transformCommand(makeCommand(), composedBody, cursorManifest);
    expect(result.content).toContain(
      '<!-- Source: commands/built-in/specify.md -->',
    );
  });

  it('includes composed body', () => {
    const result = transformCommand(makeCommand(), composedBody, cursorManifest);
    expect(result.content).toContain('## Persona: Analyst');
  });

  it('is deterministic', () => {
    const cmd = makeCommand();
    const a = transformCommand(cmd, composedBody, cursorManifest);
    const b = transformCommand(cmd, composedBody, cursorManifest);
    expect(a.content).toBe(b.content);
    expect(a.hash).toBe(b.hash);
  });
});
