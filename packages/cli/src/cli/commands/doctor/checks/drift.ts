import type { ShellPort } from '@l1dder/core';
import type { State } from '@l1dder/schemas';
import type { DoctorCheck } from '../types.js';

const KNOWLEDGE_DRIFT_PATH_PREFIXES = ['knowledge/', 'standards/'];

/** Extra options for `--deep` orphan git-diff detection. */
export interface CheckDriftOptions {
  readonly deep?: boolean;
  readonly shell?: ShellPort;
  readonly projectRoot?: string;
}

/**
 * Knowledge drift checks: detects drift warnings from quick tasks.
 *
 * With `options.deep` (and a `shell`+`projectRoot`), additionally runs the
 * orphan git-diff check (DEC-6-2): `knowledge/`/`standards/` files changed in
 * the working tree with no matching `knowledge_updates[]` audit entry. Without
 * `--deep`, behavior is unchanged (back-compat).
 */
export async function checkDrift(
  state: State,
  options: CheckDriftOptions = {},
): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];

  const driftTasks = state.quick_tasks.filter((t) => t.knowledge_drift_warning);

  if (driftTasks.length === 0) {
    checks.push({
      id: 'drift-none',
      level: 'pass',
      message: 'No knowledge drift detected from quick tasks',
    });
  } else {
    for (const task of driftTasks) {
      checks.push({
        id: `drift-${task.id}`,
        level: 'warn',
        message: `Quick task "${task.id}" has knowledge drift warning`,
        hint: 'Run a knowledge update session to reconcile changes',
      });
    }
  }

  if (options.deep && options.shell && options.projectRoot) {
    checks.push(...(await checkOrphanDrift(state, options.shell, options.projectRoot)));
  }

  return checks;
}

/**
 * `--deep` orphan git-diff: flags `knowledge/`/`standards/` files changed in
 * the working tree that have no corresponding `knowledge_updates[]` entry —
 * i.e. changed outside a tracked Knowledge Update / Hygiene session.
 */
async function checkOrphanDrift(
  state: State,
  shell: ShellPort,
  projectRoot: string,
): Promise<DoctorCheck[]> {
  let changedFiles: string[];
  try {
    const result = await shell.exec('git diff HEAD --name-only', {
      cwd: projectRoot,
      timeout: 10_000,
    });
    if (result.exitCode !== 0) return [];
    changedFiles = result.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch {
    return [];
  }

  const affected = changedFiles.filter((file) =>
    KNOWLEDGE_DRIFT_PATH_PREFIXES.some((prefix) => file.startsWith(prefix)),
  );
  if (affected.length === 0) return [];

  const recordedFiles = new Set(state.knowledge_updates.map((u) => u.file));
  const orphaned = affected.filter((file) => !recordedFiles.has(file));

  if (orphaned.length === 0) {
    return [
      {
        id: 'drift-orphan-none',
        level: 'pass',
        message: `${String(affected.length)} knowledge/standards file(s) changed, all recorded in knowledge_updates[]`,
      },
    ];
  }

  return orphaned.map((file) => ({
    id: `drift-orphan-${file.replace(/[/\\]/g, '-')}`,
    level: 'warn' as const,
    message: `${file} changed but has no matching knowledge_updates[] record`,
    hint: 'Record this change via a Knowledge Update or run a Hygiene session',
  }));
}
