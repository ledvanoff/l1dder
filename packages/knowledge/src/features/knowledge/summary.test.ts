import { describe, expect, it } from 'vitest';

import { extractSummary } from './summary.js';

describe('extractSummary', () => {
  it('extracts ## Summary section', () => {
    const md = '## Summary\n\nThis is a summary.\n\n## Details\n\nSome details.';
    expect(extractSummary(md)).toBe('This is a summary.');
  });

  it('extracts until next ## heading', () => {
    const md = '## Summary\n\nLine 1.\nLine 2.\n\n## Next Section\n\nMore.';
    expect(extractSummary(md)).toBe('Line 1.\nLine 2.');
  });

  it('extracts until next # heading', () => {
    const md = '## Summary\n\nContent.\n\n# Top Level\n\nMore.';
    expect(extractSummary(md)).toBe('Content.');
  });

  it('extracts until end of file if no next heading', () => {
    const md = '## Summary\n\nOnly summary content here.';
    expect(extractSummary(md)).toBe('Only summary content here.');
  });

  it('is case-insensitive for heading', () => {
    const md = '## summary\n\nLower case works.';
    expect(extractSummary(md)).toBe('Lower case works.');
  });

  it('falls back to first 500 chars when no ## Summary', () => {
    const longContent = 'A'.repeat(600);
    const result = extractSummary(longContent);
    expect(result).toContain('A'.repeat(500));
    expect(result).toContain('<!-- truncated -->');
  });

  it('returns full content if short and no ## Summary', () => {
    const short = 'Just a short note.';
    expect(extractSummary(short)).toBe('Just a short note.');
  });

  it('handles multi-paragraph summary', () => {
    const md = '## Summary\n\nParagraph 1.\n\nParagraph 2.\n\n## Details';
    expect(extractSummary(md)).toBe('Paragraph 1.\n\nParagraph 2.');
  });

  it('handles content before summary heading', () => {
    const md = '# Title\n\nPreamble.\n\n## Summary\n\nActual summary.\n\n## Details';
    expect(extractSummary(md)).toBe('Actual summary.');
  });
});
