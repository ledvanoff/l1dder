import { describe, expect, it } from 'vitest';

import { parseFrontMatter, stringifyFrontMatter } from './front-matter.js';

describe('parseFrontMatter', () => {
  it('parses valid YAML front-matter', () => {
    const text = '---\nid: test\ntrigger: auto\n---\n# Body\n\nContent here.';
    const result = parseFrontMatter(text);
    expect(result.data).toEqual({ id: 'test', trigger: 'auto' });
    expect(result.body).toBe('# Body\n\nContent here.');
  });

  it('returns null data when no front-matter fence', () => {
    const text = '# Just a heading\n\nSome content.';
    const result = parseFrontMatter(text);
    expect(result.data).toBeNull();
    expect(result.body).toBe(text);
  });

  it('strips UTF-8 BOM before parsing', () => {
    const text = '\uFEFF---\nid: bom-test\n---\n# Body';
    const result = parseFrontMatter(text);
    expect(result.data).toEqual({ id: 'bom-test' });
    expect(result.body).toBe('# Body');
    expect(result.body).not.toContain('\uFEFF');
  });

  it('handles empty front-matter (--- followed by ---)', () => {
    const text = '---\n---\n# Body';
    const result = parseFrontMatter(text);
    expect(result.data).toBeNull();
    expect(result.body).toBe('# Body');
  });

  it('handles multiline body with markdown headings', () => {
    const text = '---\nid: multi\n---\n## Summary\n\nSome summary.\n\n## Steps\n\n1. Do this.';
    const result = parseFrontMatter(text);
    expect(result.data).toEqual({ id: 'multi' });
    expect(result.body).toContain('## Summary');
    expect(result.body).toContain('## Steps');
    expect(result.body).toContain('1. Do this.');
  });

  it('returns null data when only opening fence (no closing)', () => {
    const text = '---\nid: incomplete\nno closing fence';
    const result = parseFrontMatter(text);
    expect(result.data).toBeNull();
  });

  it('handles complex YAML values (arrays, nested objects)', () => {
    const text = '---\nid: complex\ntags:\n  - a\n  - b\nnested:\n  key: val\n---\nBody';
    const result = parseFrontMatter(text);
    expect(result.data).toEqual({
      id: 'complex',
      tags: ['a', 'b'],
      nested: { key: 'val' },
    });
    expect(result.body).toBe('Body');
  });
});

describe('stringifyFrontMatter', () => {
  it('produces valid roundtrip', () => {
    const data = { id: 'roundtrip', trigger: 'auto', priority: 1 };
    const body = '# Heading\n\nContent here.';
    const serialized = stringifyFrontMatter(data, body);
    const parsed = parseFrontMatter(serialized);

    expect(parsed.data).toEqual(data);
    expect(parsed.body).toBe(body);
  });

  it('wraps data in --- fences', () => {
    const result = stringifyFrontMatter({ id: 'test' }, 'Body');
    expect(result).toMatch(/^---\n/);
    expect(result).toContain('\n---\n');
  });
});
