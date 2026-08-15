import type { ProjectStage } from '@l1dder/schemas';
import { STAGE_FORCE_DECISION_PREFIX, type StateManager } from '@l1dder/state';

import type { CliContext } from '../../context.js';
import {
  ExitCode,
  errorToCode,
} from '../../output/exit-codes.js';
import { evaluateDiscoveryReadiness } from '../shared/discovery-readiness.js';
import type { StageResult } from './stage.js';

/**
 * Result when `--force` is set without a non-empty `--reason`.
 */
export function forceReasonRequiredResult(): StageResult {
  return {
    exitCode: ExitCode.FORCE_REASON_REQUIRED,
    error: {
      code: 'FORCE_REASON_REQUIRED',
      message: '--force requires a non-empty --reason',
      hint: 'Provide a reason: --force --reason "..."',
    },
  };
}

/**
 * Persist a forced stage change and record the matching Decision waiver.
 *
 * Shared by `stage advance --force` and `stage set --force` so both paths
 * produce the same audit trail (history entry + `DEC-STAGE-FORCE-*`).
 *
 * @returns `undefined` on success, or a failed {@link StageResult}
 */
export async function persistForcedStageChange(
  sm: StateManager,
  now: string,
  params: {
    readonly from: string;
    readonly to: ProjectStage;
    readonly reason: string;
  },
): Promise<StageResult | undefined> {
  const setResult = sm.stage.setStage(sm.stateSnapshot(), params.to, params.reason);
  if (!setResult.ok) {
    return {
      exitCode: ExitCode.GENERIC_ERROR,
      error: {
        code: errorToCode(setResult.error),
        message: setResult.error.message,
      },
    };
  }

  const saveResult = await sm.applyAndSave(() => setResult.value);
  if (!saveResult.ok) {
    return {
      exitCode: ExitCode.CORRUPTED_STATE,
      error: {
        code: 'CORRUPTED_STATE',
        message: saveResult.error.message,
      },
    };
  }

  const decisionResult = await sm.addDecision({
    id: `${STAGE_FORCE_DECISION_PREFIX}${now}`,
    title: `Forced stage advance ${params.from} → ${params.to}`,
    rationale: params.reason,
    alternatives: ['Wait until discovery checklist is READY'],
    status: 'accepted',
  });
  if (!decisionResult.ok) {
    return {
      exitCode: ExitCode.CORRUPTED_STATE,
      error: {
        code: 'CORRUPTED_STATE',
        message: decisionResult.error.message,
      },
    };
  }

  return undefined;
}

/**
 * Doctor-style non-zero report when the discovery checklist is not READY.
 *
 * No `error` field so the checklist still renders.
 */
export async function discoveryNotReadyResult(
  ctx: CliContext,
  sm: StateManager,
  nextStage: string,
  dryRun: boolean,
): Promise<StageResult> {
  const checklist = await evaluateDiscoveryReadiness(sm);
  const metCount = checklist.milestones.filter((m) => m.met).length;
  const total = checklist.milestones.length;

  return {
    exitCode: ExitCode.DISCOVERY_NOT_READY,
    data: {
      code: 'DISCOVERY_NOT_READY',
      score: `${String(metCount)}/${String(total)}`,
      ready: false,
      dry_run: dryRun,
    },
    humanText: formatReadinessBlock(
      ctx,
      checklist.milestones,
      metCount,
      total,
      nextStage,
      dryRun,
    ),
  };
}

/**
 * Format the discovery-readiness refusal block used by `stage advance` / `stage set`.
 */
export function formatReadinessBlock(
  ctx: CliContext,
  milestones: readonly { met: boolean; label: string; detail?: string | undefined }[],
  metCount: number,
  total: number,
  nextStage: string,
  dryRun: boolean,
): string {
  const { colors } = ctx;
  const lines: string[] = [];
  lines.push('');
  lines.push(
    colors.dim(
      dryRun
        ? '───────── Discovery Readiness (dry run) ─────────'
        : '───────── Discovery Readiness ─────────',
    ),
  );
  lines.push('');

  for (const c of milestones) {
    const glyph = c.met ? colors.glyph.pass : colors.glyph.fail;
    const labelText = c.met ? colors.success(c.label) : c.label;
    const detailText = c.detail ? ` — ${colors.dim(c.detail)}` : '';
    lines.push(`  ${glyph} ${labelText}${detailText}`);
  }

  lines.push('');
  lines.push(`  Score: ${String(metCount)}/${String(total)} — ${colors.warning('NOT READY')}`);
  lines.push(
    dryRun
      ? `  ${colors.dim(`Dry run: advance to '${nextStage}' would fail. Complete milestones or use --force --reason "...".`)}`
      : `  ${colors.dim(`Cannot advance to '${nextStage}'. Complete milestones or use --force --reason "...".`)}`,
  );
  if (dryRun) {
    lines.push(`  ${colors.dim('No state was written.')}`);
  }
  lines.push('');

  return lines.join('\n');
}
