import type { Migration } from '../migration-runner.js';

/**
 * Migration v3 → v4: append-only Agent Session history on `workflow.session_history`.
 *
 * Adds `workflow.session_history = []` when absent and bumps `schema_version` to 4.
 * Idempotent with respect to an already-present `session_history` key; does not
 * touch any other fields.
 */
export const v4Migration: Migration = {
  fromVersion: 3,
  toVersion: 4,

  migrate(state: Record<string, unknown>): Record<string, unknown> {
    const next: Record<string, unknown> = {
      ...state,
      schema_version: 4,
    };

    if (isPlainObject(state['workflow'])) {
      const workflow = state['workflow'];
      next['workflow'] = {
        ...workflow,
        session_history:
          workflow['session_history'] !== undefined
            ? workflow['session_history']
            : [],
      };
    } else {
      next['workflow'] = { session_history: [] };
    }

    return next;
  },
};

/** True for non-null plain objects (not arrays). */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
