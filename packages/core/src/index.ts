/**
 * @l1dder/core — Domain types, transition table, ports, Result, errors.
 *
 * Pure domain logic with zero side-effects.
 *
 * @packageDocumentation
 */

// ─── Domain: Phase Machine ───

export {
  Phase,
  PhaseStatus,
  WorkflowMode,
  ProjectStage,
  TransitionKind,
  PHASE_TO_MODE,
} from './domain/phase.js';

// Re-export types (Phase etc. are both const + type, re-exported above)

export type {
  TriggerType,
  TransitionRule,
  TransitionRecord,
  WorkflowPosition,
  HandoffRecord,
} from './domain/transition-types.js';

export {
  TRANSITIONS,
  isAllowedTransition,
  findTransitionRule,
  requiredGatesFor,
  listAvailableTransitions,
  isRollbackAllowed,
} from './domain/transitions-table.js';

// ─── Domain: Hygiene (structural drift) ───

export type { DriftLevel, DriftFinding } from './domain/hygiene/drift-types.js';
export type {
  KnowledgeDoc,
  StructuralDriftOptions,
} from './domain/hygiene/structural-drift.js';
export { detectStructuralDrift } from './domain/hygiene/structural-drift.js';

// ─── Domain: Result ───

export { ok, err, isOk, isErr } from './domain/result.js';
export type { Result, Ok, Err } from './domain/result.js';

// ─── Errors ───

export { L1dderError } from './errors/l1dder-error.js';
export {
  ForbiddenTransitionError,
  StageGuardError,
  GateRejectedError,
  DependenciesNotMetError,
  CorruptedStateError,
  SchemaValidationError,
  NotInitializedError,
  TaskNotFoundError,
  TaskAlreadyExistsError,
  InvalidTaskStatusTransitionError,
  InvalidStageTransitionError,
  AlreadyAtStageError,
} from './errors/state-errors.js';
export type {
  TransitionError,
  StateLoadError,
  TaskError,
  StageError,
} from './errors/state-errors.js';

// ─── Ports ───

export type { FileSystemPort, FileStat } from './ports/file-system.js';
export type { ClockPort } from './ports/clock.js';
export type { LoggerPort } from './ports/logger.js';
export type { ShellPort, ShellExecOptions, ShellResult } from './ports/shell.js';
export type { PromptPort, PromptChoice } from './ports/prompt.js';

// ─── Domain: Skills ───

export type { ParsedSkill } from './domain/skill-types.js';
export type { SkillRegistry } from './domain/skill-registry.js';
export type { SkillResolutionInput, ResolvedSkill } from './domain/skill-resolution.js';
export { PHASE_SKILL_MAP } from './domain/skill-phase-map.js';
export { resolveSkill, resolveSkillsByWorkType } from './domain/skill-resolution.js';
export { WORK_TYPE_SKILL_MAP, isWorkType } from './domain/work-type-map.js';
export type { WorkType } from './domain/work-type-map.js';
export type { SkillProvider } from './domain/extension-types.js';

// ─── Domain: Personas ───

export type { ParsedPersona } from './domain/persona.js';

// ─── Domain: Slash Commands ───

export type { ParsedSlashCommand, SlashCommandRegistry } from './domain/slash-command.js';
export { PHASE_COMMAND_MAP, WILDCARD_COMMANDS, resolveSlashCommand } from './domain/slash-command.js';

// ─── Domain: Install (Cross-Harness) ───

export type {
  InstallAction,
  TransformedInstallFile,
  InstallPlanItem,
  InstallPlan,
} from './domain/install/install-types.js';
export {
  resolveAdapterTargets,
  normalizeAdapters,
} from './domain/install/install-types.js';
export { planInstall, summarizePlan } from './domain/install/install-planner.js';
export { resolveHarnessPath } from './domain/install/harness-path.js';
export type { HarnessOutputKind } from './domain/install/harness-path.js';
export { IdeAdapterRegistry } from './domain/install/adapter-registry.js';
export {
  shouldIncludeForAdapter,
  filterSkillsForAdapter,
  filterCommandsForAdapter,
} from './domain/install/content-filter.js';
export type { AdapterContentExclusions } from './domain/install/content-filter.js';

// ─── Ports: IDE Adapter ───

export type {
  AIIdeAdapter,
  AdapterManifest,
  AdapterContext,
  AdapterOutputConfig,
  GenerationReport,
  GenerationError,
  ValidationReport,
  Check,
  ResolvedStandards,
  ResolvedTeam,
} from './ports/ide-adapter.js';

// ─── Domain: Hooks ───

export { getBuiltinHooks } from './domain/hooks/hook-registry.js';
export { resolveActiveHooks } from './domain/hooks/hook-resolution.js';
export type { HookResolutionOptions, HookEnvOverrides } from './domain/hooks/hook-resolution.js';
export { matchesHook, matchGlob } from './domain/hooks/matcher.js';
export { findSecrets } from './domain/hooks/secret-scan.js';
export type { SecretFinding } from './domain/hooks/secret-scan.js';
export { isConventionalCommit } from './domain/hooks/commit-format.js';
export { isProtectedPath, getProtectedDir } from './domain/hooks/protected-path.js';

// ─── Extensions ───

export type { ToolMetadata, ToolContext, Tool } from './extensions/tool.js';
export { ToolRegistry, ToolAlreadyRegisteredError } from './extensions/registry.js';

// ─── Integrations (deprecated — use ports/ide-adapter) ───

/** @deprecated Use `AIIdeAdapter` from ports/ide-adapter instead. */
export type { IdeAdapter } from './integrations/adapter.js';
export { AdapterRegistry } from './integrations/adapter.js';
