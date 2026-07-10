/**
 * @l1dder/schemas — Zod 4 schemas for state.yml, config.yml, and transition API.
 *
 * Single source of truth for all data contracts between L1DDER packages.
 * Types are inferred via `z.infer<>` — no duplicate interfaces.
 *
 * @packageDocumentation
 */

// ─── State (state.yml) ───

export {
  PhaseSchema,
  PhaseStatusSchema,
  WorkflowModeSchema,
  ProjectStageSchema,
  TransitionKindSchema,
  TriggerSourceSchema,
  ActorSchema,
  StageHistoryEntrySchema,
  ProjectSchema,
  GateOutcomeSchema,
  PhaseHistoryEntrySchema,
  GateHistoryActionSchema,
  GateRecordSchema,
  WorkflowSchema,
  TaskStatusSchema,
  TaskSchema,
  TasksSchema,
  QuickTaskSchema,
  KnowledgeUpdateSchema,
  InFlightTransitionSchema,
  DecisionStatusSchema,
  DecisionSchema,
  SkillRunOutcomeSchema,
  SkillRunSchema,
  SkillVersionSchema,
  StateSchema,
} from './state.js';

export type {
  Phase,
  PhaseStatus,
  WorkflowMode,
  ProjectStage,
  TransitionKind,
  TriggerSource,
  Actor,
  StageHistoryEntry,
  Project,
  GateOutcome,
  PhaseHistoryEntry,
  GateHistoryAction,
  GateRecord,
  Workflow,
  TaskStatus,
  Task,
  Tasks,
  QuickTask,
  KnowledgeUpdate,
  InFlightTransition,
  DecisionStatus,
  Decision,
  SkillRunOutcome,
  SkillRun,
  SkillVersion,
  State,
} from './state.js';

// ─── Install State (install-state.yml) ───

export {
  InstallStateEntrySchema,
  InstallStateSchema,
} from './install-state.js';

export type {
  InstallStateEntry,
  InstallState,
} from './install-state.js';

// ─── Config (config.yml) ───

export {
  RoleModeSchema,
  EnforcementSchema,
  LanguageCodeSchema,
  LanguageSchema,
  GateConfigEntrySchema,
  GatesConfigSchema,
  StageEnforcementSchema,
  DeliveryCriteriaSchema,
  StageConfigSchema,
  HygieneConfigSchema,
  IncludeModeSchema,
  ContextConfigSchema,
  PresetsSchema,
  AdapterIdSchema,
  ConfigSchema,
} from './config.js';

export type {
  RoleMode,
  Enforcement,
  LanguageCode,
  Language,
  GateConfigEntry,
  GatesConfig,
  StageEnforcement,
  DeliveryCriteria,
  StageConfig,
  HygieneConfig,
  IncludeMode,
  ContextConfig,
  Presets,
  AdapterId,
  Config,
} from './config.js';

// ─── Workflow Base (workflow.base.yml) ───

export {
  BaseMetaSchema,
  SessionDisciplineSchema,
  WorkflowBaseSchema,
} from './workflow-base.js';

export type {
  BaseMeta,
  SessionDiscipline,
  WorkflowBaseParsed,
} from './workflow-base.js';

// ─── Skill ───

export {
  SkillTriggerSchema,
  SkillOverrideStrategySchema,
  SkillCategorySchema,
  SkillPhaseSchema,
  SkillFrontMatterSchema,
} from './skill.js';

export type {
  SkillTrigger,
  SkillOverrideStrategy,
  SkillCategory,
  SkillPhase,
  SkillFrontMatter,
} from './skill.js';

// ─── Slash Command ───

export {
  SlashTriggerKindSchema,
  SlashOverrideStrategySchema,
  SlashCommandFrontMatterSchema,
  SlashCommandBodySchema,
  ParsedSlashCommandSchema,
} from './slash-command.js';

export type {
  SlashTriggerKind,
  SlashOverrideStrategy,
  SlashCommandFrontMatter,
  SlashCommandBody,
  ParsedSlashCommand,
} from './slash-command.js';

// ─── Hooks ───

export {
  HookEventSchema,
  HookOutcomeSchema,
  HookProfileSchema,
  HookMatcherSchema,
  HookDefinitionSchema,
  HookPayloadSchema,
  HookResultSchema,
  HookConfigSchema,
} from './hook.js';

export type {
  HookEvent,
  HookOutcome,
  HookProfile,
  HookMatcher,
  HookDefinition,
  HookPayload,
  HookResult,
  HookConfig,
} from './hook.js';

// ─── Transition API ───

export {
  TransitionRequestSchema,
  RollbackRequestSchema,
} from './transition.js';

export type {
  TransitionRequest,
  RollbackRequest,
} from './transition.js';

// ─── CLI Output ───

export {
  CommandSuccessSchema,
  CommandErrorDetailSchema,
  CommandErrorSchema,
  InitOutputSchema,
  StatusOutputSchema,
  CheckOutputSchema,
  DoctorOutputSchema,
  ContextBriefOutputSchema,
  QuickOutputSchema,
  StageStatusOutputSchema,
  TransitionOutputSchema,
  HelpmeOutputSchema,
} from './cli-output.js';

export type {
  CommandSuccess,
  CommandErrorDetail,
  CommandError,
  InitOutput,
  StatusOutput,
  CheckOutput,
  DoctorOutput,
  ContextBriefOutput,
  QuickOutput,
  StageStatusOutput,
  TransitionOutput,
  HelpmeOutput,
} from './cli-output.js';
