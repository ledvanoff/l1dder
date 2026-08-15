/**
 * @l1dder/state/features/tasks — Task management with dependency tracking.
 *
 * @packageDocumentation
 */

export {
  DependencyGraph,
  ensureDependenciesMetForComplete,
  satisfiedDependencyIds,
} from './dependency-graph.js';
export type { CompletableTaskNode } from './dependency-graph.js';
export { TaskManager } from './task-manager.js';
export type { TaskManagerError } from './task-manager.js';
export {
  isValidTaskStatusTransition,
  nextValidStatuses,
} from './task-status.js';

export {
  parseTasksMarkdown,
  setTaskStatusInMarkdown,
} from './task-markdown.js';
export type {
  ParsedTaskRow,
  ParsedTasksDocument,
  TaskMarkdownError,
  TaskMarkdownErrorCode,
} from './task-markdown.js';

export { TaskSyncService } from './task-sync-service.js';
export type {
  TaskSyncError,
  TaskSyncErrorCode,
  TaskSyncOutcome,
  TaskSyncServiceDeps,
} from './task-sync-service.js';

export { TaskCompletionGateCondition } from './task-completion-gate-condition.js';

export {
  DEFAULT_TASKS_RELATIVE_PATH,
  declaredTaskSources,
  findTaskDocuments,
} from './tasks-source.js';
