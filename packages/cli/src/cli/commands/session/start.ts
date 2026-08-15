import { WorkflowProfileIdSchema } from '@l1dder/schemas';
import type { WorkflowProfileId } from '@l1dder/schemas';
import { nextEligibleSession } from '@l1dder/state';

import type { CliContext } from '../../context.js';
import { ExitCode } from '../../output/exit-codes.js';
import { sessionErrorResult } from './errors.js';
import type { SessionOptions, SessionResult } from './session.js';

const PROFILE_HINT =
  'Valid: product_discovery, feature_discovery, delivery, hygiene';

/**
 * Execute `l1dder session start <SESSION-ID>`.
 *
 * Calls {@link import('@l1dder/state').StateManager.session.start}. When rails
 * are unknown, `--profile` is required. When the session is on the rails, the
 * rail profile wins and `--profile` is only a fallback.
 *
 * @param ctx - CLI context
 * @param sessionId - Session id argument
 * @param opts - Flags (`--profile`, `--force`, `--reason`)
 */
export async function executeSessionStart(
  ctx: CliContext,
  sessionId: string | undefined,
  opts: SessionOptions,
): Promise<SessionResult> {
  if (!sessionId || sessionId.trim().length === 0) {
    return {
      exitCode: ExitCode.USAGE_ERROR,
      error: {
        code: 'USAGE_ERROR',
        message: '<session-id> is required',
        hint: 'Usage: l1dder session start HARD-5 --profile delivery',
      },
    };
  }

  const id = sessionId.trim();

  let sm;
  try {
    sm = await ctx.state();
  } catch (error: unknown) {
    return sessionErrorResult(error);
  }

  const index = ctx.deliveryRails();
  const rails = await index.load();
  const railsDiagnostic = index.lastLoadDiagnostic();
  const matched = rails.find((entry) => entry.session === id);
  const railsUnknown = rails.length === 0;
  const force = opts.force === true;
  const reason = opts.reason?.trim() ?? '';
  if (force && reason.length === 0) {
    return sessionErrorResult({
      code: 'SESSION_FORCE_REASON_REQUIRED',
      message: 'Forced session start requires a non-empty --reason',
    });
  }

  const profileResult = resolveProfile({
    flag: opts.profile,
    railProfile: matched?.profile,
    railsUnknown,
    railsUnloadable: railsDiagnostic.kind === 'manifest_unloadable',
    force,
  });
  if (!profileResult.ok) {
    return profileResult.result;
  }

  const started = await sm.session.start(
    id,
    profileResult.profile,
    force ? { force: true, reason } : undefined,
  );

  if (!started.ok) {
    const hint = enrichSessionHint(started.error, rails);
    const base = sessionErrorResult(started.error);
    if (base.error === undefined) {
      return base;
    }
    return {
      exitCode: base.exitCode,
      error: {
        ...base.error,
        ...(hint !== undefined ? { hint } : {}),
      },
    };
  }

  const session = sm.stateSnapshot().workflow.session;
  const data = {
    action: 'start' as const,
    session: session
      ? {
          id: session.session,
          iteration: session.iteration,
          profile: session.profile,
          started_at: session.started_at,
          waiver: session.waiver,
        }
      : null,
  };

  const humanText = [
    '',
    `Session started: ${id}`,
    `  Iteration: ${session?.iteration ?? '(not tracked on delivery rails yet)'}`,
    `  Profile: ${session?.profile ?? profileResult.profile}`,
    session?.waiver
      ? `  Waiver: ${session.waiver.reason}`
      : '  Waiver: none',
    '',
  ].join('\n');

  return { exitCode: ExitCode.SUCCESS, data, humanText };
}

function resolveProfile(input: {
  readonly flag: string | undefined;
  readonly railProfile: WorkflowProfileId | undefined;
  readonly railsUnknown: boolean;
  readonly railsUnloadable: boolean;
  readonly force: boolean;
}):
  | { ok: true; profile: WorkflowProfileId }
  | { ok: false; result: SessionResult } {
  // On-rail profile always wins when present.
  if (input.railProfile !== undefined) {
    return { ok: true, profile: input.railProfile };
  }

  const raw = input.flag?.trim();
  if (raw) {
    const parsed = WorkflowProfileIdSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        result: {
          exitCode: ExitCode.USAGE_ERROR,
          error: {
            code: 'USAGE_ERROR',
            message: `Invalid profile: "${raw}"`,
            hint: PROFILE_HINT,
          },
        },
      };
    }
    return { ok: true, profile: parsed.data };
  }

  // Profile cannot be derived when rails are unknown, or when force-starting
  // an off-rail id (fallback profile is required for the recorded rail).
  if (input.railsUnknown || input.force) {
    let message =
      '--profile is required when force-starting a session that is not on the rails';
    let hint: string | undefined = PROFILE_HINT;
    if (input.railsUnknown) {
      if (input.railsUnloadable) {
        message =
          '--profile is required because Delivery Plan rails could not be loaded from knowledge/project-registry.yml';
        hint =
          'Run `l1dder registry check` to inspect the manifest, or pass --profile explicitly.';
      } else {
        message =
          '--profile is required when Delivery Plan rails are not in the registry yet';
      }
    }
    return {
      ok: false,
      result: {
        exitCode: ExitCode.USAGE_ERROR,
        error: {
          code: 'USAGE_ERROR',
          message,
          hint,
        },
      },
    };
  }

  // Off-road without --force: pass a placeholder so the domain guard can
  // reject with SESSION_OFF_ROAD (profile is unused on that path).
  return { ok: true, profile: 'delivery' };
}

/**
 * Enrich guard rejection hints with blocking ids / next eligible session.
 */
function enrichSessionHint(
  error: { code: string; message: string; blockingIds?: readonly string[] },
  rails: Parameters<typeof nextEligibleSession>[0],
): string | undefined {
  if (error.code === 'SESSION_DEPENDENCY_UNMET') {
    const blocking = error.blockingIds?.join(', ');
    return blocking !== undefined && blocking.length > 0
      ? `Close blocking sessions first: ${blocking}. Or bypass with --force --reason "...".`
      : undefined;
  }
  if (error.code === 'SESSION_OFF_ROAD') {
    const next = nextEligibleSession(rails);
    return next !== null
      ? `Next eligible session is ${next.session}. Or bypass with --force --reason "...".`
      : 'Start a session that appears on the delivery rails, or bypass with --force --reason "...".';
  }
  return undefined;
}
