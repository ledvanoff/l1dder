import type { Result } from '@l1dder/core';
import type { QuickTask } from '@l1dder/schemas';

/**
 * Report produced by drift detection: whether quick/fast task changes
 * diverge from to-be knowledge.
 */
export interface DriftReport {
  readonly hasDrift: boolean;
  readonly affectedFiles: readonly string[];
  readonly summary: string;
}

/**
 * Error from drift checking (e.g., file read failure).
 */
export interface DriftCheckError {
  readonly code: 'DRIFT_CHECK_ERROR';
  readonly message: string;
}

/**
 * Port for checking knowledge drift after quick/fast task completion.
 *
 * Implementation deferred to Iteration 4 (CLI layer with @l1dder/knowledge).
 * In MVP, this port is optional — if not provided, drift check is skipped.
 */
export interface DriftCheckerPort {
  checkDrift(
    quickTask: QuickTask,
    toBeKnowledgePath: string,
  ): Promise<Result<DriftReport, DriftCheckError>>;
}
