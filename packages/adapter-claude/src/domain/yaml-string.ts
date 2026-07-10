/**
 * Escape a string for safe inclusion in YAML double-quoted scalars.
 */
export function yamlQuotedString(value: string): string {
  const singleLine = value.replace(/\s+/g, ' ').trim();
  return `"${singleLine.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
