import type { SkillFrontMatter, SkillCategory } from '@l1dder/schemas';

/**
 * Runtime representation of a parsed L1DDER skill.
 *
 * Combines validated front-matter with the body content and file metadata.
 * Used by SkillRegistry, Agent Router, and Context Engine.
 *
 * This is the single source of truth for the shape — `@l1dder/schemas` does
 * not declare a competing `ParsedSkill`/`ParsedSkillSchema`, since the
 * `body`/`summary`/`filePath` fields are assembled programmatically by
 * `parseSkill()` rather than parsed as one Zod schema (only `frontMatter` is
 * Zod-validated, via `SkillFrontMatterSchema`).
 */
export interface ParsedSkill {
  readonly frontMatter: SkillFrontMatter;
  readonly body: string;
  readonly summary: string;
  readonly filePath: string;
  readonly category: SkillCategory;
}
