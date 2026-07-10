import type { State } from '@l1dder/schemas';
import type { DoctorCheck } from '../types.js';

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/**
 * State consistency checks: validates state.yml internal correctness.
 */
export function checkState(state: State, now: string): DoctorCheck[] {
  const checks: DoctorCheck[] = [];

  // schema_version
  if (state.schema_version === 1) {
    checks.push({ id: 'state-schema-version', level: 'pass', message: 'schema_version = 1' });
  } else {
    checks.push({
      id: 'state-schema-version',
      level: 'warn',
      message: `Unexpected schema_version: ${String(state.schema_version)}`,
    });
  }

  // in-flight transition marker
  if (state._in_flight_transition) {
    checks.push({
      id: 'state-in-flight',
      level: 'fail',
      message: 'In-flight transition marker detected (possible crash)',
      hint: "Run 'l1dder transition' to resolve or use --no-recover",
      fixable: true,
    });
  } else {
    checks.push({ id: 'state-in-flight', level: 'pass', message: 'No in-flight transition markers' });
  }

  // Stale in_progress tasks
  const nowMs = new Date(now).getTime();
  const staleTasks = state.tasks.items.filter((t) => {
    if (t.status !== 'in_progress') return false;
    if (!t.started_at) return false;
    const startMs = new Date(t.started_at).getTime();
    return (nowMs - startMs) > STALE_THRESHOLD_MS;
  });

  if (staleTasks.length > 0) {
    checks.push({
      id: 'state-stale-tasks',
      level: 'warn',
      message: `${String(staleTasks.length)} task(s) in_progress for >24h: ${staleTasks.map((t) => t.id).join(', ')}`,
      hint: 'Consider completing or resetting stale tasks',
    });
  } else {
    checks.push({ id: 'state-stale-tasks', level: 'pass', message: 'No stale in-progress tasks' });
  }

  // Phase/mode consistency
  const mode = state.workflow.mode;
  const phase = state.workflow.current_phase;
  if (mode === 'quick' && !phase.startsWith('quick_')) {
    checks.push({
      id: 'state-mode-phase',
      level: 'fail',
      message: `Mode "quick" but phase "${phase}" is not a quick phase`,
      fixable: true,
    });
  } else if (mode === 'fast' && !phase.startsWith('fast_')) {
    checks.push({
      id: 'state-mode-phase',
      level: 'fail',
      message: `Mode "fast" but phase "${phase}" is not a fast phase`,
      fixable: true,
    });
  } else {
    checks.push({ id: 'state-mode-phase', level: 'pass', message: 'Workflow mode/phase consistent' });
  }

  return checks;
}
