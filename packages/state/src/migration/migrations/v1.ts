import type { Migration } from '../migration-runner.js';

/**
 * Identity migration v0 → v1 (baseline).
 *
 * Handles the case when state.yml has no `schema_version` field (treated as v0).
 * Sets `schema_version: 1` without modifying anything else.
 */
export const v1Migration: Migration = {
  fromVersion: 0,
  toVersion: 1,

  migrate(state: Record<string, unknown>): Record<string, unknown> {
    return {
      ...state,
      schema_version: 1,
    };
  },
};
