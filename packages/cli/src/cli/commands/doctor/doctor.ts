import { join } from 'node:path';

import {
  SchemaValidationError,
  formatSchemaIssues,
  toSchemaIssueDetails,
} from '@l1dder/core';
import type { DoctorOutput, State, Config } from '@l1dder/schemas';
import { StateLoader, StateReader } from '@l1dder/state';
import type { WorkflowProjection } from '@l1dder/state';

import type { CliContext } from '../../context.js';
import {
  ExitCode,
  mapErrorToExitCode,
  errorToCode,
  errorToHint,
} from '../../output/exit-codes.js';
import type { DoctorSection, DoctorCheck, DoctorFixerContext } from './types.js';

import { checkKnowledge } from './checks/knowledge.js';
import { checkState } from './checks/state.js';
import { checkStage } from './checks/stage.js';
import { checkStandards } from './checks/standards.js';
import { checkSkills } from './checks/skills.js';
import { checkIde } from './checks/ide.js';
import { checkWorkflow } from './checks/workflow.js';
import { checkDrift } from './checks/drift.js';
import { checkRegistry } from './checks/registry.js';
import { checkSpecContract } from './checks/spec-contract.js';
import { runDeepMode, DEEP_MODES, type DeepMode } from './checks/deep-mode.js';
import {
  toBlockerBriefs,
  toPrimaryActionBrief,
} from '../shared/projection-brief.js';
import { fixStateInFlight } from './fixers/state-in-flight.js';
import { fixSkillFormat } from './fixers/skill-format.js';
import { fixRegistryView } from './fixers/registry-view.js';

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

const SECTION_IDS = [
  'knowledge',
  'state',
  'stage',
  'standards',
  'skills',
  'ide',
  'workflow',
  'drift',
  'registry',
  'spec-contract',
] as const;
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
  registry: 'Project Registry',
  'spec-contract': 'Spec AI Contract',
};

/**
 * Execute `l1dder doctor` — extended project health diagnostics.
 *
 * Runs 8 sections by default (`knowledge, state, stage, standards, workflow,
 * drift, registry, spec-contract`), optionally filtered by `--section`. With
 * `--deep`, the default sweep additionally includes `skills` (full SK10
 * validation, E5 health) and `ide` (E8 adapter-compliance) — back-compat:
 * without `--deep`, `skills`/`ide` stay out of the default sweep, though they
 * remain reachable via `--section skills` / `--section ide` regardless of
 * `--deep`. With `--fix`, applies fixes, re-runs affected checks, then
 * computes the final exit code from the post-fix re-check (DF-009/019).
 *
 * Crash recovery is skipped for `doctor` (see program SKIP_RECOVERY) so the
 * default path stays read-only relative to in-flight markers (DF-018).
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
  let stateLoadError: unknown;
  let projectionFacade: { project(): Promise<WorkflowProjection> } | undefined;
  let projectionSnapshot: WorkflowProjection | undefined;

  if (sectionsToRun.some((s) => s === 'state' || s === 'stage' || s === 'drift' || s === 'skills')) {
    try {
      const sm = await ctx.state();
      stateSnapshot = sm.stateSnapshot();
      configSnapshot = sm.configSnapshot();
      projectionFacade = sm.projection;
      stateLoaded = true;
    } catch (error: unknown) {
      stateLoadError = error;
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

  if (projectionFacade) {
    projectionSnapshot = await projectionFacade.project();
  }

  const sectionOpts: SectionRunOptions = {
    deep: opts.deep ?? false,
    noRecover: ctx.globals.noRecover,
    stateLoadError,
    ...(projectionFacade ? { projection: projectionFacade } : {}),
  };

  // Run sections
  const sections: DoctorSection[] = [];

  for (const sectionId of sectionsToRun) {
    const checks = await runSection(
      sectionId,
      ctx,
      stateLoaded ? stateSnapshot : undefined,
      configSnapshot,
      sectionOpts,
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

  // --fix: apply fixes, then re-check affected sections before exit code
  if (opts.fix) {
    const fixed = await runFixers(ctx, sections);
    if (fixed) {
      const reloaded = await reloadStateFromDisk(ctx);
      if (reloaded) {
        stateSnapshot = reloaded.state;
        configSnapshot = reloaded.config ?? configSnapshot;
        stateLoaded = true;
        stateLoadError = undefined;
        sectionOpts.stateLoadError = undefined;
      }

      const sectionsToRecheck = sections
        .filter((s) => s.checks.some((c) => c.fixable && (c.level === 'fail' || c.level === 'warn')))
        .map((s) => s.id as SectionId);

      for (const sectionId of sectionsToRecheck) {
        const idx = sections.findIndex((s) => s.id === sectionId);
        if (idx < 0) continue;
        const checks = await runSection(
          sectionId,
          ctx,
          stateLoaded ? stateSnapshot : undefined,
          configSnapshot,
          sectionOpts,
        );
        const existing = sections[idx];
        if (existing) {
          sections[idx] = {
            id: existing.id,
            label: existing.label,
            checks,
          };
        }
      }
    }
  }

  // Summarize
  const allChecks = sections.flatMap((s) => s.checks);
  const summary = {
    pass: allChecks.filter((c) => c.level === 'pass').length,
    warn: allChecks.filter((c) => c.level === 'warn').length,
    fail: allChecks.filter((c) => c.level === 'fail').length,
    auto_fixable: allChecks.filter((c) => c.fixable && (c.level === 'fail' || c.level === 'warn')).length,
  };

  const hasFail = summary.fail > 0;
  const hasSchemaError = allChecks.some(
    (c) =>
      c.level === 'fail' &&
      (c.id === 'state-load' || c.id.includes('schema') || c.id.includes('parse')),
  );
  const exitCode = hasSchemaError
    ? ExitCode.SCHEMA_VALIDATION
    : hasFail
      ? ExitCode.GENERIC_ERROR
      : ExitCode.SUCCESS;

  const data: DoctorOutput = {
    summary,
    sections,
    ...(projectionSnapshot
      ? {
          primary_action: toPrimaryActionBrief(projectionSnapshot),
          blockers: toBlockerBriefs(projectionSnapshot).map((b) => ({ ...b })),
        }
      : {}),
  };
  const humanText = formatHuman(ctx, sections, summary);

  return { exitCode, data, humanText };
}

/** Options threaded into per-section runners. */
interface SectionRunOptions {
  readonly deep: boolean;
  readonly noRecover: boolean;
  stateLoadError?: unknown;
  /** Shared StateManager.projection when state loaded via composition root. */
  projection?: { project(): Promise<WorkflowProjection> };
}

async function runSection(
  sectionId: SectionId,
  ctx: CliContext,
  state: State | undefined,
  config: Config | undefined,
  opts: SectionRunOptions,
): Promise<DoctorCheck[]> {
  switch (sectionId) {
    case 'knowledge':
      return checkKnowledge(ctx.fs, ctx.cwd, {
        deep: opts.deep,
        ...(ctx.shell ? { shell: ctx.shell } : {}),
        ...(state ? { stage: state.project.stage } : {}),
      });
    case 'state':
      return state
        ? checkState(state, ctx.clock.now(), { noRecover: opts.noRecover })
        : [stateLoadFailureCheck(opts.stateLoadError)];
    case 'stage':
      return state && config
        ? checkStage(
            state,
            config,
            ctx.fs,
            ctx.cwd,
            ctx.clock.now(),
            ctx.clock,
            opts.projection,
          )
        : [{
            id: 'stage-load',
            level: 'fail',
            message: stageLoadFailureMessage(opts.stateLoadError),
          }];
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
        ? checkDrift(state, { deep: opts.deep, projectRoot: ctx.cwd, ...(ctx.shell ? { shell: ctx.shell } : {}) })
        : [{ id: 'drift-load', level: 'pass', message: 'Drift check skipped (no state)' }];
    case 'registry':
      return checkRegistry(ctx.fs, ctx.cwd);
    case 'spec-contract':
      return checkSpecContract(ctx.fs, ctx.cwd);
  }
}

/**
 * Doctor check for a failed state.yml load — includes Zod path+message (DF-002).
 */
function stateLoadFailureCheck(error: unknown): DoctorCheck {
  if (error instanceof SchemaValidationError) {
    return {
      id: 'state-load',
      level: 'fail',
      message: `Could not load state.yml: ${formatSchemaIssues(error.issues)}`,
      hint: 'Fix the listed schema fields in .l1dder/state.yml',
      details: [...toSchemaIssueDetails(error.issues)],
    };
  }
  if (error instanceof Error) {
    return {
      id: 'state-load',
      level: 'fail',
      message: `Could not load state.yml: ${error.message}`,
    };
  }
  return { id: 'state-load', level: 'fail', message: 'Could not load state.yml' };
}

function stageLoadFailureMessage(error: unknown): string {
  if (error instanceof SchemaValidationError) {
    return `Could not load state for stage checks: ${formatSchemaIssues(error.issues)}`;
  }
  if (error instanceof Error) {
    return `Could not load state for stage checks: ${error.message}`;
  }
  return 'Could not load state for stage checks';
}

/**
 * Re-read state/config from disk after fixers mutate files (bypasses StateManager cache).
 *
 * Goes through {@link StateLoader} — the same production load path as
 * `StateManager.create()` — so the re-check sees a migrated state instead of a
 * stale pre-migration snapshot.
 */
async function reloadStateFromDisk(
  ctx: CliContext,
): Promise<{ state: State; config?: Config } | undefined> {
  const loader = new StateLoader({ fs: ctx.fs, logger: ctx.logger });
  const reader = new StateReader({ fs: ctx.fs, logger: ctx.logger });
  const statePath = join(ctx.cwd, '.l1dder', 'state.yml');
  const configPath = join(ctx.cwd, '.l1dder', 'config.yml');

  const stateResult = await loader.load(statePath);
  if (!stateResult.ok) return undefined;

  const configResult = await reader.readConfig(configPath);
  return {
    state: stateResult.value.state,
    ...(configResult.ok ? { config: configResult.value.config } : {}),
  };
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

/**
 * Apply auto-fixers for fixable checks.
 *
 * @returns `true` when at least one fixer ran successfully.
 */
async function runFixers(
  ctx: CliContext,
  sections: DoctorSection[],
): Promise<boolean> {
  const fixableChecks = sections
    .flatMap((s) => s.checks)
    .filter((c) => c.fixable && (c.level === 'fail' || c.level === 'warn'));

  if (fixableChecks.length === 0) return false;

  if (!ctx.globals.noPrompt) {
    const confirmed = await ctx.prompt.confirm(
      `Auto-fix ${String(fixableChecks.length)} issue(s)?`,
    );
    if (!confirmed) return false;
  }

  const fixerCtx: DoctorFixerContext = {
    fs: ctx.fs,
    projectRoot: ctx.cwd,
    logger: ctx.logger,
  };

  const needsInFlightFix = fixableChecks.some((c) => c.id === 'state-in-flight');
  const needsSkillFix = fixableChecks.some((c) => c.id.startsWith('skill-format-'));
  const needsRegistryViewFix = fixableChecks.some(
    (c) => c.id === 'registry-generated-freshness',
  );

  let applied = false;

  if (needsInFlightFix) {
    applied = (await fixStateInFlight(fixerCtx)) || applied;
  }

  if (needsSkillFix) {
    applied = (await fixSkillFormat(fixerCtx)) || applied;
  }

  if (needsRegistryViewFix) {
    applied = (await fixRegistryView(fixerCtx)) || applied;
  }

  return applied;
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
