/**
 * Conventional Commits format checker.
 *
 * Validates commit message subjects against the Conventional Commits spec:
 * https://www.conventionalcommits.org/en/v1.0.0/
 */

/**
 * Conventional Commits regex.
 *
 * Format: `type(scope)?: subject`
 * - type: feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert
 * - scope: optional parenthesised string
 * - !: optional breaking change indicator
 * - subject: non-empty string
 */
const CONVENTIONAL_COMMIT_REGEX =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([^()]+\))?!?: .+/;

/**
 * Check whether a commit message follows the Conventional Commits format.
 *
 * Only the subject line (first line) is validated.
 * This function is pure — no I/O, no side-effects.
 */
export function isConventionalCommit(message: string): boolean {
  const subject = message.split('\n')[0]?.trim() ?? '';
  return CONVENTIONAL_COMMIT_REGEX.test(subject);
}
