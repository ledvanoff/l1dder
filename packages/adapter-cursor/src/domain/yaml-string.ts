/**
 * Escape a string for safe inclusion in YAML double-quoted scalars.
 *
 * Command prose legitimately contains quotes (e.g. `"what should I do next?"`),
 * which would otherwise terminate the scalar and produce unparseable
 * front-matter.
 */
export function yamlQuotedString(value: string): string {
  const singleLine = value.replace(/\s+/g, ' ').trim();
  return `"${singleLine.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
