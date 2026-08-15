import { join } from 'node:path';
import { HANDOFF_RELATIVE_PATH } from '@l1dder/context';
import type { HookPayload, HookResult } from '@l1dder/schemas';
import type { HookHandlerDeps } from '../hook-handler.js';

const DEFAULT_MAX_CHARS = 8000;

/**
 * Session Start Bounded Context handler (E3).
 *
 * Triggered on `SessionStart` canonical event. Reads `.l1dder/handoff.md`,
 * truncates it to `sessionStartMaxChars`, and writes the result to stdout
 * for Cursor context injection.
 *
 * Always returns `allow` — never blocks session start.
 *
 * Note (OQ-1): The exact Cursor mechanism for context injection on sessionStart
 * (stdout vs special field) is confirmed via ECC reference: stdout content is
 * read by Cursor and injected into the initial system context.
 */
export async function sessionStartBoundedContextHandler(
  _payload: HookPayload,
  deps: HookHandlerDeps,
): Promise<HookResult> {
  const maxChars = deps.sessionStartMaxChars ?? DEFAULT_MAX_CHARS;

  try {
    const handoffPath = join(deps.projectRoot, HANDOFF_RELATIVE_PATH);
    const exists = await deps.fs.exists(handoffPath);

    if (!exists) {
      return { outcome: 'allow', messages: [] };
    }

    const content = await deps.fs.readFile(handoffPath);
    const bounded = maxChars > 0 && content.length > maxChars
      ? content.slice(0, maxChars)
      : content;

    process.stdout.write(bounded);
  } catch {
    // Non-critical — don't block session start on read errors.
  }

  return { outcome: 'allow', messages: [] };
}
