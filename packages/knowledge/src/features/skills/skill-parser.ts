import type { Result } from '@l1dder/core';
import { ok, err } from '@l1dder/core';
import type { ParsedSkill } from '@l1dder/core';
import type { SkillCategory } from '@l1dder/schemas';
import { parseFrontMatter } from '@l1dder/yaml';
import { SkillFrontMatterSchema } from '@l1dder/schemas';

import { ParseError } from '../../errors.js';
import { extractSummary } from '../knowledge/summary.js';

/**
 * Parse a skill file content into a validated ParsedSkill.
 *
 * Uses parseFrontMatter (T-01) for YAML extraction and
 * SkillFrontMatterSchema (T-02) for Zod validation.
 */
export function parseSkill(
  filePath: string,
  content: string,
  category: SkillCategory,
): Result<ParsedSkill, ParseError> {
  const { data, body } = parseFrontMatter(content);

  if (data == null) {
    return err(new ParseError(filePath, 'No YAML front-matter found'));
  }

  const validation = SkillFrontMatterSchema.safeParse(data);
  if (!validation.success) {
    return err(
      new ParseError(filePath, validation.error.message, validation.error),
    );
  }

  const summary = extractSummary(body);

  return ok({
    frontMatter: validation.data,
    body,
    summary,
    filePath,
    category,
  });
}
