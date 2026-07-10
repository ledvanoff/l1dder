import { describe, expect, it } from 'vitest';
import { renderContext } from './renderer.js';
import type { AllocatedProfile, AllocatedEntry } from '../../domain/types.js';
import { FixedContextClock, IMPLEMENT_DELIVERY } from '../../testing.js';

const BOUNDARY = '═══════════ CONTEXT_DYNAMIC_BOUNDARY ═══════════';

function makeAllocatedEntry(
  overrides: Partial<AllocatedEntry> & { path: string },
): AllocatedEntry {
  return {
    category: 'knowledge',
    mode: 'full',
    allocatedMode: 'full',
    priority: 3,
    zone: 'static',
    estimatedTokens: 100,
    ...overrides,
  };
}

describe('renderContext', () => {
  const clock = new FixedContextClock('2026-05-11T12:00:00.000Z');
  const meta = { position: IMPLEMENT_DELIVERY, role: 'developer', clock };

  it('renders static zone before dynamic zone', () => {
    const profile: AllocatedProfile = {
      entries: [
        makeAllocatedEntry({ path: 'standards/conventions.md', category: 'standards', zone: 'static' }),
        makeAllocatedEntry({ path: 'specs/current/spec.md', category: 'specs', zone: 'dynamic' }),
      ],
      tier: 'comfortable',
      totalTokens: 200,
    };
    const contents = new Map([
      ['standards/conventions.md', '# Conventions\nRules here'],
      ['specs/current/spec.md', '# Spec\nDetails here'],
    ]);

    const result = renderContext(profile, contents, meta);

    const boundaryIdx = result.content.indexOf(BOUNDARY);
    const stdIdx = result.content.indexOf('# Conventions');
    const specIdx = result.content.indexOf('# Spec');
    expect(boundaryIdx).toBeGreaterThan(-1);
    expect(stdIdx).toBeLessThan(boundaryIdx);
    expect(specIdx).toBeGreaterThan(boundaryIdx);
  });

  it('computes SHA-256 hash of static zone', () => {
    const profile: AllocatedProfile = {
      entries: [
        makeAllocatedEntry({ path: 'a.md', zone: 'static' }),
      ],
      tier: 'comfortable',
      totalTokens: 100,
    };
    const contents = new Map([['a.md', 'fixed content']]);

    const r1 = renderContext(profile, contents, meta);
    const r2 = renderContext(profile, contents, meta);

    expect(r1.staticHash).toBe(r2.staticHash);
    expect(r1.staticHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('summary mode uses extractSummary', () => {
    const profile: AllocatedProfile = {
      entries: [
        makeAllocatedEntry({ path: 'doc.md', allocatedMode: 'summary' }),
      ],
      tier: 'comfortable',
      totalTokens: 50,
    };
    const contents = new Map([
      ['doc.md', '# Doc\n\n## Summary\n\nShort summary here.\n\n## Details\n\nLong details.'],
    ]);

    const result = renderContext(profile, contents, meta);

    expect(result.content).toContain('Short summary here.');
    expect(result.content).not.toContain('Long details.');
  });

  it('missing file renders comment placeholder', () => {
    const profile: AllocatedProfile = {
      entries: [
        makeAllocatedEntry({ path: 'missing/file.md' }),
      ],
      tier: 'comfortable',
      totalTokens: 100,
    };
    const contents = new Map<string, string>();

    const result = renderContext(profile, contents, meta);

    expect(result.content).toContain('<!-- File not found: missing/file.md -->');
  });

  it('dynamicOffset equals static zone + boundary length', () => {
    const profile: AllocatedProfile = {
      entries: [
        makeAllocatedEntry({ path: 'static.md', zone: 'static' }),
        makeAllocatedEntry({ path: 'dynamic.md', zone: 'dynamic', category: 'state' }),
      ],
      tier: 'comfortable',
      totalTokens: 200,
    };
    const contents = new Map([
      ['static.md', 'Static content'],
      ['dynamic.md', 'Dynamic content'],
    ]);

    const result = renderContext(profile, contents, meta);

    const beforeDynamic = result.content.slice(0, result.dynamicOffset);
    expect(beforeDynamic.trimEnd().endsWith(BOUNDARY)).toBe(true);
  });

  it('deterministic ordering within categories', () => {
    const profile: AllocatedProfile = {
      entries: [
        makeAllocatedEntry({ path: 'knowledge/z.md' }),
        makeAllocatedEntry({ path: 'knowledge/a.md' }),
        makeAllocatedEntry({ path: 'knowledge/m.md' }),
      ],
      tier: 'comfortable',
      totalTokens: 300,
    };
    const contents = new Map([
      ['knowledge/a.md', 'A content'],
      ['knowledge/m.md', 'M content'],
      ['knowledge/z.md', 'Z content'],
    ]);

    const result = renderContext(profile, contents, meta);

    const aIdx = result.content.indexOf('A content');
    const mIdx = result.content.indexOf('M content');
    const zIdx = result.content.indexOf('Z content');
    expect(aIdx).toBeLessThan(mIdx);
    expect(mIdx).toBeLessThan(zIdx);
  });

  it('generatedAt uses ClockPort', () => {
    const profile: AllocatedProfile = {
      entries: [],
      tier: 'comfortable',
      totalTokens: 0,
    };
    const contents = new Map<string, string>();

    const result = renderContext(profile, contents, meta);

    expect(result.metadata.generatedAt).toBe('2026-05-11T12:00:00.000Z');
  });

  describe('chat language directive (IL T-05)', () => {
    const profile: AllocatedProfile = {
      entries: [makeAllocatedEntry({ path: 'a.md', zone: 'static' })],
      tier: 'comfortable',
      totalTokens: 100,
    };
    const contents = new Map([['a.md', 'fixed content']]);

    it('prepends a Russian directive when chatLanguage is ru', () => {
      const result = renderContext(profile, contents, { ...meta, chatLanguage: 'ru' });

      expect(result.content.startsWith('<!-- [LANGUAGE] -->')).toBe(true);
      expect(result.content).toContain('Communicate with the user in Russian.');
    });

    it('prepends an English directive when chatLanguage is en', () => {
      const result = renderContext(profile, contents, { ...meta, chatLanguage: 'en' });

      expect(result.content.startsWith('<!-- [LANGUAGE] -->')).toBe(true);
      expect(result.content).toContain('Communicate with the user in English.');
    });

    it('omits the directive when chatLanguage is absent', () => {
      const result = renderContext(profile, contents, meta);

      expect(result.content).not.toContain('<!-- [LANGUAGE] -->');
    });

    it('keeps staticHash stable across renders for the same language', () => {
      const r1 = renderContext(profile, contents, { ...meta, chatLanguage: 'ru' });
      const r2 = renderContext(profile, contents, { ...meta, chatLanguage: 'ru' });

      expect(r1.staticHash).toBe(r2.staticHash);
    });

    it('changes staticHash compared to no directive', () => {
      const withDirective = renderContext(profile, contents, { ...meta, chatLanguage: 'ru' });
      const without = renderContext(profile, contents, meta);

      expect(withDirective.staticHash).not.toBe(without.staticHash);
    });
  });
});
