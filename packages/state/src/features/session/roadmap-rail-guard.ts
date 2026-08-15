import { err, ok } from '@l1dder/core';
import type { Result } from '@l1dder/core';

import type { DeliveryRailSession } from '../projection/delivery-rail-index-port.js';

/** Stable error codes from {@link RoadmapRailGuard}. */
export type RailGuardErrorCode =
  | 'SESSION_OFF_ROAD'
  | 'SESSION_ALREADY_CLOSED'
  | 'SESSION_DEPENDENCY_UNMET';

/**
 * Structured rejection from the roadmap rail guard.
 *
 * Callers branch on {@link RailGuardError.code}.
 */
export interface RailGuardError {
  readonly code: RailGuardErrorCode;
  readonly message: string;
  readonly blockingIds?: readonly string[];
}

/**
 * Successful guard outcome.
 *
 * When the rail index is empty (manifest not backfilled yet), {@link railsUnknown}
 * is `true` and {@link session} is `null`. Callers MUST allow the start in that
 * case — an empty index must not brick the CLI (T-17 backfill lands later).
 */
export interface RailGuardAllow {
  readonly session: DeliveryRailSession | null;
  readonly railsUnknown: boolean;
}

const CLOSED: ReadonlySet<DeliveryRailSession['status']> = new Set([
  'done',
  'skipped',
]);

/**
 * Validates that a requested Agent Session id is on the delivery rails and
 * eligible to start.
 */
export class RoadmapRailGuard {
  /**
   * Check whether `sessionId` may be started against `rails`.
   *
   * Empty `rails` → ok with `railsUnknown: true` (do not block).
   *
   * @param sessionId - Requested session id (e.g. `HARD-5`)
   * @param rails - Flattened delivery rail sessions in declaration order
   */
  check(
    sessionId: string,
    rails: readonly DeliveryRailSession[],
  ): Result<RailGuardAllow, RailGuardError> {
    if (rails.length === 0) {
      return ok({ session: null, railsUnknown: true });
    }

    const match = rails.find((entry) => entry.session === sessionId);
    if (match === undefined) {
      return err({
        code: 'SESSION_OFF_ROAD',
        message: `Session "${sessionId}" is not on the delivery rails`,
      });
    }

    if (CLOSED.has(match.status)) {
      return err({
        code: 'SESSION_ALREADY_CLOSED',
        message: `Session "${sessionId}" is already ${match.status}`,
      });
    }

    const byId = new Map(rails.map((entry) => [entry.session, entry] as const));
    const blocking = match.dependsOn.filter((depId) => {
      const dep = byId.get(depId);
      return dep === undefined || !CLOSED.has(dep.status);
    });

    if (blocking.length > 0) {
      return err({
        code: 'SESSION_DEPENDENCY_UNMET',
        message: `Session "${sessionId}" has unmet dependencies: ${blocking.join(', ')}`,
        blockingIds: blocking,
      });
    }

    return ok({ session: match, railsUnknown: false });
  }
}

/**
 * First session in declaration order that is `pending` and whose dependencies
 * are all `done`/`skipped`.
 *
 * @param rails - Flattened delivery rail sessions
 * @returns The next eligible session, or `null` when none
 */
export function nextEligibleSession(
  rails: readonly DeliveryRailSession[],
): DeliveryRailSession | null {
  const byId = new Map(rails.map((entry) => [entry.session, entry] as const));

  for (const entry of rails) {
    if (entry.status !== 'pending') continue;
    const unmet = entry.dependsOn.some((depId) => {
      const dep = byId.get(depId);
      return dep === undefined || !CLOSED.has(dep.status);
    });
    if (!unmet) {
      return entry;
    }
  }

  return null;
}
