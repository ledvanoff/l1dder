import type { PhaseHistoryEntry } from '@l1dder/schemas';

/**
 * Result of evaluating the maintenance-stage Hygiene cadence advisory (OQ-PS-1, DEC-6-5).
 */
export interface HygieneCadenceResult {
  /** True when the cadence window has elapsed since the last completed Hygiene session. */
  readonly overdue: boolean;
  /** Days since the last Hygiene session, or `null` if none has ever run. */
  readonly daysSinceLastHygiene: number | null;
  readonly cadenceDays: number;
}

/**
 * Evaluate whether a Hygiene session is overdue in the `maintenance` project stage
 * (DEC-6-5 — closes OQ-PS-1).
 *
 * Heuristic: the most recent `phase_history` entry with `phase === "hygiene"`
 * (using `completed_at` if present, else `started_at`) is compared against `nowIso`.
 * If no Hygiene session has ever run, the cadence is immediately considered overdue
 * (there is nothing to measure against). A `cadenceDays` of `0` disables the advisory
 * entirely (`overdue` is always `false`).
 *
 * Pure function — no I/O; the caller supplies `phaseHistory` and the current time.
 */
export function evaluateHygieneCadence(
  phaseHistory: readonly PhaseHistoryEntry[],
  cadenceDays: number,
  nowIso: string,
): HygieneCadenceResult {
  if (cadenceDays <= 0) {
    return { overdue: false, daysSinceLastHygiene: null, cadenceDays };
  }

  const hygieneTimestamps = phaseHistory
    .filter((entry) => entry.phase === 'hygiene')
    .map((entry) => entry.completed_at ?? entry.started_at)
    .sort();

  const lastHygieneIso = hygieneTimestamps.at(-1);
  if (lastHygieneIso === undefined) {
    return { overdue: true, daysSinceLastHygiene: null, cadenceDays };
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysSinceLastHygiene = Math.floor(
    (new Date(nowIso).getTime() - new Date(lastHygieneIso).getTime()) / msPerDay,
  );

  return {
    overdue: daysSinceLastHygiene >= cadenceDays,
    daysSinceLastHygiene,
    cadenceDays,
  };
}
