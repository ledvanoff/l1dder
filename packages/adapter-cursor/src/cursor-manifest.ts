import type { AdapterManifest } from '@l1dder/core';

/**
 * Cursor IDE adapter manifest (AD2).
 *
 * Typed configuration defining output paths, file patterns,
 * marker format, and managed-file prefix for Cursor IDE.
 */
export const cursorManifest: AdapterManifest = {
  id: 'cursor',
  name: 'Cursor IDE',
  version: 1,

  outputs: {
    commands: {
      directory: '.cursor/commands',
      filePattern: 'l1dder-{id}.md',
      frontMatter: ['description', 'when_to_use'],
    },
    skills: {
      directory: '.cursor/skills-l1dder',
      structure: '{skill-id}/SKILL.md',
    },
    rules: {
      directory: '.cursor/rules',
      file: 'l1dder.mdc',
      frontMatter: ['alwaysApply'],
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
