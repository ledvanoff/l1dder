/**
 * @l1dder/adapter-cursor — AI IDE Adapter for Cursor.
 * Generates .cursor/rules/, .cursor/commands/, .cursor/skills-l1dder/.
 *
 * @packageDocumentation
 */

export const PACKAGE = '@l1dder/adapter-cursor' as const;

// ─── Adapter ───

export { CursorAdapter } from './cursor-adapter.js';
export type { CursorAdapterDeps } from './cursor-adapter.js';

// ─── Manifest ───

export { cursorManifest } from './cursor-manifest.js';

// ─── Domain ───

export { computeContentHash } from './domain/content-hasher.js';
export {
  generateMarker,
  generateSourceComment,
  parseMarker,
  stripMarker,
} from './domain/marker.js';
export { extractSkillSections } from './domain/section-extractor.js';
export type { SkillSections } from './domain/section-extractor.js';

// ─── Transformers ───

export { transformSkill } from './features/skills/skill-transformer.js';
export type { SkillTransformResult } from './features/skills/skill-transformer.js';

export { transformCommand } from './features/commands/command-transformer.js';
export type { CommandTransformResult } from './features/commands/command-transformer.js';

export { composeCommandBody } from './features/commands/command-composer.js';
export type { CompositionInput } from './features/commands/command-composer.js';

// ─── Generators ───

export { generateRule } from './features/rules/rule-generator.js';
export type { RuleGeneratorInput, RuleGenerateResult } from './features/rules/rule-generator.js';

export { generateAgentsMd } from './features/agents-md/agents-md-generator.js';
export type { AgentsMdData, AgentsMdResult } from './features/agents-md/agents-md-generator.js';

// ─── Writer ───

export { AtomicWriter } from './adapters/atomic-writer.js';
export type { WriteRequest, WriteOptions, WriteReport } from './adapters/atomic-writer.js';
