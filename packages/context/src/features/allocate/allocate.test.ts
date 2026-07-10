import { describe, expect, it } from 'vitest';
import { allocate } from './allocate.js';
import type { ContextEntry, ContextProfile, TokenBudget } from '../../domain/types.js';
import { MockTokenCounter, InMemoryContextFs } from '../../testing.js';

function makeEntry(
  path: string,
  mode: 'full' | 'summary' | 'exclude' = 'full',
  priority = 3,
  category: ContextEntry['category'] = 'knowledge',
  zone: ContextEntry['zone'] = 'static',
): ContextEntry {
  return { category, path, mode, priority, zone };
}

function makeBudget(effective = 100_000): TokenBudget {
  return { total: effective + 30_000, reserved: 30_000, effective };
}

describe('allocate', () => {
  it('comfortable tier — all entries at original mode', async () => {
    const content = 'x'.repeat(300);
    const fs = new InMemoryContextFs({
      'knowledge/idea.md': content,
      'knowledge/roadmap.md': content,
    });
    const counter = new MockTokenCounter(3);
    const profile: ContextProfile = {
      entries: [
        makeEntry('knowledge/idea.md', 'full', 3),
        makeEntry('knowledge/roadmap.md', 'full', 3),
      ],
    };

    const result = await allocate(profile, makeBudget(100_000), counter, fs);

    expect(result.tier).toBe('comfortable');
    for (const e of result.entries) {
      expect(e.allocatedMode).toBe(e.mode);
    }
  });

  it('tight tier — low priority FULL demoted to SUMMARY', async () => {
    const largeContent = 'x'.repeat(240_000);
    const fs = new InMemoryContextFs({
      'a.md': largeContent,
      'b.md': largeContent,
    });
    const counter = new MockTokenCounter(3);
    const profile: ContextProfile = {
      entries: [
        makeEntry('a.md', 'full', 1),
        makeEntry('b.md', 'full', 5),
      ],
    };

    const result = await allocate(profile, makeBudget(200_000), counter, fs);

    expect(result.tier).toBe('tight');
    const entryB = result.entries.find((e) => e.path === 'b.md');
    expect(entryB?.allocatedMode).toBe('summary');
    const entryA = result.entries.find((e) => e.path === 'a.md');
    expect(entryA?.allocatedMode).toBe('full');
  });

  it('critical tier — lowest priority excluded', async () => {
    const content = 'x'.repeat(300_000);
    const fs = new InMemoryContextFs({
      'pri1.md': content,
      'pri4.md': content,
      'pri5.md': content,
    });
    const counter = new MockTokenCounter(3);
    const profile: ContextProfile = {
      entries: [
        makeEntry('pri1.md', 'full', 1),
        makeEntry('pri4.md', 'full', 4),
        makeEntry('pri5.md', 'full', 5),
      ],
    };

    const result = await allocate(profile, makeBudget(200_000), counter, fs);

    expect(result.tier).toBe('critical');
    expect(result.warning).toBeTruthy();
    const pri5 = result.entries.find((e) => e.path === 'pri5.md');
    expect(pri5?.allocatedMode).toBe('exclude');
    const pri4 = result.entries.find((e) => e.path === 'pri4.md');
    expect(pri4?.allocatedMode).toBe('exclude');
  });

  it('priority 1-2 never excluded', async () => {
    const content = 'x'.repeat(270_000);
    const fs = new InMemoryContextFs({
      'p1.md': content,
      'p2.md': content,
    });
    const counter = new MockTokenCounter(3);
    const profile: ContextProfile = {
      entries: [
        makeEntry('p1.md', 'full', 1),
        makeEntry('p2.md', 'full', 2),
      ],
    };

    const result = await allocate(profile, makeBudget(100_000), counter, fs);

    for (const e of result.entries) {
      expect(e.allocatedMode).not.toBe('exclude');
    }
  });

  it('AllocatedEntry preserves original mode alongside allocatedMode', async () => {
    const content = 'x'.repeat(240_000);
    const fs = new InMemoryContextFs({ 'a.md': content, 'b.md': content });
    const counter = new MockTokenCounter(3);
    const profile: ContextProfile = {
      entries: [
        makeEntry('a.md', 'full', 1),
        makeEntry('b.md', 'full', 5),
      ],
    };

    const result = await allocate(profile, makeBudget(200_000), counter, fs);

    const demoted = result.entries.find((e) => e.path === 'b.md');
    expect(demoted?.mode).toBe('full');
    expect(demoted?.allocatedMode).toBe('summary');
  });

  it('empty profile returns comfortable with 0 tokens', async () => {
    const fs = new InMemoryContextFs();
    const counter = new MockTokenCounter(3);
    const profile: ContextProfile = { entries: [] };

    const result = await allocate(profile, makeBudget(100_000), counter, fs);

    expect(result.tier).toBe('comfortable');
    expect(result.totalTokens).toBe(0);
    expect(result.entries).toHaveLength(0);
  });

  it('uses fallback estimate when file not found', async () => {
    const fs = new InMemoryContextFs();
    const counter = new MockTokenCounter(3);
    const profile: ContextProfile = {
      entries: [makeEntry('missing.md', 'full', 3)],
    };

    const result = await allocate(profile, makeBudget(100_000), counter, fs);

    expect(result.tier).toBe('comfortable');
    expect(result.totalTokens).toBeGreaterThan(0);
  });
});
