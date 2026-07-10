/**
 * @l1dder/knowledge — Knowledge Layer: file discovery, Summary extraction,
 * Skill loading/merging/validation, Standards parsing.
 *
 * @packageDocumentation
 */

// ─── Knowledge Reader ───

export { KnowledgeReader } from './knowledge-reader.js';
export type { KnowledgeReaderDeps, KnowledgeFileEntry, KnowledgeCategory } from './knowledge-reader.js';
export { extractSummary } from './features/knowledge/summary.js';

// ─── Skills ───

export { SkillLoader } from './features/skills/skill-loader.js';
export type { SkillLoaderDeps } from './features/skills/skill-loader.js';
export { parseSkill } from './features/skills/skill-parser.js';
export { mergeSkill } from './features/skills/skill-merger.js';
export { validateSkillRegistry } from './features/skills/skill-validator.js';
export type {
  SkillValidationResult,
  SkillValidationError,
  SkillValidationWarning,
} from './features/skills/skill-validator.js';
export { InMemorySkillRegistry } from './in-memory-skill-registry.js';

// ─── Personas ───

export { PersonaLoader } from './features/persona-loader.js';
export type { PersonaLoaderDeps } from './features/persona-loader.js';

// ─── Slash Commands ───

export { SlashCommandLoader } from './features/slash-command-loader.js';
export type { SlashCommandLoaderDeps } from './features/slash-command-loader.js';
export { parseSlashCommand } from './features/slash-command-parser.js';
export { InMemorySlashCommandRegistry } from './in-memory-slash-command-registry.js';

// ─── Standards ───

export { StandardsParser } from './features/standards/standards-parser.js';
export type { StandardsParserDeps } from './features/standards/standards-parser.js';
export type {
  MergedStandards,
  OverrideEntry,
  ConventionsBase,
  WorkflowBase,
  BaseMeta,
} from './features/standards/types.js';

// ─── Errors ───

export { ReadError, ParseError, LoadError } from './errors.js';
