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

// ─── Ports ───

export type {
  ApproverPort,
  GateApprovalOutcome,
  ApprovalContext,
} from './ports/approver-port.js';

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

export { DependencyGraph, TaskManager } from './features/tasks/index.js';
export type { TaskManagerError } from './features/tasks/index.js';
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

// ─── Migration ───

export { MigrationRunner } from './migration/migration-runner.js';
export type { Migration } from './migration/migration-runner.js';
