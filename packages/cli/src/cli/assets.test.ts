import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import { InMemoryFileSystem } from '@l1dder/core/testing';

import { copyAssets, resolveAssetsRoot } from './assets.js';

/**
 * Seed an in-memory assets tree mirroring the bundled layout so copyAssets can
 * be exercised without touching the real dist/assets directory.
 */
function seedAssets(fs: InMemoryFileSystem): string {
  const root = resolveAssetsRoot();

  // language-neutral
  void fs.writeFile(join(root, 'agents', 'architect.md'), '# architect (en)');
  void fs.writeFile(join(root, 'skills', 'built-in', 'specify-feature.md'), '# skill');
  void fs.writeFile(join(root, 'commands', 'built-in', 'specify.md'), '# command');

  // optional engineering profile (skills/starter — not part of default init)
  void fs.writeFile(join(root, 'skills', 'starter', 'tdd-workflow.md'), '# tdd');
  void fs.writeFile(join(root, 'skills', 'starter', 'security-review.md'), '# sec');

  // localized en
  void fs.writeFile(join(root, 'i18n', 'en', 'templates', 'knowledge', 'idea-template.md'), '# Idea (en)');
  void fs.writeFile(join(root, 'i18n', 'en', 'templates', 'specs', 'spec-template.md'), '# Spec (en)');
  void fs.writeFile(join(root, 'i18n', 'en', 'standards', '.base', 'workflow.base.yml'), 'ai_chat: en');

  // localized ru
  void fs.writeFile(join(root, 'i18n', 'ru', 'templates', 'knowledge', 'idea-template.md'), '# Идея (ru)');
  void fs.writeFile(join(root, 'i18n', 'ru', 'templates', 'specs', 'spec-template.md'), '# Спека (ru)');
  void fs.writeFile(join(root, 'i18n', 'ru', 'standards', '.base', 'workflow.base.yml'), 'ai_chat: ru');

  return root;
}

describe('copyAssets', () => {
  it('copies en localized assets by default and keeps project layout', async () => {
    const fs = new InMemoryFileSystem();
    seedAssets(fs);

    const copied = await copyAssets('/proj', fs);

    expect(copied).toContain(join('templates/knowledge', 'idea-template.md'));
    expect(copied).toContain(join('agents', 'architect.md'));
    expect(await fs.readFile('/proj/templates/knowledge/idea-template.md')).toBe('# Idea (en)');
    expect(await fs.readFile('/proj/standards/.base/workflow.base.yml')).toBe('ai_chat: en');
  });

  it('sources localized assets from i18n/ru when docsLang=ru', async () => {
    const fs = new InMemoryFileSystem();
    seedAssets(fs);

    await copyAssets('/proj', fs, 'ru');

    expect(await fs.readFile('/proj/templates/knowledge/idea-template.md')).toBe('# Идея (ru)');
    expect(await fs.readFile('/proj/standards/.base/workflow.base.yml')).toBe('ai_chat: ru');
  });

  it('copies identical language-neutral assets regardless of docsLang', async () => {
    const fsEn = new InMemoryFileSystem();
    const fsRu = new InMemoryFileSystem();
    seedAssets(fsEn);
    seedAssets(fsRu);

    await copyAssets('/proj', fsEn, 'en');
    await copyAssets('/proj', fsRu, 'ru');

    expect(await fsEn.readFile('/proj/agents/architect.md')).toBe('# architect (en)');
    expect(await fsRu.readFile('/proj/agents/architect.md')).toBe('# architect (en)');
  });

  it('does not deliver starter skills without a profile', async () => {
    const fs = new InMemoryFileSystem();
    seedAssets(fs);

    const copied = await copyAssets('/proj', fs, 'en');

    expect(copied).not.toContain(join('skills/built-in', 'tdd-workflow.md'));
    expect(await fs.exists('/proj/skills/built-in/tdd-workflow.md')).toBe(false);
  });

  it('delivers starter skills into skills/built-in with --profile engineering', async () => {
    const fs = new InMemoryFileSystem();
    seedAssets(fs);

    const copied = await copyAssets('/proj', fs, 'en', 'engineering');

    expect(copied).toContain(join('skills/built-in', 'tdd-workflow.md'));
    expect(copied).toContain(join('skills/built-in', 'security-review.md'));
    expect(await fs.readFile('/proj/skills/built-in/tdd-workflow.md')).toBe('# tdd');
  });

  it('ignores an unknown profile (no extra files copied)', async () => {
    const fs = new InMemoryFileSystem();
    seedAssets(fs);

    const copied = await copyAssets('/proj', fs, 'en', 'nonexistent');

    expect(copied).not.toContain(join('skills/built-in', 'tdd-workflow.md'));
  });
});
