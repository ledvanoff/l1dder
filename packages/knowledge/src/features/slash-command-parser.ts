import type { Result } from '@l1dder/core';
import { ok, err } from '@l1dder/core';
import type { ParsedSlashCommand, SlashCommandBody } from '@l1dder/schemas';
import { SlashCommandFrontMatterSchema } from '@l1dder/schemas';
import { parseFrontMatter } from '@l1dder/yaml';

import { ParseError } from '../errors.js';

/**
 * Section heading → `SlashCommandBody` key mapping.
 *
 * Keys are lowercase heading text after "## " prefix.
 */
const SECTION_MAP: Readonly<Record<string, keyof SlashCommandBody>> = {
  'summary': 'summary',
  'when to use': 'when_to_use',
  'system prompt': 'system_prompt',
  'context profile': 'context_profile',
  'steps': 'steps',
  'acceptance criteria': 'acceptance_criteria',
  'post-conditions': 'post_conditions',
  'error handling': 'error_handling',
  'examples': 'examples',
};

const H2_REGEX = /^## (.+)$/gm;

/** Extract known sections from slash command Markdown body. */
function extractBodySections(body: string): SlashCommandBody {
  const sections: Record<string, string> = {};
  const matches = [...body.matchAll(H2_REGEX)];

  for (const [idx, match] of matches.entries()) {
    const captured = match[1];
    if (!captured) continue;

    const heading = captured.trim().toLowerCase();
    const sectionKey = SECTION_MAP[heading];
    if (!sectionKey) continue;

    const start = match.index + match[0].length;
    const nextMatch = matches[idx + 1];
    const end = nextMatch !== undefined ? nextMatch.index : body.length;
    sections[sectionKey] = body.slice(start, end).trim();
  }

  return sections;
}

/**
 * Parse a slash command file content into a validated `ParsedSlashCommand`.
 *
 * Uses `parseFrontMatter` for YAML extraction and
 * `SlashCommandFrontMatterSchema` for Zod validation.
 */
export function parseSlashCommand(
  filePath: string,
  content: string,
): Result<ParsedSlashCommand, ParseError> {
  const { data, body } = parseFrontMatter(content);

  if (data == null) {
    return err(new ParseError(filePath, 'No YAML front-matter found'));
  }

  const validation = SlashCommandFrontMatterSchema.safeParse(data);
  if (!validation.success) {
    return err(
      new ParseError(filePath, validation.error.message, validation.error),
    );
  }

  const sections = extractBodySections(body);

  return ok({
    frontMatter: validation.data,
    sections,
    body,
    filePath,
  });
}
