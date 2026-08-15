import type { DiscoveryStatusOutput } from '@l1dder/schemas';

import type { CliContext } from '../../context.js';
import {
  ExitCode,
  mapErrorToExitCode,
  errorToCode,
  errorToHint,
} from '../../output/exit-codes.js';
import { evaluateDiscoveryReadiness } from '../shared/discovery-readiness.js';
import {
  toBlockerBriefs,
  toPrimaryActionBrief,
} from '../shared/projection-brief.js';
import type { DiscoveryOptions, DiscoveryResult } from './discovery.js';

/**
 * Execute `l1dder discovery status` — render the ordered 7-milestone checklist.
 *
 * Compact by default; `--detailed` adds evidence paths, brainstorm summary,
 * and planned session ids from state. Advisory planning candidates are listed
 * when present — never scheduled or written to state from this command.
 */
export async function executeDiscoveryStatus(
  ctx: CliContext,
  opts: DiscoveryOptions,
): Promise<DiscoveryResult> {
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

  const view = await evaluateDiscoveryReadiness(sm);
  const detailed = opts.detailed === true;
  const records = detailed ? sm.discovery.list() : [];

  const milestones = view.milestones.map((m) => {
    const base = {
      order: m.order,
      id: m.id,
      label: m.label,
      status: m.status,
      met: m.met,
      required: m.required,
      evidence_count: m.evidence_count,
      planned_session_count: m.planned_session_count,
      planned_sessions: [...m.planned_sessions],
      current: m.current,
      ...(m.detail ? { detail: m.detail } : {}),
    };

    if (!detailed) {
      return base;
    }

    const record = records.find((r) => r.id === m.id);
    if (!record) {
      return base;
    }

    return {
      ...base,
      detail: [
        m.detail,
        record.brainstorm_summary
          ? `Brainstorm: ${record.brainstorm_summary}`
          : undefined,
        record.planned_sessions.length > 0
          ? `Sessions: ${record.planned_sessions.join(', ')}`
          : undefined,
        record.evidence.length > 0
          ? `Evidence: ${record.evidence.join(', ')}`
          : undefined,
        record.rationale ? `Rationale: ${record.rationale}` : undefined,
      ]
        .filter((part): part is string => part !== undefined)
        .join(' | ') || undefined,
    };
  });

  const data: DiscoveryStatusOutput = {
    score: view.score,
    ready: view.ready,
    current: view.current,
    next_milestone: view.next_milestone,
    milestones: milestones.map((m) => ({
      order: m.order,
      id: m.id,
      label: m.label,
      status: m.status,
      met: m.met,
      required: m.required,
      evidence_count: m.evidence_count,
      planned_session_count: m.planned_session_count,
      planned_sessions: m.planned_sessions,
      current: m.current,
      ...(m.detail ? { detail: m.detail } : {}),
    })),
    blockers: toBlockerBriefs(view.projection).map((b) => ({ ...b })),
    primary_action: toPrimaryActionBrief(view.projection),
    message: view.message,
    detailed,
    readiness: {
      milestones_closed: view.readiness.milestonesClosed,
      evidence_available: view.readiness.evidenceAvailable,
      ready: view.readiness.ready,
      gaps: view.readiness.gaps.map((g) => ({
        code: g.code,
        ref: g.ref,
        message: g.message,
      })),
    },
    planning_candidates: view.projection.planningCandidates.map((c) => ({
      id: c.id,
      kind: c.kind,
      title: c.title,
      weight: c.weight,
      source: c.source,
      approved: false as const,
    })),
  };

  return {
    exitCode: ExitCode.SUCCESS,
    data,
    humanText: formatDiscoveryStatus(ctx, data),
  };
}

function formatDiscoveryStatus(
  ctx: CliContext,
  data: DiscoveryStatusOutput,
): string {
  const { colors } = ctx;
  const lines: string[] = [];
  lines.push('');
  lines.push(colors.dim('───────── Discovery Checklist ─────────'));
  lines.push('');

  if (data.current) {
    lines.push(`  ${colors.bold('Current:')} ${data.current}`);
  }
  if (data.next_milestone) {
    lines.push(`  ${colors.dim(`Next: ${data.next_milestone}`)}`);
  }
  lines.push('');

  for (const m of data.milestones) {
    const glyph = m.met ? colors.glyph.pass : colors.glyph.fail;
    const cursor = m.current ? colors.info(' ←') : '';
    const labelText = m.met ? colors.success(m.label) : m.label;
    const meta = colors.dim(
      `[${m.status}${m.required ? '' : ', optional'}; evidence=${String(m.evidence_count)}; sessions=${String(m.planned_session_count)}]`,
    );
    lines.push(`  ${glyph} ${labelText} ${meta}${cursor}`);
    if (data.detailed && m.detail) {
      lines.push(`      ${colors.dim(m.detail)}`);
    }
  }

  lines.push('');
  const readyLabel = data.ready
    ? colors.success('READY')
    : colors.warning('NOT READY');
  lines.push(`  Score: ${data.score} — ${readyLabel}`);
  lines.push(`  ${colors.dim(data.message)}`);

  if (data.primary_action.command) {
    lines.push('');
    lines.push(
      `  ${colors.bold('Primary action:')} ${data.primary_action.command}`,
    );
    lines.push(`  ${colors.dim(data.primary_action.reason)}`);
  }

  if (data.blockers.length > 0) {
    lines.push('');
    lines.push(colors.bold('  Blockers'));
    for (const b of data.blockers) {
      const ms = b.milestone ? ` (${b.milestone})` : '';
      lines.push(`  ${colors.glyph.fail} [${b.code}]${ms} ${b.message}`);
    }
  }

  const candidates = data.planning_candidates ?? [];
  if (candidates.length > 0) {
    lines.push('');
    lines.push(
      colors.bold(
        '  Planning candidates (advisory — approval required; not scheduled)',
      ),
    );
    for (const c of candidates) {
      lines.push(
        `  ${colors.glyph.info} [${c.kind}] ${c.id} weight=${c.weight} — ${c.title}`,
      );
    }
  }

  lines.push('');
  return lines.join('\n');
}
