import type { TaskStatus } from '@l1dder/schemas';

/**
 * Valid task status transitions.
 *
 * - pending → in_progress (start)
 * - in_progress → done (complete)
 * - pending → skipped (skip before starting)
 * - in_progress → skipped (skip while in progress)
 */
const VALID_TRANSITIONS: ReadonlyMap<TaskStatus, readonly TaskStatus[]> =
  new Map([
    ['pending', ['in_progress', 'skipped']],
    ['in_progress', ['done', 'skipped']],
    ['done', []],
    ['skipped', []],
  ]);

/**
 * Check whether transitioning from one task status to another is valid.
 */
export function isValidTaskStatusTransition(
  from: TaskStatus,
  to: TaskStatus,
): boolean {
  const allowed = VALID_TRANSITIONS.get(from);
  return allowed !== undefined && allowed.includes(to);
}

/**
 * List valid next statuses from the current one.
 */
export function nextValidStatuses(
  current: TaskStatus,
): readonly TaskStatus[] {
  return VALID_TRANSITIONS.get(current) ?? [];
}
