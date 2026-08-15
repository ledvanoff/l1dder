import type { CliContext } from '../../context.js';
import {
  ExitCode,
  mapErrorToExitCode,
  errorToCode,
  errorToHint,
} from '../../output/exit-codes.js';
import { buildHumanOutput } from '../../output/human-output.js';
import { Phase } from '@l1dder/core';
import type { HelpmeOutput } from '@l1dder/schemas';
import { evaluateDiscoveryReadiness } from '../shared/discovery-readiness.js';
import {
  evaluateDeliveryArtifactReadiness,
  isDeliveryArtifactPhase,
  isPhaseArtifactReady,
} from '../shared/delivery-artifact-readiness.js';
import {
  toBlockerBriefs,
  toPrimaryActionBrief,
} from '../shared/projection-brief.js';
import { getPhaseGuidance } from './phase-guidance.js';

/** Result of helpme execution. */
interface HelpmeResult {
  exitCode: number;
  data?: HelpmeOutput;
  humanText?: string;
  quietSummary?: string;
  error?: { code: string; message: string; hint?: string };
}

/**
 * Execute `l1dder helpme` — read-only contextual navigator.
 *
 * Next action, blockers, and alternative transitions come from
 * {@link StateManager.projection}. Human output shows one Primary Action
 * by default; alternatives / full transition picture stay in `--verbose` / `--json`.
 */
export async function executeHelpme(ctx: CliContext): Promise<HelpmeResult> {
  let sm;
  try {
    sm = await ctx.state();
  } catch (error: unknown) {
    const hint = errorToHint(error);
    return {
      exitCode: mapErrorToExitCode(error),
      error: {
        code: errorToCode(error),
        message: error instanceof Error ? error.message : 'Unknown error',
        ...(hint ? { hint } : {}),
      },
    };
  }

  const state = sm.stateSnapshot();
  const config = sm.configSnapshot();
  const pos = sm.currentPosition();
  const phase = pos.phase;
  const projection = await sm.projection.project();
  const primaryAction = toPrimaryActionBrief(projection);
  const blockers = toBlockerBriefs(projection);

  // Shared checklist view (projection-backed) for discovery stage only.
  const view = await evaluateDiscoveryReadiness(sm);

  let discoveryBlock: NonNullable<HelpmeOutput['discovery']> | undefined;
  if (state.project.stage === 'discovery') {
    discoveryBlock = {
      score: view.score,
      ready: view.ready,
      next_milestone: view.next_milestone,
      milestones: view.milestones.map((m) => ({
        order: m.order,
        id: m.id,
        label: m.label,
        status: m.status,
        met: m.met,
        required: m.required,
        evidence_count: m.evidence_count,
        planned_session_count: m.planned_session_count,
        current: m.current,
        ...(m.detail ? { detail: m.detail } : {}),
      })),
      message: view.message,
      gaps: [...view.gaps],
    };
  }

  let deliveryArtifacts: HelpmeOutput['delivery_artifacts'];
  if (isDeliveryArtifactPhase(phase)) {
    deliveryArtifacts = [
      ...(await evaluateDeliveryArtifactReadiness(ctx.fs, ctx.cwd, phase)),
    ];
  }

  const alternatives = projection.phase.alternatives;
  const nextTransition = projection.phase.nextTransition;
  const rollbackTargets = projection.phase.rollbackTargets;

  const phaseGuidance = resolvePhaseGuidance(phase, deliveryArtifacts);

  const data: HelpmeOutput = {
    position: {
      stage: state.project.stage,
      phase: pos.phase,
      status: pos.status,
      mode: pos.mode,
      iteration: pos.iteration > 0 ? String(pos.iteration) : null,
      role_mode: config.role_mode,
    },
    ...(discoveryBlock ? { discovery: discoveryBlock } : {}),
    ...(deliveryArtifacts !== undefined
      ? { delivery_artifacts: deliveryArtifacts }
      : {}),
    primary_action: primaryAction,
    blockers: blockers.map((blocker) => ({ ...blocker })),
    phase_guidance: phaseGuidance,
    transitions: {
      next: nextTransition
        ? {
            phase: nextTransition.to,
            trigger: nextTransition.trigger,
            gates: [...nextTransition.gates],
          }
        : null,
      rollback_available: rollbackTargets.length > 0,
      rollback_targets: [...rollbackTargets],
    },
  };

  const compactBody = formatHelpmeCompact(ctx, data);
  const verboseExtra = formatHelpmeVerbose(ctx, data, alternatives);

  const { humanText, quietSummary } = buildHumanOutput({
    globals: ctx.globals,
    colors: ctx.colors,
    phase: pos.phase,
    primaryAction,
    blockers,
    compactBody,
    verboseExtra,
  });

  return { exitCode: ExitCode.SUCCESS, data, humanText, quietSummary };
}

/**
 * When the current phase artifact is ready, replace static "fill in …" guidance
 * with an explicit ready message (no command recommendation — Primary Action owns that).
 */
function resolvePhaseGuidance(
  phase: string,
  artifacts: HelpmeOutput['delivery_artifacts'],
): string[] {
  const base = [...getPhaseGuidance(phase)];
  if (artifacts === undefined || artifacts.length === 0) {
    return base;
  }

  if (!isPhaseArtifactReady(artifacts)) {
    return base;
  }

  const labels = artifacts.map((a) => a.label).join(', ');
  const readyLine = `${labels} ${artifacts.length === 1 ? 'is' : 'are'} ready.`;

  return [readyLine];
}

function formatHelpmeCompact(ctx: CliContext, data: HelpmeOutput): string {
  const { colors } = ctx;
  const lines: string[] = [];

  lines.push('');
  lines.push(colors.dim('───────── L1DDER Help ─────────'));
  lines.push('');

  lines.push(colors.bold('  Position'));
  lines.push(`  Stage:     ${colors.info(data.position.stage)}`);
  lines.push(`  Phase:     ${data.position.phase} (${data.position.status})`);
  lines.push(`  Mode:      ${data.position.mode}`);
  if (data.position.iteration) {
    lines.push(`  Iteration: ${data.position.iteration}`);
  }
  if (data.position.role_mode) {
    lines.push(`  Role mode: ${data.position.role_mode}`);
  }
  lines.push('');

  if (data.discovery) {
    lines.push(colors.bold('  Discovery Checklist'));
    if (data.discovery.next_milestone) {
      lines.push(
        `  ${colors.dim(`Next milestone: ${data.discovery.next_milestone}`)}`,
      );
    }
    lines.push('');
    for (const m of data.discovery.milestones) {
      const glyph = m.met ? colors.glyph.pass : colors.glyph.fail;
      const detail = m.detail ? ` — ${colors.dim(m.detail)}` : '';
      const cursor = m.current ? colors.info(' ←') : '';
      lines.push(`  ${glyph} ${m.label}${detail}${cursor}`);
    }
    lines.push('');
    const readyLabel = data.discovery.ready
      ? colors.success('READY')
      : colors.warning('NOT READY');
    lines.push(`  Score: ${data.discovery.score} — ${readyLabel}`);
    lines.push(`  ${colors.dim(data.discovery.message)}`);
    lines.push('');
  }

  if (data.delivery_artifacts && data.delivery_artifacts.length > 0) {
    lines.push(colors.bold('  Delivery artifacts'));
    for (const artifact of data.delivery_artifacts) {
      const glyph =
        artifact.status === 'ready'
          ? colors.glyph.pass
          : artifact.status === 'in_progress'
            ? colors.glyph.warn
            : colors.glyph.fail;
      lines.push(
        `  ${glyph} ${artifact.label} — ${artifact.status} (${artifact.path})`,
      );
    }
    lines.push('');
  }

  lines.push(colors.bold('  Guidance'));
  for (const hint of data.phase_guidance) {
    lines.push(`  ${colors.glyph.arrow} ${hint}`);
  }
  lines.push('');

  return lines.join('\n');
}

function formatHelpmeVerbose(
  ctx: CliContext,
  data: HelpmeOutput,
  alternatives: readonly string[],
): string {
  const { colors } = ctx;
  const lines: string[] = [];

  lines.push(colors.bold('  Alternative transitions'));
  if (alternatives.length === 0) {
    if (data.position.phase === Phase.IDLE) {
      lines.push(`  ${colors.dim('No profile alternatives listed for idle')}`);
    } else if (data.position.phase === Phase.COMPLETE) {
      lines.push(`  ${colors.dim('Iteration closing')}`);
    } else {
      lines.push(`  ${colors.dim('No alternative transitions from projection')}`);
    }
  } else {
    for (const alt of alternatives) {
      lines.push(`  ${colors.glyph.arrow} l1dder transition --to ${alt}`);
    }
  }
  lines.push('');

  const { next, rollback_targets: rollbackTargets } = data.transitions;
  if (next && next.gates.length > 0) {
    lines.push(colors.bold('  Gates on next transition'));
    lines.push(`  ${colors.dim(next.gates.join(', '))}`);
    lines.push('');
  }
  if (rollbackTargets.length > 0) {
    lines.push(colors.bold('  Rollback targets'));
    for (const target of rollbackTargets) {
      lines.push(`  ${colors.glyph.arrow} l1dder transition --to ${target}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
