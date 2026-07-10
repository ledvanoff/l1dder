import type { CliContext } from '../../context.js';
import {
  ExitCode,
  mapErrorToExitCode,
  errorToCode,
  errorToHint,
} from '../../output/exit-codes.js';
import type { DoctorOutput, State, Config } from '@l1dder/schemas';
import type { DoctorSection, DoctorCheck, DoctorFixerContext } from './types.js';

import { checkKnowledge } from './checks/knowledge.js';
import { checkState } from './checks/state.js';
import { checkStage } from './checks/stage.js';
import { checkStandards } from './checks/standards.js';
import { checkSkills } from './checks/skills.js';
import { checkIde } from './checks/ide.js';
import { checkWorkflow } from './checks/workflow.js';
import { checkDrift } from './checks/drift.js';
import { runDeepMode, DEEP_MODES, type DeepMode } from './checks/deep-mode.js';
import { fixStateInFlight } from './fixers/state-in-flight.js';
import { fixSkillFormat } from './fixers/skill-format.js';

/** Options parsed from `l1dder doctor` flags. */
interface DoctorOptions {
  section?: string;
  fix?: boolean;
  /** Enable deep diagnostics (Iteration 6): structural drift, orphan git-diff, SK10, skills/ide sections. */
  deep?: boolean;
  /** E9 deep-mode sub-flag (requires --deep): 'production-audit' | 'verification-loop'. */
  mode?: string;
}

/** Result returned by executeDoctor. */
interface DoctorResult {
  exitCode: number;
  data?: DoctorOutput;
  humanText?: string;
  error?: { code: string; message: string; hint?: string };
}

const SECTION_IDS = ['knowledge', 'state', 'stage', 'standards', 'skills', 'ide', 'workflow', 'drift'] as const;
type SectionId = (typeof SECTION_IDS)[number];

/** Sections only included in the default (no `--section`) sweep when `--deep` is set (T-06/T-07). */
const DEEP_ONLY_SECTIONS: readonly SectionId[] = ['skills', 'ide'];

const SECTION_LABELS: Record<SectionId, string> = {
  knowledge: 'Knowledge Integrity',
  state: 'State Consistency',
  stage: 'Project Stage Health',
  standards: 'Standards & Skills',
  skills: 'Skill Registry (SK10)',
  ide: 'IDE Adapter Compliance (E8)',
  workflow: 'Workflow Integrity',
  drift: 'Knowledge Drift',
};

/**
 * Execute `l1dder doctor` — extended project health diagnostics.
 *
 * Runs 6 sections by default (`knowledge, state, stage, standards, workflow,
 * drift`), optionally filtered by `--section`. With `--deep`, the default
 * sweep additionally includes `skills` (full SK10 validation, E5 health) and
 * `ide` (E8 adapter-compliance) — back-compat: without `--deep`, the default
 * sweep is unchanged, though `skills`/`ide` remain explicitly reachable via
 * `--section skills` / `--section ide` regardless of `--deep`.
 * With `--fix`, attempts to auto-resolve fixable issues.
 */
export async function executeDoctor(
  ctx: CliContext,
  opts: DoctorOptions,
): Promise<DoctorResult> {
  // Validate --section if provided
  if (opts.section && !SECTION_IDS.includes(opts.section as SectionId)) {
    return {
      exitCode: ExitCode.USAGE_ERROR,
      error: {
        code: 'USAGE_ERROR',
        message: `Unknown section: "${opts.section}". Valid: ${SECTION_IDS.join(', ')}`,
      },
    };
  }

  // Validate --mode if provided (E9, T-09)
  if (opts.mode) {
    if (!opts.deep) {
      return {
        exitCode: ExitCode.USAGE_ERROR,
        error: { code: 'USAGE_ERROR', message: '--mode requires --deep' },
      };
    }
    if (!DEEP_MODES.includes(opts.mode as DeepMode)) {
      return {
        exitCode: ExitCode.USAGE_ERROR,
        error: {
          code: 'USAGE_ERROR',
          message: `Unknown mode: "${opts.mode}". Valid: ${DEEP_MODES.join(', ')}`,
        },
      };
    }
  }

  const sectionsToRun: SectionId[] = opts.section
    ? [opts.section as SectionId]
    : SECTION_IDS.filter((id) => opts.deep || !DEEP_ONLY_SECTIONS.includes(id));

  // Load state (needed for state/stage/drift checks)
  let stateLoaded = false;
  let stateSnapshot: State | undefined;
  let configSnapshot: Config | undefined;

  if (sectionsToRun.some((s) => s === 'state' || s === 'stage' || s === 'drift' || s === 'skills')) {
    try {
      const sm = await ctx.state();
      stateSnapshot = sm.stateSnapshot();
      configSnapshot = sm.configSnapshot();
      stateLoaded = true;
    } catch (error: unknown) {
        if (sectionsToRun.includes('state')) {
          const exitCode = mapErrorToExitCode(error);
          if (exitCode === ExitCode.NOT_INITIALIZED) {
            const hint = errorToHint(error);
            return {
              exitCode,
              error: {
                code: errorToCode(error),
                message: error instanceof Error ? error.message : 'Unknown error',
                ...(hint !== undefined ? { hint } : {}),
              },
            };
          }
        }
    }
  }

  // Run sections
  const sections: DoctorSection[] = [];

  for (const sectionId of sectionsToRun) {
    const checks = await runSection(
      sectionId,
      ctx,
      stateLoaded ? stateSnapshot : undefined,
      configSnapshot,
      opts.deep ?? false,
    );
    sections.push({
      id: sectionId,
      label: SECTION_LABELS[sectionId],
      checks,
    });
  }

  // Hybrid Hygiene trigger (DEC-6-4): advisory-only, added to the `drift`
  // section when `--deep` surfaced enough drift findings (structural +
  // orphan git-diff) to reach the configured threshold.
  if (opts.deep && configSnapshot) {
    addHygieneTriggerAdvisory(sections, configSnapshot);
  }

  // E9 deep-modes (T-09): aggregate interpretation over all sections above.
  if (opts.deep && opts.mode) {
    const modeSection = await runDeepMode(opts.mode as DeepMode, sections, stateLoaded ? stateSnapshot : undefined, {
      ...(ctx.shell ? { shell: ctx.shell } : {}),
      projectRoot: ctx.cwd,
    });
    sections.push(modeSection);
  }

  // --fix: attempt auto-fixes
  if (opts.fix) {
    await runFixers(ctx, sections);
  }

  // Summarize
  const allChecks = sections.flatMap((s) => s.checks);
  const summary = {
    pass: allChecks.filter((c) => c.level === 'pass').length,
    warn: allChecks.filter((c) => c.level === 'warn').length,
    fail: allChecks.filter((c) => c.level === 'fail').length,
    auto_fixable: allChecks.filter((c) => c.fixable).length,
  };

  const hasFail = summary.fail > 0;
  const hasParseError = allChecks.some(
    (c) => c.level === 'fail' && (c.id.includes('schema') || c.id.includes('parse')),
  );
  const exitCode = hasParseError
    ? ExitCode.CORRUPTED_STATE
    : hasFail
      ? ExitCode.GENERIC_ERROR
      : ExitCode.SUCCESS;

  const data: DoctorOutput = { summary, sections };
  const humanText = formatHuman(ctx, sections, summary);

  return { exitCode, data, humanText };
}

async function runSection(
  sectionId: SectionId,
  ctx: CliContext,
  state: State | undefined,
  config: Config | undefined,
  deep: boolean,
): Promise<DoctorCheck[]> {
  switch (sectionId) {
    case 'knowledge':
      return checkKnowledge(ctx.fs, ctx.cwd, {
        deep,
        ...(ctx.shell ? { shell: ctx.shell } : {}),
        ...(state ? { stage: state.project.stage } : {}),
      });
    case 'state':
      return state ? checkState(state, ctx.clock.now()) : [{ id: 'state-load', level: 'fail', message: 'Could not load state.yml' }];
    case 'stage':
      return state && config
        ? checkStage(state, config, ctx.fs, ctx.cwd, ctx.clock.now())
        : [{ id: 'stage-load', level: 'fail', message: 'Could not load state for stage checks' }];
    case 'standards':
      return checkStandards(ctx.fs, ctx.cwd);
    case 'skills':
      return checkSkills(ctx.fs, ctx.cwd, { ...(state ? { state } : {}) });
    case 'ide':
      return checkIde(ctx);
    case 'workflow':
      return checkWorkflow(ctx.fs, ctx.cwd);
    case 'drift':
      return state
        ? checkDrift(state, { deep, projectRoot: ctx.cwd, ...(ctx.shell ? { shell: ctx.shell } : {}) })
        : [{ id: 'drift-load', level: 'pass', message: 'Drift check skipped (no state)' }];
  }
}

/** Doctor check ID prefixes that represent an individual drift finding (not an aggregate pass row). */
const DRIFT_FINDING_PREFIXES = ['knowledge-drift-', 'drift-orphan-'];

/**
 * Count `--deep` drift findings (structural as-is↔to-be + orphan git-diff) and,
 * when the total reaches `config.hygiene.drift_threshold`, append an advisory
 * check to the `drift` section recommending a Hygiene session. Only-advisory —
 * never blocks (DEC-6-4).
 */
function addHygieneTriggerAdvisory(sections: DoctorSection[], config: Config): void {
  const driftSection = sections.find((s) => s.id === 'drift');
  if (!driftSection) return;

  const allChecks = sections.flatMap((s) => s.checks);
  const driftFindings = allChecks.filter(
    (c) => c.level !== 'pass' && DRIFT_FINDING_PREFIXES.some((prefix) => c.id.startsWith(prefix)),
  );

  const threshold = config.hygiene.drift_threshold;
  if (threshold <= 0 || driftFindings.length < threshold) return;

  driftSection.checks.push({
    id: 'hygiene-trigger-advisory',
    level: 'info',
    message: `${String(driftFindings.length)} drift finding(s) detected (≥ threshold ${String(threshold)})`,
    hint: "Consider running a Hygiene session: 'l1dder transition --to hygiene'",
  });
}

async function runFixers(
  ctx: CliContext,
  sections: DoctorSection[],
): Promise<void> {
  const fixableChecks = sections
    .flatMap((s) => s.checks)
    .filter((c) => c.fixable && (c.level === 'fail' || c.level === 'warn'));

  if (fixableChecks.length === 0) return;

  if (!ctx.globals.noPrompt) {
    const confirmed = await ctx.prompt.confirm(
      `Auto-fix ${String(fixableChecks.length)} issue(s)?`,
    );
    if (!confirmed) return;
  }

  const fixerCtx: DoctorFixerContext = {
    fs: ctx.fs,
    projectRoot: ctx.cwd,
    logger: ctx.logger,
  };

  const needsInFlightFix = fixableChecks.some((c) => c.id === 'state-in-flight');
  const needsSkillFix = fixableChecks.some((c) => c.id.startsWith('skill-format-'));

  if (needsInFlightFix) {
    await fixStateInFlight(fixerCtx);
  }

  if (needsSkillFix) {
    await fixSkillFormat(fixerCtx);
  }
}

function formatHuman(
  ctx: CliContext,
  sections: DoctorSection[],
  summary: { pass: number; warn: number; fail: number; auto_fixable: number },
): string {
  const { colors } = ctx;
  const lines: string[] = [];

  lines.push('');
  lines.push(colors.dim('────────── L1DDER Doctor ──────────'));
  lines.push('');

  for (const section of sections) {
    lines.push(`  ${colors.bold(section.label)}`);
    for (const check of section.checks) {
      const glyph = levelGlyph(check.level, colors);
      lines.push(`  ${glyph} ${check.message}`);
      if (check.hint && check.level !== 'pass') {
        lines.push(`    ${colors.dim(check.hint)}`);
      }
    }
    lines.push('');
  }

  const parts: string[] = [];
  if (summary.pass > 0) parts.push(colors.success(`${String(summary.pass)} pass`));
  if (summary.warn > 0) parts.push(colors.warning(`${String(summary.warn)} warn`));
  if (summary.fail > 0) parts.push(colors.error(`${String(summary.fail)} fail`));
  if (summary.auto_fixable > 0) parts.push(`${String(summary.auto_fixable)} auto-fixable`);
  lines.push(`  Summary: ${parts.join(' · ')}`);
  lines.push('');

  return lines.join('\n');
}

function levelGlyph(level: DoctorCheck['level'], colors: CliContext['colors']): string {
  switch (level) {
    case 'pass':
      return colors.glyph.pass;
    case 'warn':
      return colors.glyph.warn;
    case 'fail':
      return colors.glyph.fail;
    case 'info':
      return colors.glyph.info;
  }
}
