import { join } from 'node:path';
import { StateSchema } from '@l1dder/schemas';
import { parseYaml } from '@l1dder/yaml';
import type { HookPayload, HookResult } from '@l1dder/schemas';
import type { HookHandlerDeps } from '../hook-handler.js';

const STATE_FILE = '.l1dder/state.yml';

/**
 * Session Closure Reminder handler (HARD-6 / T-15).
 *
 * Fires on the canonical `Stop` event (Cursor `stop`) when the agent loop is
 * about to end. If `workflow.session` is still active, returns a warn follow-up
 * instructing the agent to close the session properly via
 * `l1dder session end` / `l1dder handoff` and to finish with the canonical
 * `Done / Next` block pointing back to `l1dder`.
 *
 * Fail-safe: unreadable / invalid state → warn + `l1dder doctor` recommendation.
 * Never blocks (exit 2) and never fabricates a successful closure.
 *
 * Why `Stop` (not `SessionEnd`): Cursor can auto-submit `followup_message` on
 * `stop` so the agent can still act. `sessionEnd` is too late for a follow-up.
 */
export async function sessionClosureReminderHandler(
  payload: HookPayload,
  deps: HookHandlerDeps,
): Promise<HookResult> {
  const status = readRawString(payload, 'status');
  if (status === 'aborted') {
    return { outcome: 'allow', messages: [] };
  }

  try {
    const stateRaw = await deps.fs.readFile(join(deps.projectRoot, STATE_FILE));
    const parseResult = parseYaml(stateRaw, StateSchema);

    if (!parseResult.ok) {
      return doctorDegrade(
        'Could not parse `.l1dder/state.yml` — session closure status is uncertain.',
      );
    }

    const active = parseResult.value.workflow.session;
    if (active === null) {
      return { outcome: 'allow', messages: [] };
    }

    const loopCount = readRawNumber(payload, 'loop_count') ?? 0;
    if (loopCount >= 3) {
      return doctorDegrade(
        `Active Agent Session \`${active.session}\` is still open after repeated stop follow-ups.`,
      );
    }

    return {
      outcome: 'warn',
      messages: [
        [
          `Active Agent Session \`${active.session}\` (profile: ${active.profile}) is still open.`,
          'Do not end silently. Close it properly before finishing:',
          '- Completed work: `l1dder session end --outcome completed --evidence "<what was done>"` (repeat `--evidence` as needed) `--next "<next action>"`',
          '- Interrupted / handed off: `l1dder handoff` (or `l1dder session end --outcome interrupted|handed_off ...`)',
          'Then finish your reply with the canonical block:',
          'Done / Next',
          '  Done: <one-line outcome>',
          '  Next: run `l1dder` (or open `/l1dder-next`) for the next step',
        ].join('\n'),
      ],
    };
  } catch {
    return doctorDegrade(
      'Could not read `.l1dder/state.yml` — session closure status is uncertain.',
    );
  }
}

/**
 * Soft degrade path: recommend doctor, never claim success, never hard-block.
 */
function doctorDegrade(reason: string): HookResult {
  return {
    outcome: 'warn',
    messages: [
      [
        reason,
        'Do not assume the Agent Session was closed successfully.',
        'Run `l1dder doctor` (and `l1dder session status` if available) before finishing.',
        'If work is incomplete, write a handoff with `l1dder handoff`.',
      ].join('\n'),
    ],
  };
}

/** Read an optional string field from the raw IDE payload. */
function readRawString(
  payload: HookPayload,
  key: string,
): string | undefined {
  const value = payload.raw?.[key];
  return typeof value === 'string' ? value : undefined;
}

/** Read an optional number field from the raw IDE payload. */
function readRawNumber(
  payload: HookPayload,
  key: string,
): number | undefined {
  const value = payload.raw?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
