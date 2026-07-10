import { describe, expect, it } from 'vitest';
import { InMemoryFileSystem, NullLogger } from '@l1dder/core/testing';

import { PersonaLoader } from './persona-loader.js';

function createLoader(files: Record<string, string>) {
  const fs = new InMemoryFileSystem();
  for (const [path, content] of Object.entries(files)) {
    void fs.writeFile(path, content);
  }
  return { loader: new PersonaLoader({ fs, logger: new NullLogger() }), fs };
}

const ANALYST_MD = `# Persona: Analyst

<!-- metadata comment -->

## Summary

Analyst — bridge between PO and Architect.

## System Prompt

You act as Analyst.

## Active Phases

| Phase | What Analyst does |
|---|---|
| SPECIFY | Leads problem analysis |

## Knowledge Ownership

| File | Role |
|---|---|
| usecases.md | Co-owner |

## Focus Areas

- Completeness of scenarios
- Data flows

## Review Heuristics

- [ ] Every scope item has a use case

## Anti-Patterns

- Do not prioritize features

## Handoff to Other Personas

| Trigger | To | Why |
|---|---|---|
| "Business value?" | PO | Value/priority |
`;

const MINIMAL_MD = `# Persona: Minimal

## Summary

A minimal persona.
`;

describe('PersonaLoader', () => {
  it('loads all personas from agents directory', async () => {
    const { loader } = createLoader({
      '/project/agents/analyst.md': ANALYST_MD,
      '/project/agents/developer.md': '# Persona: Developer\n\n## Summary\n\nDeveloper writes code.',
      '/project/agents/po.md': '# Persona: PO\n\n## Summary\n\nPO owns value.',
    });

    const result = await loader.loadAll('/project/agents');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toHaveLength(3);
    expect(result.value.map((p) => p.id).sort()).toEqual(['analyst', 'developer', 'po']);
  });

  it('extracts sections from persona file', async () => {
    const { loader } = createLoader({ '/project/agents/analyst.md': ANALYST_MD });

    const result = await loader.loadOne('/project/agents/analyst.md');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const persona = result.value;
    expect(persona.sections.summary).toContain('bridge between PO and Architect');
    expect(persona.sections.systemPrompt).toContain('You act as Analyst');
    expect(persona.sections.focusAreas).toContain('Completeness of scenarios');
    expect(persona.sections.antiPatterns).toContain('Do not prioritize');
    expect(persona.sections.activePhases).toContain('SPECIFY');
    expect(persona.sections.reviewHeuristics).toContain('Every scope item');
    expect(persona.sections.handoffTriggers).toContain('Business value');
    expect(persona.sections.knowledgeOwnership).toContain('Co-owner');
  });

  it('derives id from filename', async () => {
    const { loader } = createLoader({
      '/project/agents/knowledge-updater.md': '# Persona: Knowledge Updater\n\n## Summary\n\nUpdates knowledge.',
    });

    const result = await loader.loadOne('/project/agents/knowledge-updater.md');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe('knowledge-updater');
  });

  it('derives name from # Persona: prefix', async () => {
    const { loader } = createLoader({ '/project/agents/analyst.md': ANALYST_MD });

    const result = await loader.loadOne('/project/agents/analyst.md');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.name).toBe('Analyst');
  });

  it('returns err for missing directory', async () => {
    const { loader } = createLoader({});

    const result = await loader.loadAll('/project/agents');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('LOAD_ERROR');
  });

  it('returns err for empty file', async () => {
    const { loader } = createLoader({ '/project/agents/empty.md': '  ' });

    const result = await loader.loadOne('/project/agents/empty.md');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.details).toContain('empty');
  });

  it('handles file with missing optional sections', async () => {
    const { loader } = createLoader({ '/project/agents/minimal.md': MINIMAL_MD });

    const result = await loader.loadOne('/project/agents/minimal.md');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const persona = result.value;
    expect(persona.sections.summary).toContain('minimal persona');
    expect(persona.sections.systemPrompt).toBeUndefined();
    expect(persona.sections.focusAreas).toBeUndefined();
    expect(persona.sections.antiPatterns).toBeUndefined();
  });

  it('returns err when file cannot be read', async () => {
    const { loader } = createLoader({});

    const result = await loader.loadOne('/project/agents/nonexistent.md');
    expect(result.ok).toBe(false);
  });

  it('ignores non-md files in directory', async () => {
    const { loader, fs } = createLoader({
      '/project/agents/analyst.md': MINIMAL_MD,
    });
    void fs.writeFile('/project/agents/.gitkeep', '');

    const result = await loader.loadAll('/project/agents');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(1);
  });
});
