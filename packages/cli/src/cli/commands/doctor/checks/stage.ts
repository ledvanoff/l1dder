import type { FileSystemPort } from '@l1dder/core';
import type { State, Config } from '@l1dder/schemas';
import { DeliveryCriteriaChecker, evaluateHygieneCadence, recommend } from '@l1dder/state';
import type { DoctorCheck } from '../types.js';

/**
 * Project stage health checks: validates stage/workflow consistency and
 * checks semantic delivery readiness criteria via FileSystemPort.
 *
 * `now` (ISO datetime) drives the `maintenance`-stage Hygiene cadence advisory
 * (DEC-6-5, closes OQ-PS-1) — optional for back-compat callers that only need
 * the pre-existing checks.
 */
export async function checkStage(
  state: State,
  config: Config,
  fs: FileSystemPort,
  projectRoot: string,
  now?: string,
): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];
  const stage = state.project.stage;

  // Stage is valid
  const validStages = ['discovery', 'delivery', 'maintenance'];
  if (validStages.includes(stage)) {
    checks.push({ id: 'stage-valid', level: 'pass', message: `Project stage: ${stage}` });
  } else {
    checks.push({
      id: 'stage-valid',
      level: 'fail',
      message: `Invalid project stage: "${stage}"`,
    });
  }

  // Stage history consistency
  const history = state.project.stage_history;
  if (history.length > 0) {
    const lastEntry = history[history.length - 1];
    if (lastEntry && lastEntry.to !== stage) {
      checks.push({
        id: 'stage-history-sync',
        level: 'warn',
        message: `Stage history last entry (→${lastEntry.to}) differs from current stage (${stage})`,
        hint: 'Stage may have been modified without proper transition',
      });
    } else {
      checks.push({ id: 'stage-history-sync', level: 'pass', message: 'Stage history consistent with current stage' });
    }
  } else {
    checks.push({ id: 'stage-history-sync', level: 'pass', message: 'No stage history (initial stage)' });
  }

  // Advisory: discovery stage but implement phase
  if (stage === 'discovery') {
    const deliveryPhases = ['implement', 'update_asis', 'tasks'];
    if (deliveryPhases.includes(state.workflow.current_phase)) {
      checks.push({
        id: 'stage-phase-advisory',
        level: 'warn',
        message: `Phase "${state.workflow.current_phase}" is typically used in delivery stage`,
        hint: "Consider 'l1dder stage advance' if ready for delivery",
      });
    }

    // Semantic delivery readiness check (discovery only)
    const checker = new DeliveryCriteriaChecker();
    const criteria = await checker.evaluate(fs, projectRoot, config);
    const rec = recommend(criteria);

    const level = rec.ready ? 'pass' : 'warn';
    const message = rec.ready
      ? `Discovery readiness: READY (${rec.score}) — all milestones complete`
      : `Discovery readiness: NOT READY (${rec.score}) — ${rec.gaps.slice(0, 2).join(', ')}${rec.gaps.length > 2 ? ` +${String(rec.gaps.length - 2)} more` : ''}`;

    if (rec.ready) {
      checks.push({ id: 'stage-dc-readiness', level, message });
    } else {
      checks.push({ id: 'stage-dc-readiness', level, message, hint: rec.message });
    }

    // Per-milestone sub-checks
    for (const milestone of rec.milestones) {
      const milestoneMsg = milestone.met
        ? `Milestone ${String(milestone.order)}: ${milestone.label} — done`
        : `Milestone ${String(milestone.order)}: ${milestone.label} — not ready`;

      if (milestone.met || !milestone.detail) {
        checks.push({ id: `stage-dc-${milestone.id}`, level: milestone.met ? 'pass' : 'warn', message: milestoneMsg });
      } else {
        checks.push({ id: `stage-dc-${milestone.id}`, level: 'warn', message: milestoneMsg, hint: milestone.detail });
      }
    }
  }

  // Maintenance-stage Hygiene cadence advisory (DEC-6-5, closes OQ-PS-1).
  if (stage === 'maintenance' && now !== undefined) {
    const cadence = evaluateHygieneCadence(
      state.workflow.phase_history,
      config.hygiene.maintenance_cadence_days,
      now,
    );

    if (cadence.cadenceDays > 0) {
      if (cadence.overdue) {
        const message =
          cadence.daysSinceLastHygiene === null
            ? 'No Hygiene session on record for this project'
            : `Last Hygiene session was ${String(cadence.daysSinceLastHygiene)} day(s) ago (cadence: ${String(cadence.cadenceDays)})`;
        checks.push({
          id: 'stage-hygiene-cadence',
          level: 'info',
          message: `Hygiene session overdue — ${message}`,
          hint: "Run 'l1dder transition --to hygiene' to start a Hygiene session",
        });
      } else {
        checks.push({
          id: 'stage-hygiene-cadence',
          level: 'pass',
          message: `Hygiene cadence OK (last session ${String(cadence.daysSinceLastHygiene)} day(s) ago, cadence: ${String(cadence.cadenceDays)})`,
        });
      }
    }
  }

  return checks;
}
