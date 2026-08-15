import type { FileSystemPort } from '@l1dder/core';

/** Key/value map for `{{KEY}}` substitution in scaffold templates. */
export interface TemplateVars {
  readonly [key: string]: string;
}

/**
 * Replace every `{{KEY}}` / `{{ KEY }}` occurrence for keys present in `vars`.
 *
 * Placeholders whose key is absent from `vars` are left untouched verbatim —
 * never blanked (silent data loss is forbidden). Pure: no fs, no clock.
 */
export function renderTemplate(source: string, vars: TemplateVars): string {
  return source.replace(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      return vars[key] ?? match;
    }
    return match;
  });
}

/**
 * Unique, source-ordered list of remaining `{{...}}` placeholder keys.
 */
export function findUnresolvedPlaceholders(rendered: string): readonly string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  const re = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(rendered)) !== null) {
    const key = match[1];
    if (key === undefined || seen.has(key)) {
      continue;
    }
    seen.add(key);
    ordered.push(key);
  }
  return ordered;
}

/**
 * Read a bundled knowledge template via the fs port and render placeholders.
 *
 * @returns Rendered content, or `null` when the asset is missing/unreadable.
 */
export async function renderKnowledgeTemplate(
  fs: FileSystemPort,
  assetPath: string,
  vars: TemplateVars,
): Promise<string | null> {
  try {
    const source = await fs.readFile(assetPath);
    return renderTemplate(source, vars);
  } catch {
    return null;
  }
}
