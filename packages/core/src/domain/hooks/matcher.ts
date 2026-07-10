import type { HookMatcher, HookPayload } from '@l1dder/schemas';

/**
 * Evaluate whether a hook matcher matches the given payload.
 *
 * Matching rules (all criteria must pass, AND semantics):
 * - Absent/empty matcher: always matches (catch-all).
 * - tool: exact string match against payload.command (unused in MVP but reserved).
 * - pathGlobs: at least one glob matches payload.filePath.
 * - commandPattern: payload.command contains the pattern as substring (case-insensitive).
 *
 * This function is pure — no I/O, no side-effects.
 */
export function matchesHook(
  matcher: HookMatcher | undefined,
  payload: Partial<Pick<HookPayload, 'command' | 'filePath'>>,
): boolean {
  if (!matcher) return true;

  const { tool, pathGlobs, commandPattern } = matcher;

  // tool match: reserved for future IDE-tool-level matching.
  if (tool !== undefined) {
    // In MVP we don't receive an explicit tool name in the payload —
    // treat as a no-match if tool is specified but we can't verify.
    // This prevents false positives.
    if (!payload.command?.includes(tool)) return false;
  }

  if (pathGlobs !== undefined && pathGlobs.length > 0) {
    const filePath = payload.filePath ?? '';
    if (!pathGlobs.some((glob) => matchGlob(glob, filePath))) return false;
  }

  if (commandPattern !== undefined) {
    const cmd = payload.command ?? '';
    if (!cmd.toLowerCase().includes(commandPattern.toLowerCase())) return false;
  }

  return true;
}

// ─── Glob matching ────────────────────────────────────────────────────────────

/**
 * Minimal glob matcher supporting `*` (segment wildcard) and `**` (path wildcard).
 *
 * We avoid pulling in a full glob library to keep the core package dependency-free.
 * Supports patterns like `knowledge/**`, `**\/*.ts`, `**\/*.md`.
 */
export function matchGlob(glob: string, filePath: string): boolean {
  // Normalise separators.
  const normalGlob = glob.replace(/\\/g, '/');
  const normalPath = filePath.replace(/\\/g, '/');

  // Convert glob to regex.
  const regex = globToRegex(normalGlob);
  return regex.test(normalPath);
}

/**
 * Convert a glob pattern to a RegExp.
 *
 * Processes the glob character by character to avoid multi-step interference.
 * Double-star-slash becomes an optional path prefix; double-star becomes any chars;
 * single-star becomes non-slash wildcard; other chars are regex-escaped.
 */
function globToRegex(glob: string): RegExp {
  let i = 0;
  let pattern = '';

  while (i < glob.length) {
    const ch = glob[i] ?? '';

    if (ch === '*' && glob[i + 1] === '*') {
      if (glob[i + 2] === '/') {
        // **/ - optional path prefix (zero or more directory levels)
        pattern += '(?:.*/)?';
        i += 3;
      } else {
        // ** at end - match any characters including /
        pattern += '.*';
        i += 2;
      }
    } else if (ch === '*') {
      // Single * - any characters except /
      pattern += '[^/]*';
      i += 1;
    } else {
      // Regular char — escape if it has special regex meaning.
      if (/[.+^${}()|[\]\\]/.test(ch)) {
        pattern += `\\${ch}`;
      } else {
        pattern += ch;
      }
      i += 1;
    }
  }

  return new RegExp(`^${pattern}$`);
}
