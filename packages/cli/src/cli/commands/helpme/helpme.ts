import type { CliContext } from '../../context.js';
import {
  ExitCode,
  mapErrorToExitCode,
  errorToCode,
  errorToHint,
} from '../../output/exit-codes.js';
import {
  Phase,
  TransitionKind,
  listAvailableTransitions,
  isRollbackAllowed,
} from '@l1dder/core';
import type { HelpmeOutput } from '@l1dder/schemas';
import { evaluateDiscoveryReadiness } from '../shared/discovery-readiness.js';
import { getPhaseGuidance } from './phase-guidance.js';

/** Result of helpme execution. */
interface HelpmeResult {
  exitCode: number;
  data?: HelpmeOutput;
  humanText?: string;
  error?: { code: string; message: string; hint?: string };
}

/**
 * Execute `l1dder helpme` — read-only contextual navigator.
 *
 * Shows: project position, Discovery Checklist (discovery stage), phase guidance,
 * and available phase machine transitions.
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
  const mode = pos.mode;

  const phaseGuidance = [...getPhaseGuidance(phase)];

  let discoveryBlock: NonNullable<HelpmeOutput['discovery']> | undefined;
  if (state.project.stage === 'discovery') {
    const rec = await evaluateDiscoveryReadiness(ctx, config);
    discoveryBlock = {
      score: rec.score,
      ready: rec.ready,
      next_milestone: rec.nextMilestone ?? null,
      milestones: rec.milestones.map((m) => ({
        order: m.order,
        id: m.id,
        label: m.label,
        met: m.met,
        ...(m.detail ? { detail: m.detail } : {}),
      })),
      message: rec.message,
      gaps: [...rec.gaps],
    };
  }

  const available = listAvailableTransitions(phase, mode);
  const forward = available.find(
    (t) => t.kind === TransitionKind.FORWARD || t.kind === TransitionKind.MODE_SWITCH,
  );
  const rollbackTargets = available
    .filter((t) => t.kind === TransitionKind.ROLLBACK)
    .map((t) => t.to);

  const rollbackAvailable = rollbackTargets.some((target) =>
    isRollbackAllowed(phase, target, mode),
  );

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
    phase_guidance: phaseGuidance,
    transitions: {
      next: forward
        ? {
            phase: forward.to,
            trigger: forward.trigger,
            gates: [...forward.gates],
          }
        : null,
      rollback_available: rollbackAvailable,
      rollback_targets: rollbackTargets,
    },
  };

  const humanText = formatHelpmeHuman(ctx, data);

  return { exitCode: ExitCode.SUCCESS, data, humanText };
}

function formatHelpmeHuman(ctx: CliContext, data: HelpmeOutput): string {
  const { colors } = ctx;
  const lines: string[] = [];

  lines.push('');
  lines.push(colors.dim('───────── L1DDER Help ─────────'));
  lines.push('');

  // Block 1: position
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

  // Block 2: Discovery Checklist (discovery only)
  if (data.discovery) {
    lines.push(colors.bold('  Discovery Checklist'));
    if (data.discovery.next_milestone) {
      lines.push(`  ${colors.dim(`Next milestone: ${data.discovery.next_milestone}`)}`);
    }
    lines.push('');
    for (const m of data.discovery.milestones) {
      const glyph = m.met ? colors.glyph.pass : colors.glyph.fail;
      const detail = m.detail ? ` — ${colors.dim(m.detail)}` : '';
      lines.push(`  ${glyph} ${m.label}${detail}`);
    }
    lines.push('');
    const readyLabel = data.discovery.ready
      ? colors.success('READY')
      : colors.warning('NOT READY');
    lines.push(`  Score: ${data.discovery.score} — ${readyLabel}`);
    lines.push(`  ${colors.dim(data.discovery.message)}`);
    lines.push('');
  }

  // Block 3: phase guidance
  lines.push(colors.bold('  What to do now'));
  for (const hint of data.phase_guidance) {
    lines.push(`  ${colors.glyph.arrow} ${hint}`);
  }
  lines.push('');

  // Block 4: transitions
  lines.push(colors.bold('  Phase movement'));
  if (data.transitions.next) {
    const { next } = data.transitions;
    const gates =
      next.gates.length > 0 ? `, gates: ${next.gates.join(', ')}` : '';
    lines.push(
      `  Now: ${data.position.phase} ${colors.glyph.arrow} next: ${colors.info(next.phase)} (${next.trigger}${gates})`,
    );
  } else if (data.position.phase === Phase.IDLE) {
    lines.push(`  ${colors.dim('Start an iteration (/l1dder.specify) or l1dder quick')}`);
  } else if (data.position.phase === Phase.COMPLETE) {
    lines.push(`  ${colors.dim('Iteration closing — finish commit/PR workflow')}`);
  } else {
    lines.push(`  ${colors.dim('No forward transition available from current phase')}`);
  }

  if (data.transitions.rollback_available && data.transitions.rollback_targets.length > 0) {
    lines.push(
      `  Rollback available to: ${data.transitions.rollback_targets.join(', ')}`,
    );
  }

  lines.push('');
  return lines.join('\n');
}
