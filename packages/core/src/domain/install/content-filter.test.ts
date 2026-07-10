import { describe, expect, it } from 'vitest';
import type { AdapterManifest } from '../../ports/ide-adapter.js';
import type { ParsedSkill } from '../skill-types.js';
import type { ParsedSlashCommand } from '../slash-command.js';
import {
  filterCommandsForAdapter,
  filterSkillsForAdapter,
  shouldIncludeForAdapter,
} from './content-filter.js';

const manifest: AdapterManifest = {
  id: 'claude',
  name: 'Claude',
  version: 1,
  outputs: {},
  marker: '<!-- L1DDER:MANAGED hash:{hash} -->',
  managedPrefix: 'l1dder-',
  contentExclusions: { skillIds: ['cursor-only-skill'] },
  excludeTags: ['cursor-only'],
};

function makeSkill(id: string, tags: string[] = []): ParsedSkill {
  return {
    frontMatter: {
      id,
      name: id,
      format_version: 1,
      phase: 'specify',
      roles: [],
      trigger: 'manual',
      priority: 1,
      context_profile: null,
      tags,
      builtin: true,
    },
    body: '## Summary\n\nTest.\n',
    summary: 'Test.',
    filePath: `skills/built-in/${id}.md`,
    category: 'builtin',
  };
}

function makeCommand(id: string, tags: string[] = []): ParsedSlashCommand {
  return {
    frontMatter: {
      id,
      name: id,
      format_version: 1,
      phase: 'specify',
      trigger_kind: 'no_transition',
      role: 'analyst',
      skill: null,
      artifact_template: null,
      artifact_path: null,
      context_profile: null,
      accepts_argument: false,
      idempotent: true,
      requires_owner_approve: false,
      tags,
      builtin: true,
    },
    sections: { summary: 'Test command.' },
    body: '',
    filePath: `commands/built-in/${id}.md`,
  };
}

describe('content-filter', () => {
  it('excludes skill id declared in manifest', () => {
    expect(shouldIncludeForAdapter(manifest, 'skill', 'cursor-only-skill', [])).toBe(false);
    expect(shouldIncludeForAdapter(manifest, 'skill', 'shared-skill', [])).toBe(true);
  });

  it('excludes items with excluded tags', () => {
    expect(shouldIncludeForAdapter(manifest, 'command', 'pause', ['cursor-only'])).toBe(
      false,
    );
    expect(shouldIncludeForAdapter(manifest, 'command', 'specify', ['discovery'])).toBe(
      true,
    );
  });

  it('filters skills and commands for adapter', () => {
    const skills = [
      makeSkill('shared-skill'),
      makeSkill('cursor-only-skill'),
      makeSkill('tagged-skill', ['cursor-only']),
    ];
    const commands = [makeCommand('specify'), makeCommand('pause', ['cursor-only'])];

    expect(filterSkillsForAdapter(manifest, skills).map((s) => s.frontMatter.id)).toEqual([
      'shared-skill',
    ]);
    expect(filterCommandsForAdapter(manifest, commands).map((c) => c.frontMatter.id)).toEqual([
      'specify',
    ]);
  });
});
