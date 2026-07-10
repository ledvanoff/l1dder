import type { HookPayload, HookResult } from '@l1dder/schemas';
import { isProtectedPath, getProtectedDir } from '@l1dder/core';
import type { HookHandlerDeps } from '../hook-handler.js';

const GIT_COMMIT_PATTERN = /\bgit\s+commit\b/;

/**
 * Doc File Guard handler.
 *
 * - On PostToolUse: warns when a file in a protected directory was edited.
 * - On PreToolUse (git commit): blocks if staged changes touch protected paths.
 *
 * Protected directories: knowledge/, standards/, templates/, archive/.
 *
 * Note: Cursor has no `beforeFileEdit` event, so we can only warn after the
 * fact on PostToolUse. Blocking at commit time is our hard enforcement point.
 */
export async function docFileGuardHandler(
  payload: HookPayload,
  deps: HookHandlerDeps,
): Promise<HookResult> {
  // Warn on PostToolUse for protected file path.
  if (payload.event === 'PostToolUse') {
    const filePath = payload.filePath ?? '';
    if (!filePath || !isProtectedPath(filePath)) {
      return { outcome: 'allow', messages: [] };
    }
    const dir = getProtectedDir(filePath) ?? 'protected directory';
    return {
      outcome: 'warn',
      messages: [
        `WARN: Edited file in protected directory: ${filePath}`,
        `Changes to \`${dir}\` require explicit user confirmation per l1dder rules.`,
        'Ensure this edit was intentional and user-approved.',
      ],
    };
  }

  // Block on PreToolUse (git commit) touching protected paths.
  if (payload.event === 'PreToolUse') {
    const cmd = payload.command ?? '';
    if (!GIT_COMMIT_PATTERN.test(cmd)) {
      return { outcome: 'allow', messages: [] };
    }

    try {
      const stagedFiles = await deps.shell.exec(
        'git diff --cached --name-only',
        { cwd: deps.projectRoot },
      );
      const protected_files = stagedFiles.stdout
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f && isProtectedPath(f));

      if (protected_files.length > 0) {
        return {
          outcome: 'block',
          messages: [
            `BLOCKED: Commit touches protected directories:`,
            ...protected_files.map((f) => `  - ${f}`),
            'Ensure these changes were explicitly confirmed by the user.',
          ],
        };
      }
    } catch {
      // git not available — skip.
    }
  }

  return { outcome: 'allow', messages: [] };
}
