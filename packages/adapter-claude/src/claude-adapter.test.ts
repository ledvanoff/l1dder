import { describe, expect, it } from 'vitest';
import type { AdapterContext, ParsedSkill } from '@l1dder/core';
import { ClaudeAdapter } from './claude-adapter.js';
import { claudeManifest } from './claude-manifest.js';
import { InMemoryFileSystem, NullLogger } from '@l1dder/core/testing';

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
    body: '## Summary\n\nTest skill.\n\n## Steps\n\n1. Do it\n',
    summary: 'Test skill.',
    filePath: `skills/built-in/${id}.md`,
    category: 'builtin',
  };
}

describe('ClaudeAdapter content filtering', () => {
  it('excludes cursor-only tagged skills from transform output', async () => {
    const adapter = new ClaudeAdapter({ fs: new InMemoryFileSystem(), logger: new NullLogger() });
    const files = await adapter.transformForInstall({
      projectRoot: '/project',
      config: {
        schema_version: 1,
        role_mode: 'solo',
        language: { docs: 'en', chat: 'en' },
        adapters: ['claude'],
      } as AdapterContext['config'],
      skills: [makeSkill('shared-skill'), makeSkill('cursor-only-skill', ['cursor-only'])],
      commands: [],
      personas: [],
      standards: {},
      force: false,
      dryRun: false,
    });

    const paths = files.map((file) => file.path);
    expect(paths).toContain('.claude/skills/shared-skill/SKILL.md');
    expect(paths).not.toContain('.claude/skills/cursor-only-skill/SKILL.md');
    expect(claudeManifest.excludeTags).toContain('cursor-only');
  });
});
