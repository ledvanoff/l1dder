import type { CliContext } from '../../context.js';
import { ExitCode } from '../../output/exit-codes.js';
import type { DeliveryRailsLoadDiagnostic } from '../../adapters/registry-delivery-rail-index.js';
import { sessionErrorResult } from './errors.js';
import type { SessionResult } from './session.js';

/**
 * Execute `l1dder session status` — show active session and next eligible rail.
 *
 * Distinguishes "rails not defined yet" from "manifest present but unloadable"
 * using the concrete rail-index diagnostic (the port stays `[]`-only so domain
 * projection is unchanged).
 *
 * @param ctx - CLI context
 */
export async function executeSessionStatus(
  ctx: CliContext,
): Promise<SessionResult> {
  let sm;
  try {
    sm = await ctx.state();
  } catch (error: unknown) {
    return sessionErrorResult(error);
  }

  const projection = await sm.projection.project();
  const active = projection.session;
  const next = projection.nextEligible;
  const index = ctx.deliveryRails();
  const rails = await index.load();
  const railsDiagnostic = index.lastLoadDiagnostic();
  const deliveryRailsUnknown = rails.length === 0;
  const waiver = sm.stateSnapshot().workflow.session?.waiver ?? null;

  const data = {
    action: 'status' as const,
    session: active
      ? {
          id: active.session,
          iteration: active.iteration,
          profile: active.profile,
          status: active.status,
          force_started: waiver !== null,
          waiver,
        }
      : null,
    next_eligible: next,
    delivery_rails_unknown: deliveryRailsUnknown,
    delivery_rails_load: railsDiagnostic.kind,
  };

  const lines: string[] = ['', 'Agent Session', ''];

  if (active === null) {
    lines.push('  Active: none');
  } else {
    lines.push(`  Active: ${active.session}`);
    lines.push(
      `  Iteration: ${active.iteration ?? '(not tracked on delivery rails yet)'}`,
    );
    lines.push(`  Profile: ${active.profile}`);
    lines.push(`  Rail status: ${active.status ?? 'unknown'}`);
    if (waiver !== null) {
      lines.push(`  Force-started: yes (reason: ${waiver.reason})`);
    } else {
      lines.push('  Force-started: no');
    }
  }

  lines.push('');
  lines.push(...railsStatusLines(railsDiagnostic, next));
  lines.push('');

  return {
    exitCode: ExitCode.SUCCESS,
    data,
    humanText: lines.join('\n'),
  };
}

/**
 * Human lines for next-eligible / rails-unknown / unloadable-manifest cases.
 */
function railsStatusLines(
  diagnostic: DeliveryRailsLoadDiagnostic,
  next: { session: string; iteration: string } | null,
): string[] {
  if (diagnostic.kind === 'manifest_unloadable') {
    return [
      '  Delivery Plan rails could not be loaded from knowledge/project-registry.yml.',
      '  Run `l1dder registry check` to inspect parse/validation errors.',
    ];
  }
  if (diagnostic.kind !== 'ok' || diagnostic.sessionCount === 0) {
    return [
      '  Delivery Plan rails are not in the registry yet (iterations collection empty or missing).',
    ];
  }
  if (next === null) {
    return ['  Next eligible: none'];
  }
  return [`  Next eligible: ${next.session} (iteration ${next.iteration})`];
}
