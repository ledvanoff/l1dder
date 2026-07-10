/**
 * @l1dder/state/features/tasks — Task management with dependency tracking.
 *
 * @packageDocumentation
 */

export { DependencyGraph } from './dependency-graph.js';
export { TaskManager } from './task-manager.js';
export type { TaskManagerError } from './task-manager.js';
export {
  isValidTaskStatusTransition,
  nextValidStatuses,
} from './task-status.js';
