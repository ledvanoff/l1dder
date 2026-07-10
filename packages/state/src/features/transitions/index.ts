/**
 * @l1dder/state/features/transitions — Phase transition pipeline.
 *
 * @packageDocumentation
 */

export { IdempotencyChecker } from './idempotency.js';
export type { IdempotencyResult } from './idempotency.js';

export { StageGuard } from './stage-guard.js';

export { GateEngine } from './gate-engine.js';

export { PhaseStatusManager } from './phase-status.js';
export type { StatusEvent } from './phase-status.js';

export { RollbackHandler } from './rollback.js';

export { TransitionPipeline } from './transition-pipeline.js';
export type {
  TransitionRequest,
  TransitionOutcome,
  TransitionPipelineError,
  TransitionPipelineDeps,
} from './transition-pipeline.js';

export { CrashRecovery } from './crash-recovery.js';
