import type { HookPayload, HookResult } from '@l1dder/schemas';
import { findSecrets, isConventionalCommit } from '@l1dder/core';
import type { HookHandlerDeps } from '../hook-handler.js';

const NO_VERIFY_PATTERN = /--no-verify\b/;
const GIT_COMMIT_PATTERN = /\bgit\s+commit\b/;

/**
 * Pre-Commit Guard handler.
 *
 * Blocks git commits that:
 * 1. Use `--no-verify` (bypass protection).
 * 2. Have secrets in the staged diff.
 * 3. Have a non-Conventional Commits message (via `-m` flag).
 *
 * Adapted from ECC `before-shell-execution-block-no-verify.js` and
 * secret-detection patterns (MIT, Affaan Mustafa).
 */
export async function preCommitGuardHandler(
  payload: HookPayload,
  deps: HookHandlerDeps,
): Promise<HookResult> {
  const cmd = payload.command ?? '';

  if (!GIT_COMMIT_PATTERN.test(cmd)) {
    return { outcome: 'allow', messages: [] };
  }

  // 1. Block --no-verify bypass.
  if (NO_VERIFY_PATTERN.test(cmd)) {
    return {
      outcome: 'block',
      messages: [
        'BLOCKED: `git commit --no-verify` is not allowed.',
        'The --no-verify flag bypasses pre-commit hooks that enforce quality and security.',
        'Fix the underlying issue instead of skipping the check.',
      ],
    };
  }

  const messages: string[] = [];

  // 2. Check staged diff for secrets.
  try {
    const diffResult = await deps.shell.exec('git diff --cached', {
      cwd: deps.projectRoot,
    });
    const findings = findSecrets(diffResult.stdout);
    if (findings.length > 0) {
      return {
        outcome: 'block',
        messages: [
          `BLOCKED: Potential secret detected in staged changes: ${findings[0]?.pattern ?? 'unknown'}.`,
          'Remove secrets from code. Use environment variables or a secrets manager instead.',
        ],
      };
    }
  } catch {
    // git not available or not a repo — skip secret check.
  }

  // 3. Check commit message format (via -m flag).
  const messageMatch = /-m\s+["']?(.+?)["']?\s*(?:--|$)/.exec(cmd);
  if (messageMatch?.[1]) {
    const commitMsg = messageMatch[1];
    if (!isConventionalCommit(commitMsg)) {
      messages.push(
        `WARN: Commit message does not follow Conventional Commits format.`,
        `Expected: <type>(scope)?: <subject>  (e.g. "feat: add hooks")`,
        `Got: "${commitMsg}"`,
      );
      return { outcome: 'warn', messages };
    }
  }

  return { outcome: 'allow', messages: [] };
}
