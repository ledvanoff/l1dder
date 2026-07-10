/**
 * @l1dder/adapter-claude — AI IDE Adapter for Claude Code.
 * Generates `.claude/skills/` and `CLAUDE.md`.
 *
 * @packageDocumentation
 */

export const PACKAGE = '@l1dder/adapter-claude' as const;

export { ClaudeAdapter } from './claude-adapter.js';
export type { ClaudeAdapterDeps } from './claude-adapter.js';

export { claudeManifest } from './claude-manifest.js';

export { transformSkill } from './features/skills/skill-transformer.js';
export type { SkillTransformResult } from './features/skills/skill-transformer.js';

export { transformCommand } from './features/commands/command-transformer.js';
export type { CommandTransformResult } from './features/commands/command-transformer.js';

export { composeCommandBody } from './features/commands/command-composer.js';
export type { CompositionInput } from './features/commands/command-composer.js';

export { generateRule } from './features/rules/rule-generator.js';
export type { RuleGeneratorInput, RuleGenerateResult } from './features/rules/rule-generator.js';

export { AtomicWriter } from './adapters/atomic-writer.js';
export type { WriteRequest, WriteOptions, WriteReport } from './adapters/atomic-writer.js';
