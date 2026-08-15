import type { Migration } from '../migration-runner.js';

/**
 * Migration v1 → v2: discovery section + workflow.profile.
 *
 * Does NOT initialize the 7 discovery milestones — for an existing delivery
 * project `current: 'idea'` would be a lie; milestone initialization belongs
 * to `l1dder init`.
 */
export const v2Migration: Migration = {
  fromVersion: 1,
  toVersion: 2,

  migrate(state: Record<string, unknown>): Record<string, unknown> {
    const next: Record<string, unknown> = {
      ...state,
      schema_version: 2,
    };

    if (!isPlainObject(state['discovery'])) {
      next['discovery'] = {
        milestones: [],
        current: null,
        waivers: [],
      };
    }

    if (isPlainObject(state['workflow'])) {
      const workflow = state['workflow'];
      next['workflow'] = {
        ...workflow,
        profile: workflow['profile'] !== undefined ? workflow['profile'] : null,
      };
    } else {
      next['workflow'] = { profile: null };
    }

    return next;
  },
};

/** True for non-null plain objects (not arrays). */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
