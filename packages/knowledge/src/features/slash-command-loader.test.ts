import { describe, expect, it } from 'vitest';
import { InMemoryFileSystem, NullLogger } from '@l1dder/core/testing';

import { SlashCommandLoader } from './slash-command-loader.js';

function makeCommandFile(id: string, phase: string, opts?: {
  trigger_kind?: string;
  role?: string;
  skill?: string | null;
  builtin?: boolean;
}): string {
  const skillLine = opts?.skill ? `"${opts.skill}"` : 'null';
  return `---
id: ${id}
name: "${id.charAt(0).toUpperCase() + id.slice(1)} Command"
format_version: 1
phase: "${phase}"
trigger_kind: "${opts?.trigger_kind ?? 'transition'}"
role: "${opts?.role ?? 'developer'}"
skill: ${skillLine}
builtin: ${String(opts?.builtin ?? true)}
---

## Summary

This is the ${id} command.

## Steps

1. Do step one
2. Do step two

## Acceptance Criteria

- Criteria met
`;
}

function createLoader(files: Record<string, string>) {
  const fs = new InMemoryFileSystem();
  for (const [path, content] of Object.entries(files)) {
    void fs.writeFile(path, content);
  }
  return new SlashCommandLoader({
    fs,
    logger: new NullLogger(),
    projectRoot: '/project',
  });
}

const NINE_COMMANDS: Record<string, string> = {
  '/project/commands/built-in/constitution.md': makeCommandFile('constitution', 'idle', { trigger_kind: 'no_transition', role: 'developer', skill: null, builtin: true }),
  '/project/commands/built-in/specify.md': makeCommandFile('specify', 'specify', { role: 'analyst', skill: 'specify-feature' }),
  '/project/commands/built-in/plan.md': makeCommandFile('plan', 'plan', { role: 'architect', skill: 'plan-implementation' }),
  '/project/commands/built-in/update-tobe.md': makeCommandFile('update-tobe', 'update_tobe', { role: 'knowledge-updater', skill: 'update-knowledge-tobe' }),
  '/project/commands/built-in/tasks.md': makeCommandFile('tasks', 'tasks', { role: 'architect', skill: 'decompose-tasks' }),
  '/project/commands/built-in/implement.md': makeCommandFile('implement', 'implement', { role: 'developer', skill: 'implement-task' }),
  '/project/commands/built-in/update-asis.md': makeCommandFile('update-asis', 'update_asis', { role: 'knowledge-updater', skill: 'update-knowledge-asis' }),
  '/project/commands/built-in/complete.md': makeCommandFile('complete', 'complete', { role: 'po', skill: 'complete-iteration' }),
  '/project/commands/built-in/pause.md': makeCommandFile('pause', '*', { trigger_kind: 'status_change', role: 'developer', skill: 'session-handoff' }),
};

describe('SlashCommandLoader', () => {
  it('loads 9 built-in slash commands', async () => {
    const loader = createLoader(NINE_COMMANDS);

    const result = await loader.loadBuiltIn();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(9);
  });

  it('validates front-matter against schema', async () => {
    const loader = createLoader({
      '/project/commands/built-in/bad.md': `---
id: "INVALID_ID"
name: "Bad"
format_version: 1
phase: "idle"
---

## Summary

Bad command.
`,
    });

    const result = await loader.loadBuiltIn();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('LOAD_ERROR');
  });

  it('custom overrides built-in by id', async () => {
    const customSpecify = makeCommandFile('specify', 'specify', {
      role: 'po',
      skill: 'custom-specify',
    });

    const loader = createLoader({
      ...NINE_COMMANDS,
      '/project/commands/custom/specify.md': customSpecify,
    });

    const result = await loader.loadAll();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const registry = result.value;
    const specify = registry.get('specify');
    expect(specify).toBeDefined();
    expect(specify?.frontMatter.role).toBe('po');
    expect(specify?.frontMatter.skill).toBe('custom-specify');
  });

  it('missing custom dir returns ok (empty customs)', async () => {
    const loader = createLoader(NINE_COMMANDS);

    const result = await loader.loadAll();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.getAll()).toHaveLength(9);
  });

  it('extracts body sections (summary, steps, acceptance)', async () => {
    const specifyContent = NINE_COMMANDS['/project/commands/built-in/specify.md'] ?? '';
    const loader = createLoader({
      '/project/commands/built-in/specify.md': specifyContent,
    });

    const result = await loader.loadBuiltIn();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const command = result.value[0];
    expect(command).toBeDefined();
    if (!command) return;
    expect(command.sections.summary).toContain('specify command');
    expect(command.sections.steps).toContain('step one');
    expect(command.sections.acceptance_criteria).toContain('Criteria met');
  });

  it('missing built-in dir returns ok (empty)', async () => {
    const loader = createLoader({});

    const result = await loader.loadBuiltIn();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(0);
  });

  it('loadAll returns registry with getByPhase support', async () => {
    const loader = createLoader(NINE_COMMANDS);

    const result = await loader.loadAll();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const registry = result.value;
    expect(registry.has('specify')).toBe(true);
    expect(registry.has('nonexistent')).toBe(false);
  });

  it('rejects command file without front-matter', async () => {
    const loader = createLoader({
      '/project/commands/built-in/bad.md': '# No front matter\n\nJust content.',
    });

    const result = await loader.loadBuiltIn();
    expect(result.ok).toBe(false);
  });

  it('returns validation error naming field phase for non-canonical phase', async () => {
    const loader = createLoader({
      '/project/commands/built-in/update-tobe.md': makeCommandFile(
        'update-tobe',
        'to_be_knowledge_update',
        { role: 'knowledge-updater', skill: 'update-knowledge-tobe' },
      ),
    });

    const result = await loader.loadBuiltIn();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('LOAD_ERROR');
    expect(result.error.path).toBe('commands/built-in/update-tobe.md');
    expect(result.error.details).toMatch(/phase/);
  });
});
