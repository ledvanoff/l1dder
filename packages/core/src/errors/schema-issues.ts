/**
 * Safe, human-readable views of Zod (or Zod-like) schema validation issues.
 *
 * Only exposes `path` and `message` (and optional `code`) — never raw received
 * values — so CLI/doctor output cannot leak secrets from YAML contents.
 */

/** Single schema issue surfaced to humans and JSON consumers. */
export interface SchemaIssueDetail {
  readonly path: string;
  readonly message: string;
  readonly code?: string;
}

/**
 * Convert unknown schema issues into safe `{ path, message, code? }` details.
 *
 * Accepts Zod issue objects (`path` array + `message`) and already-normalized
 * details. Unknown shapes become a generic message without a path.
 */
export function toSchemaIssueDetails(
  issues: readonly unknown[],
): SchemaIssueDetail[] {
  return issues.map((issue) => normalizeIssue(issue));
}

/**
 * Format schema issues as `"path: message; …"` for error messages and doctor.
 */
export function formatSchemaIssues(issues: readonly unknown[]): string {
  const details = toSchemaIssueDetails(issues);
  if (details.length === 0) {
    return '0 issues';
  }
  return details
    .map((d) => (d.path.length > 0 ? `${d.path}: ${d.message}` : d.message))
    .join('; ');
}

function normalizeIssue(issue: unknown): SchemaIssueDetail {
  if (!issue || typeof issue !== 'object') {
    return { path: '', message: String(issue) };
  }

  const record = issue as {
    path?: unknown;
    message?: unknown;
    code?: unknown;
  };

  const path = formatIssuePath(record.path);
  const message =
    typeof record.message === 'string' && record.message.length > 0
      ? record.message
      : 'Invalid value';
  const code = typeof record.code === 'string' ? record.code : undefined;

  return code !== undefined ? { path, message, code } : { path, message };
}

function formatIssuePath(path: unknown): string {
  if (!Array.isArray(path)) {
    if (typeof path === 'string') return path;
    return '';
  }
  return path.map(String).join('.');
}
