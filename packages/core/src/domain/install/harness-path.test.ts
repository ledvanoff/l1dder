import { describe, expect, it } from 'vitest';

import type { AdapterManifest } from '../../ports/ide-adapter.js';
import { resolveHarnessPath } from './harness-path.js';

const testManifest: AdapterManifest = {
  id: 'cursor',
  name: 'Cursor IDE',
  version: 1,
  outputs: {
    commands: {
      directory: '.cursor/commands',
      filePattern: 'l1dder-{id}.md',
      frontMatter: [],
    },
    skills: {
      directory: '.cursor/skills-l1dder',
      structure: '{skill-id}/SKILL.md',
    },
    rules: {
      directory: '.cursor/rules',
      file: 'l1dder.mdc',
      frontMatter: [],
    },
    agents_md: {
      directory: '.',
      file: 'AGENTS.md',
    },
    hooks: {
      directory: '.cursor',
      file: 'hooks.json',
    },
  },
  marker: '<!-- L1DDER:MANAGED hash:{hash} -->',
  managedPrefix: 'l1dder-',
};

describe('resolveHarnessPath', () => {
  it('resolves command path with id substitution', () => {
    expect(resolveHarnessPath(testManifest, 'command', 'specify')).toBe(
      '.cursor/commands/l1dder-specify.md',
    );
  });

  it('resolves skill path with skill-id substitution', () => {
    expect(resolveHarnessPath(testManifest, 'skill', 'specify-feature')).toBe(
      '.cursor/skills-l1dder/specify-feature/SKILL.md',
    );
  });

  it('resolves rule and agents_md paths', () => {
    expect(resolveHarnessPath(testManifest, 'rule')).toBe('.cursor/rules/l1dder.mdc');
    expect(resolveHarnessPath(testManifest, 'agents_md')).toBe('AGENTS.md');
  });
});
