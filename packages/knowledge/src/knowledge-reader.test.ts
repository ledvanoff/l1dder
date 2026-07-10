import { describe, expect, it } from 'vitest';
import { InMemoryFileSystem } from '@l1dder/core/testing';

import { KnowledgeReader } from './knowledge-reader.js';

function createReader(files: Record<string, string> = {}): KnowledgeReader {
  const fs = new InMemoryFileSystem();
  const root = '/project';

  for (const [path, content] of Object.entries(files)) {
    void fs.writeFile(`${root}/${path}`, content);
  }

  return new KnowledgeReader({ fs, projectRoot: root });
}

describe('KnowledgeReader', () => {
  it('reads file content from project root', async () => {
    const reader = createReader({ 'knowledge/idea.md': '# Idea\n\nContent.' });
    const result = await reader.read('knowledge/idea.md');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('# Idea\n\nContent.');
    }
  });

  it('returns ReadError for missing file', async () => {
    const reader = createReader({});
    const result = await reader.read('knowledge/missing.md');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('READ_ERROR');
      expect(result.error.path).toBe('knowledge/missing.md');
    }
  });

  it('readMany returns Map of all contents', async () => {
    const reader = createReader({
      'a.md': 'AAA',
      'b.md': 'BBB',
      'c.md': 'CCC',
    });
    const result = await reader.readMany(['a.md', 'b.md', 'c.md']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.size).toBe(3);
      expect(result.value.get('a.md')).toBe('AAA');
    }
  });

  it('readMany stops on first error', async () => {
    const reader = createReader({ 'a.md': 'AAA' });
    const result = await reader.readMany(['a.md', 'missing.md', 'c.md']);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.path).toBe('missing.md');
    }
  });

  it('exists returns true for existing file', async () => {
    const reader = createReader({ 'knowledge/idea.md': 'content' });
    expect(await reader.exists('knowledge/idea.md')).toBe(true);
  });

  it('exists returns false for missing file', async () => {
    const reader = createReader({});
    expect(await reader.exists('nope.md')).toBe(false);
  });

  it('listKnowledge returns fixed convention list', () => {
    const reader = createReader({});
    const entries = reader.listKnowledge();

    expect(entries.length).toBe(10);
    expect(entries[0]).toEqual({ path: 'knowledge/idea.md', category: 'idea' });
    expect(entries[1]).toEqual({ path: 'knowledge/roadmap.md', category: 'roadmap' });

    const toBe = entries.filter((e) => e.category === 'to-be');
    expect(toBe.length).toBe(4);
    expect(toBe.map((e) => e.path)).toContain('knowledge/to-be/architecture.md');

    const asIs = entries.filter((e) => e.category === 'as-is');
    expect(asIs.length).toBe(4);
  });

  it('extractSummary static method delegates to summary module', () => {
    const md = '## Summary\n\nTest summary.\n\n## Details\n\nMore.';
    expect(KnowledgeReader.extractSummary(md)).toBe('Test summary.');
  });
});
