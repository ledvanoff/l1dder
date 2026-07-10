/**
 * Severity of a structural drift finding.
 *
 * `warn` — a mechanically detectable mismatch that a Hygiene session should
 * review (missing section, stale timestamp, broken cross-ref, size gap).
 * `info` — a lower-priority observation surfaced for context, not action.
 */
export type DriftLevel = 'info' | 'warn';

/**
 * A single structural drift finding produced by comparing an as-is/to-be
 * knowledge document pair (DEC-6-1: mechanical facts only, no semantic judgment).
 */
export interface DriftFinding {
  readonly level: DriftLevel;
  /** Human-readable reason, safe to surface directly in a doctor check message. */
  readonly reason: string;
  /** Path of the file the finding is about (typically the as-is file). */
  readonly file: string;
}
