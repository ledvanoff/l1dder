import type { ClockPort, FileSystemPort } from '@l1dder/core';
import type { State, Config } from '@l1dder/schemas';
import {
  DiscoveryOrchestrator,
  STAGE_FORCE_DECISION_PREFIX,
  WorkflowProjectionService,
  evaluateHygieneCadence,
  recommend,
} from '@l1dder/state';
import type { WorkflowProjection } from '@l1dder/state';
import type { DoctorCheck } from '../types.js';

/** Optional projection source — prefer {@link StateManager.projection}. */
export interface StageCheckProjectionSource {
  project(): Promise<WorkflowProjection>;
}

/**
 * Project stage health checks: validates stage/workflow consistency and
 * reports the ordered discovery checklist from the workflow projection.
 *
 * `now` (ISO datetime) drives the `maintenance`-stage Hygiene cadence advisory
 * (DEC-6-5, closes OQ-PS-1) — optional for back-compat callers that only need
 * the pre-existing checks.
 *
 * Prefer passing `projection` from `StateManager.projection` (composition root).
 * When omitted (unit tests), a local {@link WorkflowProjectionService} is built
 * from `clock` / `now` so behaviour stays testable without a StateManager.
 */
export async function checkStage(
  state: State,
  config: Config,
  _fs: FileSystemPort,
  _projectRoot: string,
  now?: string,
  clock?: ClockPort,
  projection?: StageCheckProjectionSource,
): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];
  const stage = state.project.stage;

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

  const forcedWaivers = state.decisions.filter((d) =>
    d.id.startsWith(STAGE_FORCE_DECISION_PREFIX),
  );
  if (forcedWaivers.length === 0) {
    checks.push({
      id: 'stage-forced-waiver',
      level: 'pass',
      message: 'No forced stage waivers',
    });
  } else {
    const latest = forcedWaivers[forcedWaivers.length - 1];
    const latestReason = latest?.rationale ?? '';
    const latestWhen = latest?.timestamp ?? '';
    const latestTitle = latest?.title ?? 'Forced stage transition';
    const message = forcedWaivers.length === 1
      ? `${latestTitle} on ${latestWhen} — ${latestReason}`
      : `${String(forcedWaivers.length)} forced stage waivers; latest: ${latestTitle} on ${latestWhen} — ${latestReason}`;
    checks.push({
      id: 'stage-forced-waiver',
      level: 'warn',
      message,
      hint: latestReason,
    });
  }

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

    const projected = await resolveProjection(state, config, now, clock, projection);

    const criteria = projected.milestone.items.map((item, index) => {
      const met = item.status === 'complete' || item.status === 'not_applicable';
      return {
        id: item.id,
        order: index + 1,
        label: item.id,
        met,
        detail: met ? 'ok' : `Status: ${item.status}`,
      };
    });
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

    for (const milestone of rec.milestones) {
      const milestoneMsg = milestone.met
        ? `Milestone ${String(milestone.order)}: ${milestone.label} — done`
        : `Milestone ${String(milestone.order)}: ${milestone.label} — not ready`;

      if (milestone.met || !milestone.detail) {
        checks.push({
          id: `stage-dc-${milestone.id}`,
          level: milestone.met ? 'pass' : 'warn',
          message: milestoneMsg,
        });
      } else {
        checks.push({
          id: `stage-dc-${milestone.id}`,
          level: 'warn',
          message: milestoneMsg,
          hint: milestone.detail,
        });
      }
    }

    checks.push({
      id: 'stage-primary-action',
      level: 'info',
      message: `Primary Action: ${projected.primaryAction.command || projected.primaryAction.kind}`,
      hint: projected.primaryAction.reason,
    });
  }

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

async function resolveProjection(
  state: State,
  config: Config,
  now: string | undefined,
  clock: ClockPort | undefined,
  projection: StageCheckProjectionSource | undefined,
): Promise<WorkflowProjection> {
  if (projection) {
    return projection.project();
  }
  const clockPort: ClockPort = clock ?? {
    now: () => now ?? '1970-01-01T00:00:00.000Z',
  };
  const orchestrator = new DiscoveryOrchestrator(clockPort);
  const projectionService = new WorkflowProjectionService({
    clock: clockPort,
    orchestrator,
  });
  return projectionService.project(state, config);
}
