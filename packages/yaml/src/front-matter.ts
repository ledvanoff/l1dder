import { parse as yamlParse, stringify as yamlStringify } from 'yaml';

/** Result of parsing YAML front-matter from a Markdown document. */
export interface FrontMatterResult {
  /** Parsed YAML data, or null if no front-matter fence was found. */
  readonly data: unknown;
  /** Markdown body after the closing `---` fence. */
  readonly body: string;
}

const BOM = '\uFEFF';
const FENCE = '---';

/**
 * Parse YAML front-matter from a Markdown document.
 *
 * Splits text by `---` fences, parses the YAML section via eemeli/yaml,
 * and returns raw data + body. Zod validation is the caller's responsibility.
 */
export function parseFrontMatter(text: string): FrontMatterResult {
  const cleaned = text.startsWith(BOM) ? text.slice(1) : text;
  const trimmed = cleaned.trimStart();

  if (!trimmed.startsWith(FENCE)) {
    return { data: null, body: cleaned };
  }

  const afterFirstFence = trimmed.slice(FENCE.length);
  const closingIdx = afterFirstFence.indexOf(`\n${FENCE}`);

  if (closingIdx === -1) {
    return { data: null, body: cleaned };
  }

  const yamlBlock = afterFirstFence.slice(0, closingIdx);
  const rest = afterFirstFence.slice(closingIdx + 1 + FENCE.length);
  const body = rest.startsWith('\n') ? rest.slice(1) : rest;

  const parsed: unknown = yamlParse(yamlBlock);
  const data: unknown =
    parsed == null ||
    (typeof parsed === 'object' && Object.keys(parsed).length === 0)
      ? null
      : parsed;

  return { data, body };
}

/**
 * Serialize data + body back into a document with YAML front-matter fences.
 */
export function stringifyFrontMatter(data: object, body: string): string {
  const yamlStr = yamlStringify(data).trimEnd();
  return `${FENCE}\n${yamlStr}\n${FENCE}\n${body}`;
}
