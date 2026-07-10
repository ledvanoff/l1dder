/**
 * Resolve a relative path against a project root.
 *
 * Empty or '.' root returns the path as-is (useful in tests).
 */
export function resolvePath(root: string, relativePath: string): string {
  if (root === '' || root === '.') return relativePath;
  return `${root}/${relativePath}`;
}
