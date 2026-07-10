import { describe, expect, it } from 'vitest';
import { InMemoryFileSystem } from '@l1dder/core/testing';
import type { FileSystemPort } from '@l1dder/core';

import { SkillLoader } from './skill-loader.js';

const BUILTIN_SKILL = `---
id: specify-feature
name: Specify Feature
format_version: 1
phase: specify
trigger: auto
priority: 1
builtin: true
---
## Summary

Specifies a feature.

## Steps

1. Read context.
`;

const CUSTOM_SKILL = `---
id: my-custom
name: My Custom Skill
format_version: 1
phase: implement
trigger: manual
---
## Summary

A custom skill.
`;

const CUSTOM_OVERRIDE = `---
id: specify-feature
name: Specify Feature Custom
format_version: 1
phase: specify
trigger: auto
override_strategy: replace
---
## Summary

Custom specify body.
`;

function createLoader(files: Record<string, string>): SkillLoader {
  const fs = new InMemoryFileSystem();
  const root = '/project';

  for (const [path, content] of Object.entries(files)) {
    void fs.writeFile(`${root}/${path}`, content);
  }

  return new SkillLoader({ fs, projectRoot: root });
}

describe('SkillLoader', () => {
  it('loads built-in skills', async () => {
    const loader = createLoader({
      'skills/built-in/specify-feature.md': BUILTIN_SKILL,
    });

    const result = await loader.loadBuiltIn();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toHaveLength(1);
    const first = result.value[0];
    expect(first).toBeDefined();
    if (!first) return;
    expect(first.frontMatter.id).toBe('specify-feature');
    expect(first.category).toBe('builtin');
  });

  it('loads custom skills', async () => {
    const loader = createLoader({
      'skills/custom/my-custom.md': CUSTOM_SKILL,
    });

    const result = await loader.loadCustom();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toHaveLength(1);
    const first = result.value[0];
    expect(first).toBeDefined();
    if (!first) return;
    expect(first.frontMatter.id).toBe('my-custom');
    expect(first.category).toBe('custom');
  });

  it('loadAll loads built-in and custom into registry', async () => {
    const loader = createLoader({
      'skills/built-in/specify-feature.md': BUILTIN_SKILL,
      'skills/custom/my-custom.md': CUSTOM_SKILL,
    });

    const result = await loader.loadAll();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const registry = result.value;
    expect(registry.all()).toHaveLength(2);
    expect(registry.has('specify-feature')).toBe(true);
    expect(registry.has('my-custom')).toBe(true);
  });

  it('loadAll merges custom override with built-in', async () => {
    const loader = createLoader({
      'skills/built-in/specify-feature.md': BUILTIN_SKILL,
      'skills/custom/specify-feature.md': CUSTOM_OVERRIDE,
    });

    const result = await loader.loadAll();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const registry = result.value;
    expect(registry.all()).toHaveLength(1);
    const skill = registry.findById('specify-feature');
    expect(skill).toBeDefined();
    if (!skill) return;
    expect(skill.body).toContain('Custom specify body.');
  });

  it('returns empty registry when skills/ dirs missing', async () => {
    const loader = createLoader({});

    const result = await loader.loadAll();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.all()).toHaveLength(0);
  });

  it('surfaces an error when readDir fails on an existing directory', async () => {
    const fs = {
      exists: () => Promise.resolve(true),
      readDir: () => Promise.reject(new Error('EACCES: permission denied')),
    } as unknown as FileSystemPort;
    const loader = new SkillLoader({ fs, projectRoot: '/project' });

    const result = await loader.loadBuiltIn();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('LOAD_ERROR');
    expect(result.error.message).toContain('Failed to read skill directory');
  });

  it('findByPhase uses PHASE_SKILL_MAP', async () => {
    const loader = createLoader({
      'skills/built-in/specify-feature.md': BUILTIN_SKILL,
    });

    const result = await loader.loadAll();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const registry = result.value;
    const found = registry.findByPhase('specify');
    expect(found).toHaveLength(1);
    const first = found[0];
    expect(first).toBeDefined();
    if (!first) return;
    expect(first.frontMatter.id).toBe('specify-feature');
  });
});
