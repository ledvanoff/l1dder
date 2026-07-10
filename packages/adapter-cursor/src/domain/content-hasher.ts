import { createHash } from 'node:crypto';

const MARKER_REGEX = /<!-- L1DDER:MANAGED hash:\w+ -->\n?/;

/**
 * Compute a deterministic content hash (SHA-256, first 12 hex chars).
 *
 * The marker line itself is excluded from hashing so that hash comparison
 * remains stable across regenerations (AD7 algorithm).
 */
export function computeContentHash(content: string): string {
  const withoutMarker = content.replace(MARKER_REGEX, '');
  return createHash('sha256').update(withoutMarker).digest('hex').slice(0, 12);
}
