/**
 * @l1dder/state — State Manager: read/write state.yml, phase transitions,
 * task tracking, quick mode, gates, knowledge updates audit.
 *
 * @packageDocumentation
 */

// ─── Facade ───

export { StateManager } from './state-manager.js';
export type {
  StateManagerDeps,
  StateManagerOptions,
  StateManagerLoadError,
} from './state-manager.js';

// ─── I/O Layer ───

export { AtomicWriter } from './io/atomic-writer.js';
export type { AtomicWriterDeps } from './io/atomic-writer.js';

export { StateReader } from './io/state-reader.js';
export type {
  StateReaderDeps,
  StateReadResult,
  ConfigReadResult,
  ReadError,
} from './io/state-reader.js';

export { StateLoader } from './io/state-loader.js';
export type {
  StateLoaderDeps,
  StateLoadResult,
  StateLoadError,
} from './io/state-loader.js';

export { StateWriter } from './io/state-writer.js';
export type { StateWriterDeps } from './io/state-writer.js';

export {
  InstallStateReader,
  InstallStateWriter,
  DEFAULT_INSTALL_STATE,
} from './io/install-state-io.js';
export type {
  InstallStateReaderDeps,
  InstallStateWriterDeps,
  InstallStateReadError,
} from './io/install-state-io.js';

export { StateInitializer } from './io/state-initializer.js';
export type {
  StateInitializerDeps,
  InitOptions,
  InitError,
} from './io/state-initializer.js';

export { createInitialState } from './io/initial-state.js';
export type { CreateInitialStateInput } from './io/initial-state.js';

// ─── Ports ───

export type {
  ApproverPort,
  GateApprovalOutcome,
  ApprovalContext,
} from './ports/approver-port.js';

export {
  NoopGateConditions,
} from './ports/gate-condition-port.js';
export type {
  GateConditionPort,
  GateConditionContext,
  GateConditionFailure,
} from './ports/gate-condition-port.js';

// ─── Adapters ───

export { SoloApprover } from './adapters/solo-approver.js';

// ─── Features: Transitions ───

export {
  TransitionPipeline,
  IdempotencyChecker,
  StageGuard,
  GateEngine,
  PhaseStatusManager,
  RollbackHandler,
  CrashRecovery,
} from './features/transitions/index.js';
export type {
  TransitionRequest,
  TransitionOutcome,
  TransitionPipelineError,
  TransitionPipelineDeps,
  IdempotencyResult,
  StatusEvent,
} from './features/transitions/index.js';

// ─── Features: Tasks ───

export {
  DependencyGraph,
  ensureDependenciesMetForComplete,
  satisfiedDependencyIds,
  TaskManager,
  parseTasksMarkdown,
  setTaskStatusInMarkdown,
  TaskSyncService,
  TaskCompletionGateCondition,
  DEFAULT_TASKS_RELATIVE_PATH,
  declaredTaskSources,
  findTaskDocuments,
} from './features/tasks/index.js';
export type {
  CompletableTaskNode,
  TaskManagerError,
  ParsedTaskRow,
  ParsedTasksDocument,
  TaskMarkdownError,
  TaskMarkdownErrorCode,
  TaskSyncError,
  TaskSyncErrorCode,
  TaskSyncOutcome,
  TaskSyncServiceDeps,
} from './features/tasks/index.js';
export {
  isValidTaskStatusTransition,
  nextValidStatuses,
} from './features/tasks/index.js';

// ─── Features: Quick/Fast Mode ───

export { QuickTaskManager } from './features/quick/index.js';
export type {
  QuickTaskError,
  DriftCheckerPort,
  DriftReport,
  DriftCheckError,
} from './features/quick/index.js';

// ─── Features: Stage ───

export {
  StageManager,
  STAGE_FORCE_DECISION_PREFIX,
  DeliveryCriteriaChecker,
  isSkeletonFile,
  recommend,
  evaluateHygieneCadence,
} from './features/stage/index.js';
export type {
  StageManagerError,
  AdvanceInfo,
  DeliveryCriteriaResult,
  CriterionResult,
  DiscoveryMilestone,
  ReadinessRecommendation,
  HygieneCadenceResult,
} from './features/stage/index.js';

// ─── Features: Discovery ───

export {
  DiscoveryOrchestrator,
  initialDiscoveryMilestone,
  initialDiscoverySlice,
  WorkflowProfileService,
} from './features/discovery/index.js';
export type {
  DiscoveryOrchestratorError,
  MilestoneBlocker,
  MilestoneBlockerCode,
  PlanMilestoneInput,
  WaiveMilestoneInput,
} from './features/discovery/index.js';

// ─── Features: Projection ───

export {
  EmptyDebtBacklogIndex,
  EmptyDeliveryRailIndex,
  EmptyReadinessEvidence,
  PRIMARY_ACTION_COMMANDS,
  PRIMARY_ACTION_REQUIRED_INPUTS,
  resolvePrimaryAction,
  WorkflowProjectionService,
} from './features/projection/index.js';
export type {
  DebtBacklogIndexPort,
  DeliveryRailIndexPort,
  DeliveryRailSession,
  GateProjection,
  MilestoneChecklistItem,
  MilestoneProjection,
  PhaseProjection,
  PlanningCandidate,
  PrimaryAction,
  PrimaryActionInput,
  PrimaryActionKind,
  PrimaryActionRequiredInput,
  ProfileProjection,
  ProgressProjection,
  ProjectionBlocker,
  ProjectionBlockerCode,
  ProjectionBlockerLevel,
  ReadinessEvidence,
  ReadinessEvidencePort,
  ReadinessGap,
  ReadinessGapCode,
  ReadinessProjection,
  RecoveryProjection,
  SessionProjection,
  StageProjection,
  WorkflowProjection,
  WorkflowProjectionDeps,
} from './features/projection/index.js';

// ─── Features: Session ───

export {
  RoadmapRailGuard,
  nextEligibleSession,
  SessionService,
} from './features/session/index.js';
export type {
  RailGuardAllow,
  RailGuardError,
  RailGuardErrorCode,
  SessionEndError,
  SessionEndEvidenceRequiredError,
  SessionEndInput,
  SessionEndResult,
  SessionForceRequiredError,
  SessionNotActiveError,
  SessionServiceDeps,
  SessionServiceError,
  SessionStartForceOptions,
} from './features/session/index.js';

// ─── Migration ───

export { MigrationRunner } from './migration/migration-runner.js';
export type { Migration } from './migration/migration-runner.js';

export {
  ALL_MIGRATIONS,
  v1Migration,
  v2Migration,
  v3Migration,
  v4Migration,
} from './migration/migrations/index.js';
