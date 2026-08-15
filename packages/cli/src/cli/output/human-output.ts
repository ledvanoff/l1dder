import type { Globals } from '../globals.js';
import type { PrimaryActionBrief } from '@l1dder/schemas';
import type { BlockerBrief } from '../commands/shared/projection-brief.js';
import type { ColorPalette } from './colors.js';

/**
 * Progressive-disclosure / quiet rules for human CLI output.
 *
 * Lives in one place so status / helpme / stage / context do not re-implement
 * banner vs one-line vs verbose behaviour.
 */
export interface HumanDisclosureOptions {
  readonly globals: Globals;
  readonly colors: ColorPalette;
  /** Current workflow phase (for quiet one-liner). */
  readonly phase: string;
  /** Canonical next action from the workflow projection. */
  readonly primaryAction: PrimaryActionBrief;
  /** Projection blockers (shown in compact and verbose human output). */
  readonly blockers?: readonly BlockerBrief[];
  /**
   * Compact human body (position / checklist / etc.) rendered in default mode.
   * Must already include at most one Primary Action section.
   */
  readonly compactBody: string;
  /**
   * Extra machine-picture sections (alternatives, task counters, evidence)
   * appended only when `--verbose` (JSON always carries full `data` separately).
   */
  readonly verboseExtra?: string;
}

/** Result of {@link buildHumanOutput} for the formatter layer. */
export interface HumanOutputParts {
  /** Full or compact human text (never the quiet one-liner). */
  readonly humanText: string;
  /** Single-line summary used when `--quiet` (phase + Primary Action). */
  readonly quietSummary: string;
}

/**
 * Build human text + quiet summary under progressive-disclosure rules.
 *
 * - Default: compact body (exactly one Primary Action + blockers).
 * - `--verbose`: compact body + verboseExtra.
 * - `--quiet`: formatter prints `quietSummary` only (this helper still returns both).
 * - `--json`: caller sends full `data`; humanText is unused by JsonFormatter.
 */
export function buildHumanOutput(opts: HumanDisclosureOptions): HumanOutputParts {
  const { colors, primaryAction, phase } = opts;
  const blockers = opts.blockers ?? [];

  const actionBlock = formatPrimaryActionBlock(colors, primaryAction, blockers);
  const compact = joinSections(opts.compactBody, actionBlock);
  const humanText =
    opts.globals.verbose && opts.verboseExtra
      ? joinSections(compact, opts.verboseExtra)
      : compact;

  const action = primaryAction.command || primaryAction.kind;
  const quietSummary = `${phase} → ${action}`;

  return { humanText, quietSummary };
}

/**
 * Format the single Primary Action (+ optional blockers) for compact human output.
 */
export function formatPrimaryActionBlock(
  colors: ColorPalette,
  primaryAction: PrimaryActionBrief,
  blockers: readonly BlockerBrief[],
): string {
  const lines: string[] = [];
  lines.push(colors.bold('  Primary Action'));
  const command = primaryAction.command || primaryAction.kind;
  if (command) {
    lines.push(`  ${colors.glyph.arrow} ${command}`);
  }
  if (primaryAction.reason) {
    lines.push(`  ${colors.dim(primaryAction.reason)}`);
  }
  if (blockers.length > 0) {
    lines.push('');
    lines.push(colors.bold('  Blockers'));
    for (const b of blockers) {
      lines.push(`  ${colors.glyph.fail} [${b.code}] ${b.message}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

function joinSections(...parts: string[]): string {
  return parts
    .map((p) => p.replace(/\n+$/u, ''))
    .filter((p) => p.length > 0)
    .join('\n\n')
    .concat('\n');
}
