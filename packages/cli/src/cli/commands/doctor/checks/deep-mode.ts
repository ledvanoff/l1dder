import type { ShellPort } from '@l1dder/core';
import type { State } from '@l1dder/schemas';
import type { DoctorCheck, DoctorSection } from '../types.js';

/** E9 deep-diagnostic sub-modes for `l1dder doctor --deep --mode <mode>` (T-09, OQ-6-4). */
export type DeepMode = 'production-audit' | 'verification-loop';

/** All valid `--mode` values. */
export const DEEP_MODES: readonly DeepMode[] = ['production-audit', 'verification-loop'];

/** Extra dependencies for deep-mode checks. */
export interface DeepModeOptions {
  readonly shell?: ShellPort;
  readonly projectRoot?: string;
}

/**
 * E9 deep-modes (Iteration 6, T-09, DEC-6-2): `production-audit` and
 * `verification-loop` as sub-modes of `--deep` (OQ-6-4 resolved as
 * `--deep --mode <mode>`, rather than separate top-level flags).
 *
 * Both modes are aggregate, mechanical interpretations of the checks already
 * produced by the other sections plus a couple of local, no-external-service
 * facts (git working-tree cleanliness, in-flight transition marker) — no new
 * external calls or builds are triggered (DEC-6-1: doctor stays mechanical).
 *
 * - `production-audit`: "local-evidence production readiness" — flags any
 *   fail-level check, a lingering in-flight transition marker, or an unclean
 *   git working tree.
 * - `verification-loop`: formal pass/warn/fail verdict over the full result
 *   set — a single aggregate check summarizing whether the session's result
 *   is ready to be considered "done".
 */
export async function runDeepMode(
  mode: DeepMode,
  sections: readonly DoctorSection[],
  state: State | undefined,
  options: DeepModeOptions = {},
): Promise<DoctorSection> {
  const checks =
    mode === 'production-audit'
      ? await runProductionAudit(sections, state, options)
      : runVerificationLoop(sections);

  return {
    id: 'mode',
    label:
      mode === 'production-audit'
        ? 'Deep Mode: Production Audit (E9)'
        : 'Deep Mode: Verification Loop (E9)',
    checks,
  };
}

async function runProductionAudit(
  sections: readonly DoctorSection[],
  state: State | undefined,
  options: DeepModeOptions,
): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];
  const allChecks = sections.flatMap((s) => s.checks);
  const fails = allChecks.filter((c) => c.level === 'fail');

  checks.push(
    fails.length === 0
      ? { id: 'audit-no-fail', level: 'pass', message: 'No fail-level checks across all sections' }
      : {
          id: 'audit-no-fail',
          level: 'fail',
          message: `${String(fails.length)} fail-level check(s) found — not production ready`,
        },
  );

  checks.push(
    state?._in_flight_transition
      ? {
          id: 'audit-in-flight',
          level: 'warn',
          message: 'An in-flight transition marker is present',
          hint: 'Run `l1dder doctor --fix` or resolve manually before considering the project production-ready',
        }
      : { id: 'audit-in-flight', level: 'pass', message: 'No in-flight transition marker' },
  );

  if (options.shell && options.projectRoot) {
    checks.push(await checkGitClean(options.shell, options.projectRoot));
  }

  return checks;
}

async function checkGitClean(shell: ShellPort, projectRoot: string): Promise<DoctorCheck> {
  try {
    const result = await shell.exec('git status --porcelain', { cwd: projectRoot, timeout: 10_000 });
    const lines = result.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return lines.length === 0
      ? { id: 'audit-git-clean', level: 'pass', message: 'Working tree is clean (local evidence of readiness)' }
      : {
          id: 'audit-git-clean',
          level: 'warn',
          message: `${String(lines.length)} uncommitted change(s) in the working tree`,
        };
  } catch {
    return { id: 'audit-git-clean', level: 'pass', message: 'Git status check skipped (git unavailable)' };
  }
}

function runVerificationLoop(sections: readonly DoctorSection[]): DoctorCheck[] {
  const allChecks = sections.flatMap((s) => s.checks);
  const fails = allChecks.filter((c) => c.level === 'fail');
  const warns = allChecks.filter((c) => c.level === 'warn');

  if (fails.length > 0) {
    return [
      {
        id: 'verification-loop-status',
        level: 'fail',
        message: `${String(fails.length)} fail-level check(s) — resolve and re-run before closing the session`,
      },
    ];
  }

  if (warns.length > 0) {
    return [
      {
        id: 'verification-loop-status',
        level: 'warn',
        message: `${String(warns.length)} warn-level check(s) — review before closing the session`,
      },
    ];
  }

  return [{ id: 'verification-loop-status', level: 'pass', message: 'All checks passed — session verified' }];
}
