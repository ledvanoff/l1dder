import type { Migration } from '../migration-runner.js';

/**
 * Migration v2 → v3: Agent Session rail on `workflow.session`.
 *
 * Adds `workflow.session = null` when absent and bumps `schema_version` to 3.
 * Idempotent with respect to an already-present `session` key; does not touch
 * any other fields.
 */
export const v3Migration: Migration = {
  fromVersion: 2,
  toVersion: 3,

  migrate(state: Record<string, unknown>): Record<string, unknown> {
    const next: Record<string, unknown> = {
      ...state,
      schema_version: 3,
    };

    if (isPlainObject(state['workflow'])) {
      const workflow = state['workflow'];
      next['workflow'] = {
        ...workflow,
        session: workflow['session'] !== undefined ? workflow['session'] : null,
      };
    } else {
      next['workflow'] = { session: null };
    }

    return next;
  },
};

/** True for non-null plain objects (not arrays). */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
