/**
 * Protected directory checker.
 *
 * Identifies file paths that belong to L1DDER's curated directories.
 * Changes to these paths require explicit user confirmation per l1dder.mdc rules.
 */

/** Protected directory prefixes (relative to project root). */
const PROTECTED_PREFIXES: readonly string[] = [
  'knowledge/',
  'standards/',
  'templates/',
  'archive/',
];

/**
 * Check whether the given file path is inside a protected L1DDER directory.
 *
 * Accepts both forward-slash and backslash paths (normalised internally).
 * This function is pure — no I/O, no side-effects.
 */
export function isProtectedPath(filePath: string): boolean {
  const normalised = filePath.replace(/\\/g, '/');
  return PROTECTED_PREFIXES.some((prefix) => normalised.startsWith(prefix));
}

/**
 * Return the protected directory prefix that matches the path, or undefined.
 */
export function getProtectedDir(filePath: string): string | undefined {
  const normalised = filePath.replace(/\\/g, '/');
  return PROTECTED_PREFIXES.find((prefix) => normalised.startsWith(prefix));
}
