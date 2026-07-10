/**
 * Role overlay definitions (CE3).
 *
 * Modifies base profile by promoting files from SUMMARY→FULL
 * or demoting from FULL→SUMMARY based on the active role.
 */

/** Role overlay — promote/demote lists of path patterns. */
export interface RoleOverlay {
  /** File path patterns to promote from SUMMARY → FULL. */
  readonly promote: readonly string[];
  /** File path patterns to demote from FULL → SUMMARY. */
  readonly demote: readonly string[];
}

/**
 * ROLE_OVERLAYS: 6 core roles with their context focus adjustments.
 *
 * Patterns use glob-like '*' to match any subfolder (to-be/ or as-is/).
 * Applied after base profile resolution.
 */
export const ROLE_OVERLAYS: Readonly<Record<string, RoleOverlay>> = {
  architect: {
    promote: [
      'knowledge/*/architecture.md',
      'knowledge/*/erd.md',
      'knowledge/*/integrations.md',
    ],
    demote: ['knowledge/*/usecases.md'],
  },

  developer: {
    promote: [
      'knowledge/*/architecture.md',
      'knowledge/*/erd.md',
      'standards/conventions.md',
    ],
    demote: ['knowledge/*/usecases.md', 'knowledge/idea.md'],
  },

  po: {
    promote: ['knowledge/idea.md', 'knowledge/*/usecases.md'],
    demote: ['knowledge/*/erd.md', 'knowledge/*/integrations.md'],
  },

  analyst: {
    promote: ['knowledge/*/usecases.md', 'knowledge/*/integrations.md'],
    demote: ['knowledge/*/erd.md'],
  },

  qa: {
    promote: ['knowledge/*/usecases.md', 'standards/conventions.md'],
    demote: ['knowledge/*/erd.md', 'knowledge/*/integrations.md'],
  },

  designer: {
    promote: ['knowledge/*/usecases.md', 'knowledge/idea.md'],
    demote: [
      'knowledge/*/erd.md',
      'knowledge/*/integrations.md',
      'knowledge/*/architecture.md',
    ],
  },
};

/**
 * Check if a file path matches a glob-like pattern with '*' wildcard.
 *
 * '*' matches any single path segment (not including '/').
 */
export function matchesPattern(path: string, pattern: string): boolean {
  const regex = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '[^/]+');
  return new RegExp(`^${regex}$`).test(path);
}
