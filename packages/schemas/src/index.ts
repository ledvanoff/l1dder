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
  CURRENT_SCHEMA_VERSION,
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
  AgentSessionWaiverSchema,
  AgentSessionRailSchema,
  AgentSessionOutcomeSchema,
  AgentSessionRecordSchema,
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
  AgentSessionRail,
  AgentSessionWaiver,
  AgentSessionOutcome,
  AgentSessionRecord,
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

// ─── Discovery (state.yml discovery section) ───

export {
  DiscoveryMilestoneIdSchema,
  DiscoveryMilestoneStatusSchema,
  DiscoveryMilestoneSchema,
  DiscoveryWaiverSchema,
  DiscoverySchema,
} from './discovery.js';

export type {
  DiscoveryMilestoneId,
  DiscoveryMilestoneStatus,
  DiscoveryMilestone,
  DiscoveryWaiver,
  Discovery,
} from './discovery.js';

// ─── Debt / Backlog pools (registry index) ───

export {
  DebtIdSchema,
  BacklogIdSchema,
  PoolItemStatusSchema,
  DebtSeveritySchema,
  BacklogPrioritySchema,
  BacklogKindSchema,
  PoolNominationSchema,
  DebtItemSchema,
  BacklogItemSchema,
} from './debt-backlog.js';

export type {
  PoolItemStatus,
  DebtSeverity,
  BacklogPriority,
  BacklogKind,
  PoolNomination,
  DebtItem,
  BacklogItem,
} from './debt-backlog.js';

// ─── Project Registry (traceability manifest) ───

export {
  CURRENT_REGISTRY_SCHEMA_VERSION,
  FeatureIdSchema,
  UsecaseIdSchema,
  ModelIdSchema,
  EnumIdSchema,
  TestContractIdSchema,
  IntegrationIdSchema,
  DecisionIdSchema,
  SymbolIdSchema,
  IterationIdSchema,
  DeliverySessionIdSchema,
  DeliveryRailStatusSchema,
  SymbolKindSchema,
  FeatureStatusSchema,
  FeatureSourcesSchema,
  FeatureEntrySchema,
  UsecaseCoversSchema,
  UsecaseSourcesSchema,
  UsecaseEntrySchema,
  DecisionEntryStatusSchema,
  DecisionEntrySchema,
  IntegrationEntrySchema,
  ModelEntrySchema,
  EnumEntrySchema,
  TestContractEntrySchema,
  SymbolEntrySchema,
  DeliverySessionEntrySchema,
  IterationEntrySchema,
  ProjectRegistrySchema,
  projectRegistryJsonSchema,
} from './registry.js';

export type {
  FeatureId,
  UsecaseId,
  ModelId,
  EnumId,
  TestContractId,
  IntegrationId,
  DecisionId,
  SymbolId,
  IterationId,
  DeliverySessionId,
  DeliveryRailStatus,
  SymbolKind,
  FeatureStatus,
  FeatureSources,
  Feature,
  UsecaseCovers,
  UsecaseSources,
  Usecase,
  DecisionEntryStatus,
  DecisionEntry,
  Integration,
  Model,
  EnumEntry,
  TestContract,
  SymbolEntry,
  DeliverySessionEntry,
  IterationEntry,
  ProjectRegistry,
} from './registry.js';

// ─── Spec AI Contract (feature spec.md machine block) ───

export { SpecContractSchema } from './spec-contract.js';
export type { SpecContract } from './spec-contract.js';

// ─── Workflow Profile ───

export { WorkflowProfileIdSchema } from './workflow-profile.js';

export type { WorkflowProfileId } from './workflow-profile.js';

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
  SlashCommandPhaseSchema,
  SlashCommandFrontMatterSchema,
  SlashCommandBodySchema,
  ParsedSlashCommandSchema,
} from './slash-command.js';

export type {
  SlashTriggerKind,
  SlashOverrideStrategy,
  SlashCommandPhase,
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
  RegistryIssueOutputSchema,
  RegistryOutputSchema,
  ContextBriefOutputSchema,
  QuickOutputSchema,
  StageStatusOutputSchema,
  TransitionOutputSchema,
  HelpmeOutputSchema,
  DiscoveryStatusOutputSchema,
  PrimaryActionBriefSchema,
  PrimaryActionRequiredInputSchema,
  BlockerLevelSchema,
  BriefWorkflowSnapshotSchema,
} from './cli-output.js';

export type {
  CommandSuccess,
  CommandErrorDetail,
  CommandError,
  InitOutput,
  StatusOutput,
  CheckOutput,
  DoctorOutput,
  RegistryIssueOutput,
  RegistryOutput,
  ContextBriefOutput,
  QuickOutput,
  StageStatusOutput,
  TransitionOutput,
  HelpmeOutput,
  DiscoveryStatusOutput,
  PrimaryActionBrief,
  PrimaryActionRequiredInput,
  BlockerLevel,
  BriefWorkflowSnapshot,
} from './cli-output.js';
