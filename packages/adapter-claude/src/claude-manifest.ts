import type { AdapterManifest } from '@l1dder/core';

/**
 * Claude Code adapter manifest.
 *
 * Skills and slash commands both map to `.claude/skills/<id>/SKILL.md`.
 * Commands use the `l1dder-` prefix to avoid collisions (DEC-XH-5).
 * Project memory rule is written to `CLAUDE.md` at the repo root.
 */
export const claudeManifest: AdapterManifest = {
  id: 'claude',
  name: 'Claude Code',
  version: 1,

  outputs: {
    commands: {
      directory: '.claude/skills',
      filePattern: 'l1dder-{id}/SKILL.md',
      frontMatter: ['name', 'description', 'user-invocable'],
    },
    skills: {
      directory: '.claude/skills',
      structure: '{skill-id}/SKILL.md',
    },
    rules: {
      directory: '.',
      file: 'CLAUDE.md',
      frontMatter: [],
    },
  },

  marker: '<!-- L1DDER:MANAGED hash:{hash} -->',
  managedPrefix: 'l1dder-',
  excludeTags: ['cursor-only'],
};
