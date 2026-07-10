import { describe, it, expect } from 'vitest';
import { matchesHook, matchGlob } from './matcher.js';

describe('matchesHook', () => {
  it('matches when matcher is undefined (catch-all)', () => {
    expect(matchesHook(undefined, {})).toBe(true);
  });

  it('matches when matcher is empty object (catch-all)', () => {
    expect(matchesHook({}, {})).toBe(true);
  });

  it('matches commandPattern as case-insensitive substring', () => {
    expect(
      matchesHook(
        { commandPattern: 'git commit' },
        { command: 'git commit -m "feat: add hooks"' },
      ),
    ).toBe(true);
  });

  it('does not match commandPattern when command is absent', () => {
    expect(matchesHook({ commandPattern: 'git commit' }, {})).toBe(false);
  });

  it('matches pathGlob knowledge/**', () => {
    expect(
      matchesHook(
        { pathGlobs: ['knowledge/**'] },
        { filePath: 'knowledge/roadmap.md' },
      ),
    ).toBe(true);
  });

  it('does not match pathGlob for unrelated path', () => {
    expect(
      matchesHook(
        { pathGlobs: ['knowledge/**'] },
        { filePath: 'packages/core/src/index.ts' },
      ),
    ).toBe(false);
  });

  it('matches any of multiple pathGlobs', () => {
    expect(
      matchesHook(
        { pathGlobs: ['**/*.ts', '**/*.md'] },
        { filePath: 'packages/core/src/index.ts' },
      ),
    ).toBe(true);
    expect(
      matchesHook(
        { pathGlobs: ['**/*.ts', '**/*.md'] },
        { filePath: 'docs/README.md' },
      ),
    ).toBe(true);
    expect(
      matchesHook(
        { pathGlobs: ['**/*.ts', '**/*.md'] },
        { filePath: 'package.json' },
      ),
    ).toBe(false);
  });
});

describe('matchGlob', () => {
  it('matches knowledge/** for knowledge/roadmap.md', () => {
    expect(matchGlob('knowledge/**', 'knowledge/roadmap.md')).toBe(true);
  });

  it('matches knowledge/** for nested path', () => {
    expect(matchGlob('knowledge/**', 'knowledge/to-be/architecture.md')).toBe(true);
  });

  it('does not match knowledge/** for src/index.ts', () => {
    expect(matchGlob('knowledge/**', 'src/index.ts')).toBe(false);
  });

  it('matches **/*.ts for deep TS file', () => {
    expect(matchGlob('**/*.ts', 'packages/core/src/index.ts')).toBe(true);
  });

  it('matches **/*.ts for root-level file', () => {
    expect(matchGlob('**/*.ts', 'tsconfig.ts')).toBe(true);
  });

  it('does not match **/*.ts for .js file', () => {
    expect(matchGlob('**/*.ts', 'packages/core/src/index.js')).toBe(false);
  });
});
