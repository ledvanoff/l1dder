const MARKER_PATTERN = /^<!-- L1DDER:MANAGED hash:([0-9a-f]+) -->/m;
const SOURCE_PATTERN = /^<!-- Source: .+ -->\n?/m;

/**
 * Generate the `L1DDER:MANAGED` marker line with the given content hash.
 */
export function generateMarker(hash: string): string {
  return `<!-- L1DDER:MANAGED hash:${hash} -->`;
}

/**
 * Generate the source provenance comment listing origin files.
 */
export function generateSourceComment(sources: readonly string[]): string {
  return `<!-- Source: ${sources.join(' + ')} -->`;
}

/**
 * Parse an existing `L1DDER:MANAGED` marker from file content.
 *
 * @returns Extracted hash, or `null` if no marker is found.
 */
export function parseMarker(content: string): { hash: string } | null {
  const match = MARKER_PATTERN.exec(content);
  if (!match?.[1]) return null;
  return { hash: match[1] };
}

/**
 * Remove the `L1DDER:MANAGED` marker and optional source comment from content.
 */
export function stripMarker(content: string): string {
  return content.replace(MARKER_PATTERN, '').replace(SOURCE_PATTERN, '').trimStart();
}
