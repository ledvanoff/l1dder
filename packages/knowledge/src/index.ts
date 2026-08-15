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

// ─── Project Registry ───

export {
  RegistryReader,
  REGISTRY_MANIFEST_PATH,
} from './features/registry/registry-reader.js';
export type { RegistryReaderDeps } from './features/registry/registry-reader.js';
export { RegistryValidator } from './features/registry/registry-validator.js';
export type {
  RegistryValidatorDeps,
  RegistryValidationReport,
  RegistryIssue,
  RegistryIssueCode,
  RegistryIssueSeverity,
} from './features/registry/registry-validator.js';
export {
  collectSymbolIssues,
} from './features/registry/registry-symbol-checks.js';
export type {
  RegistrySymbolIssue,
  RegistrySymbolIssueCode,
} from './features/registry/registry-symbol-checks.js';
export {
  TypeScriptSymbolIndexer,
} from './features/registry/typescript-symbol-indexer.js';
export type {
  TypeScriptSymbolIndexerDeps,
} from './features/registry/typescript-symbol-indexer.js';
export {
  TestContractEvidenceIndexer,
} from './features/registry/test-contract-evidence-indexer.js';
export type {
  TestContractEvidenceIndexerDeps,
} from './features/registry/test-contract-evidence-indexer.js';
export {
  collectTestContractIssues,
} from './features/registry/registry-test-contract-checks.js';
export type {
  RegistryTestContractIssue,
  RegistryTestContractIssueCode,
} from './features/registry/registry-test-contract-checks.js';
export {
  renderRegistry,
  registryContentHash,
  isGeneratedViewStale,
  inspectGeneratedViewFreshness,
  extractRegistryContentHash,
  registryLookupInstruction,
  REGISTRY_HASH_MARKER_PREFIX,
  REGISTRY_HASH_MARKER_RE,
} from './features/registry/registry-renderer.js';
export type { GeneratedViewFreshnessStatus } from './features/registry/registry-renderer.js';
export {
  REGISTRY_VIEW_PATH,
  AI_CONTEXT_PATH,
  createRegistryValidator,
  loadRegistryBundle,
  syncRegistryView,
  initRegistryManifest,
  inspectAiContextFreshness,
  registryCollectionCounts,
} from './features/registry/registry-engine.js';
export type {
  RegistryEngineDeps,
  RegistryEngineError,
  RegistryEngineErrorCode,
  RegistryBundle,
  RegistrySyncResult,
} from './features/registry/registry-engine.js';
export {
  githubHeadingSlug,
  collectHeadingSlugs,
  collectExplicitAnchors,
  collectAnchorTargets,
  splitSourceAnchor,
} from './features/registry/markdown-slug.js';

// ─── Spec AI Contract ───

export { parseSpecContract } from './features/spec-contract/parse-spec-contract.js';
export type {
  SpecContractError,
  SpecContractErrorCode,
} from './features/spec-contract/parse-spec-contract.js';

// ─── Errors ───

export { ReadError, ParseError, LoadError } from './errors.js';
