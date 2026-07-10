import { describe, it, expect } from 'vitest';
import {
  generateMarker,
  generateSourceComment,
  parseMarker,
  stripMarker,
} from './marker.js';

describe('generateMarker', () => {
  it('produces correct marker format', () => {
    expect(generateMarker('a1b2c3d4e5f6')).toBe(
      '<!-- L1DDER:MANAGED hash:a1b2c3d4e5f6 -->',
    );
  });
});

describe('generateSourceComment', () => {
  it('joins sources with " + "', () => {
    const result = generateSourceComment([
      'commands/built-in/specify.md',
      'skills/built-in/specify-feature.md',
      'agents/analyst.md',
    ]);
    expect(result).toBe(
      '<!-- Source: commands/built-in/specify.md + skills/built-in/specify-feature.md + agents/analyst.md -->',
    );
  });

  it('handles single source', () => {
    expect(generateSourceComment(['skills/built-in/foo.md'])).toBe(
      '<!-- Source: skills/built-in/foo.md -->',
    );
  });
});

describe('parseMarker', () => {
  it('extracts hash from marker line', () => {
    const content = '<!-- L1DDER:MANAGED hash:a1b2c3d4e5f6 -->\n# Title\n';
    expect(parseMarker(content)).toEqual({ hash: 'a1b2c3d4e5f6' });
  });

  it('returns null for content without marker', () => {
    expect(parseMarker('# Regular heading\nSome text\n')).toBeNull();
  });

  it('returns null for empty content', () => {
    expect(parseMarker('')).toBeNull();
  });

  it('finds marker even if not on first line', () => {
    const content = '---\nalwaysApply: true\n---\n<!-- L1DDER:MANAGED hash:abcdef123456 -->\n';
    expect(parseMarker(content)).toEqual({ hash: 'abcdef123456' });
  });
});

describe('stripMarker', () => {
  it('removes marker and source comment', () => {
    const content = [
      '<!-- L1DDER:MANAGED hash:a1b2c3d4e5f6 -->',
      '<!-- Source: some/file.md -->',
      '',
      '# Title',
      'Body text',
    ].join('\n');

    expect(stripMarker(content)).toBe('# Title\nBody text');
  });

  it('returns content unchanged when no marker present', () => {
    const content = '# Title\nBody text\n';
    expect(stripMarker(content)).toBe(content);
  });
});
