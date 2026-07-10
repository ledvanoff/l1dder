import type { HookDefinition } from '@l1dder/schemas';

/**
 * Built-in hook definitions for L1DDER.
 *
 * 6 hooks covering security enforcement (pre-commit-guard),
 * doc protection (doc-file-guard), code quality (format-after-edit),
 * context management (strategic-compact-reminder), and E3 handoff
 * automation (precompact-handoff-save, session-start-bounded-context).
 */
const BUILTIN_HOOKS: readonly HookDefinition[] = [
  {
    id: 'pre-commit-guard',
    name: 'Pre-Commit Guard',
    format_version: 1,
    event: 'PreToolUse',
    description:
      'Blocks git commits that contain secrets, fail lint, or violate Conventional Commits format. Also blocks --no-verify bypass.',
    matcher: { commandPattern: 'git commit' },
    profiles: ['minimal', 'standard', 'strict'],
    outcome_level: 'block',
    builtin: true,
  },
  {
    id: 'doc-file-guard',
    name: 'Doc File Guard',
    format_version: 1,
    event: 'PostToolUse',
    description:
      'Warns when protected directories (knowledge/, standards/, templates/, archive/) are edited. Blocks commits touching protected paths.',
    matcher: { pathGlobs: ['knowledge/**', 'standards/**', 'templates/**', 'archive/**'] },
    profiles: ['standard', 'strict'],
    outcome_level: 'warn',
    builtin: true,
  },
  {
    id: 'format-after-edit',
    name: 'Format After Edit',
    format_version: 1,
    event: 'PostToolUse',
    description:
      'Reminds to run prettier/tsc after editing TypeScript or Markdown files.',
    matcher: { pathGlobs: ['**/*.ts', '**/*.md'] },
    profiles: ['standard', 'strict'],
    outcome_level: 'warn',
    builtin: true,
  },
  {
    id: 'strategic-compact-reminder',
    name: 'Strategic Compact Reminder',
    format_version: 1,
    event: 'UserPromptSubmit',
    description:
      'Reminds to consider handoff/compaction when tool-call count crosses the configured threshold.',
    profiles: ['strict'],
    outcome_level: 'warn',
    builtin: true,
  },
  {
    id: 'precompact-handoff-save',
    name: 'PreCompact Handoff Save (E3)',
    format_version: 1,
    event: 'PreCompact',
    description:
      'Automatically generates .l1dder/handoff.md before context compaction so no progress is lost.',
    profiles: ['minimal', 'standard', 'strict'],
    outcome_level: 'allow',
    builtin: true,
  },
  {
    id: 'session-start-bounded-context',
    name: 'Session Start Bounded Context (E3)',
    format_version: 1,
    event: 'SessionStart',
    description:
      'Loads .l1dder/handoff.md at session start, truncated to session_start_max_chars, to bootstrap AI context.',
    profiles: ['minimal', 'standard', 'strict'],
    outcome_level: 'allow',
    builtin: true,
  },
] as const;

/**
 * Returns all built-in L1DDER hook definitions.
 */
export function getBuiltinHooks(): readonly HookDefinition[] {
  return BUILTIN_HOOKS;
}
