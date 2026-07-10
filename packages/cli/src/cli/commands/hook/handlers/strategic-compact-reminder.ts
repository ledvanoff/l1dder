import type { HookPayload, HookResult } from '@l1dder/schemas';
import { join } from 'node:path';
import type { HookHandlerDeps } from '../hook-handler.js';

/** Default threshold of tool-calls before reminding about compaction. */
const DEFAULT_COMPACT_THRESHOLD = 30;

/** Counter state persisted per conversation. */
interface CounterState {
  count: number;
  lastWarned: number;
}

/**
 * Strategic Compact Reminder handler (strict profile only).
 *
 * Tracks tool-call count per conversation in an ephemeral state file
 * at `.l1dder/hooks-state/<conversationId>.json`. Emits a warn reminder
 * every `DEFAULT_COMPACT_THRESHOLD` calls suggesting the user consider
 * a handoff/compact before the context window fills up.
 *
 * The counter file is ephemeral — it is cleaned up on SessionEnd (EH-2).
 */
export async function strategicCompactReminderHandler(
  payload: HookPayload,
  deps: HookHandlerDeps,
): Promise<HookResult> {
  const conversationId = payload.conversationId ?? 'default';
  const stateDir = join(deps.projectRoot, '.l1dder', 'hooks-state');
  const stateFile = join(stateDir, `${conversationId}.json`);

  let state: CounterState = { count: 0, lastWarned: 0 };

  try {
    const raw = await deps.fs.readFile(stateFile);
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'count' in parsed &&
      typeof (parsed as CounterState).count === 'number'
    ) {
      state = parsed as CounterState;
    }
  } catch {
    // File doesn't exist yet — start fresh.
  }

  state = { ...state, count: state.count + 1 };

  const threshold = DEFAULT_COMPACT_THRESHOLD;
  const shouldWarn =
    state.count >= threshold &&
    state.count - state.lastWarned >= threshold;

  if (shouldWarn) {
    state = { ...state, lastWarned: state.count };
  }

  // Persist updated counter.
  try {
    await deps.fs.mkdir(stateDir);
    await deps.fs.writeFile(stateFile, JSON.stringify(state, null, 2));
  } catch {
    // Non-critical — don't break the hook on write failure.
  }

  if (shouldWarn) {
    return {
      outcome: 'warn',
      messages: [
        `WARN: You've submitted ~${String(state.count)} prompts in this session.`,
        'Consider running a handoff to preserve progress before context compaction.',
        'Use: `l1dder context --full` or ask the agent to generate a handoff.',
      ],
    };
  }

  return { outcome: 'allow', messages: [] };
}
