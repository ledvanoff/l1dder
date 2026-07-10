import { describe, it, expect } from 'vitest';
import { computeContentHash } from './content-hasher.js';

describe('computeContentHash', () => {
  it('returns 12-char hex string', () => {
    const hash = computeContentHash('test content');
    expect(hash).toHaveLength(12);
    expect(hash).toMatch(/^[0-9a-f]{12}$/);
  });

  it('is deterministic', () => {
    const a = computeContentHash('hello world');
    const b = computeContentHash('hello world');
    expect(a).toBe(b);
  });

  it('differs for different content', () => {
    const a = computeContentHash('content A');
    const b = computeContentHash('content B');
    expect(a).not.toBe(b);
  });

  it('excludes marker line from hash computation', () => {
    const body = '# Title\n\nSome body text\n';
    const withMarker = `<!-- L1DDER:MANAGED hash:a1b2c3d4e5f6 -->\n${body}`;
    expect(computeContentHash(withMarker)).toBe(computeContentHash(body));
  });

  it('handles content without marker', () => {
    const content = '# No marker here\n\nJust plain text.\n';
    const hash = computeContentHash(content);
    expect(hash).toHaveLength(12);
  });
});
