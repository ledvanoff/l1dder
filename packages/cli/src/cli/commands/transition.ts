import type { CliContext } from '../context.js';
import {
  ExitCode,
  mapErrorToExitCode,
  errorToCode,
  errorToHint,
} from '../output/exit-codes.js';
import { Phase, suggestCanonicalPhase } from '@l1dder/core';
import type { TriggerSource, Actor, TransitionOutput } from '@l1dder/schemas';

/** Options parsed from `l1dder transition` flags. */
interface TransitionOptions {
  to?: string;
  triggerSource?: string;
  slashCommand?: string;
  actorRole?: string;
  reason?: string;
  force?: boolean;
  dryRun?: boolean;
}

/** Result of transition execution. */
interface TransitionResult {
  exitCode: number;
  data?: TransitionOutput;
  humanText?: string;
  error?: { code: string; message: string; hint?: string };
}

const VALID_PHASES: ReadonlySet<string> = new Set(Object.values(Phase));

const VALID_TRIGGER_KINDS: ReadonlySet<string> = new Set([
  'cli',
  'slash',
  'auto',
  'recovery',
]);

/**
 * Execute `l1dder transition` — thin wrapper over StateManager.transition.execute().
 *
 * Validates options, builds a TransitionRequest, delegates to the transition pipeline,
 * and formats the outcome for human or JSON output.
 */
export async function executeTransition(
  ctx: CliContext,
  opts: TransitionOptions,
): Promise<TransitionResult> {
  // ─── Validation ───

  if (!opts.to) {
    return {
      exitCode: ExitCode.USAGE_ERROR,
      error: { code: 'USAGE_ERROR', message: '--to <phase> is required' },
    };
  }

  if (!VALID_PHASES.has(opts.to)) {
    const suggested = suggestCanonicalPhase(opts.to);
    const hint = suggested
      ? `Did you mean \`${suggested}\`? Run: l1dder transition --to ${suggested}`
      : `Valid phases: ${[...VALID_PHASES].join(', ')}`;
    return {
      exitCode: ExitCode.USAGE_ERROR,
      error: {
        code: 'USAGE_ERROR',
        message: `Invalid phase: "${opts.to}"`,
        hint,
      },
    };
  }

  const triggerKind = opts.triggerSource ?? 'cli';

  if (!VALID_TRIGGER_KINDS.has(triggerKind)) {
    return {
      exitCode: ExitCode.USAGE_ERROR,
      error: {
        code: 'USAGE_ERROR',
        message: `Invalid trigger source: "${triggerKind}". Valid: ${[...VALID_TRIGGER_KINDS].join(', ')}`,
      },
    };
  }

  if (triggerKind === 'slash' && !opts.slashCommand) {
    return {
      exitCode: ExitCode.USAGE_ERROR,
      error: {
        code: 'USAGE_ERROR',
        message: '--slash-command is required when --trigger-source is "slash"',
      },
    };
  }

  // ─── Build trigger ───

  const trigger = buildTrigger(triggerKind, opts);

  // ─── Build actor ───

  const actor: Actor = { kind: 'human', id: opts.actorRole ?? 'user' };

  // ─── Execute ───

  let sm;
  try {
    sm = await ctx.state();
  } catch (error: unknown) {
    const exitCode = mapErrorToExitCode(error);
    const hint = errorToHint(error);
    return {
      exitCode,
      error: {
        code: errorToCode(error),
        message: error instanceof Error ? error.message : 'Unknown error',
        ...(hint !== undefined && { hint }),
      },
    };
  }

  // DF-015: dry-run (and real) must not promise success when guided discovery
  // has not started idea brainstorm yet. Bypass with --force --reason.
  if (
    opts.to === Phase.SPECIFY &&
    !opts.force &&
    sm.stateSnapshot().project.stage === 'discovery'
  ) {
    const projection = await sm.projection.project();
    const idea = projection.milestone.items.find((m) => m.id === 'idea');
    if (idea && idea.status === 'pending') {
      return {
        exitCode: ExitCode.DISCOVERY_NOT_READY,
        error: {
          code: 'DISCOVERY_NOT_READY',
          message:
            'Cannot transition to specify while idea milestone is still pending',
          hint: "Run 'l1dder discovery start idea' first, or bypass with --force --reason \"...\"",
        },
      };
    }
  }

  if (opts.force && !(opts.reason?.trim())) {
    return {
      exitCode: ExitCode.FORCE_REASON_REQUIRED,
      error: {
        code: 'FORCE_REASON_REQUIRED',
        message: '--force requires a non-empty --reason',
        hint: 'Provide a reason: --force --reason "..."',
      },
    };
  }

  const result = await sm.transition.execute({
    to: opts.to as Phase,
    trigger,
    actor,
    dryRun: opts.dryRun ?? false,
    force: opts.force ?? false,
  });

  if (!result.ok) {
    const exitCode = mapErrorToExitCode(result.error);
    const hint = errorToHint(result.error);
    return {
      exitCode,
      error: {
        code: errorToCode(result.error),
        message: result.error.message,
        ...(hint !== undefined && { hint }),
      },
    };
  }

  // ─── Format outcome ───

  const outcome = result.value;
  const timestamp = ctx.clock.now();

  const data: TransitionOutput = {
    from: outcome.previousPhase,
    to: outcome.newPhase,
    kind: outcome.kind,
    trigger,
    forced: opts.force ?? false,
    timestamp,
  };

  const g = ctx.colors.glyph;
  const triggerDetail = 'command' in trigger
    ? (trigger as { command: string }).command
    : (trigger as { reason?: string }).reason ?? '';

  const dryLabel = opts.dryRun ? 'Dry run' : 'Transition';
  const suffix = opts.dryRun ? ' would succeed' : '';
  const lines = [
    `${g.pass} ${dryLabel}: ${outcome.previousPhase} → ${outcome.newPhase}${suffix} (${outcome.kind})`,
    `  Trigger: ${triggerKind} (${triggerDetail})`,
    `  Forced:  ${opts.force ? 'yes' : 'no'}`,
  ];

  if (outcome.noop) {
    lines.push(`  ${g.info} No-op: already at target phase`);
  }

  return { exitCode: ExitCode.SUCCESS, data, humanText: lines.join('\n') };
}

function buildTrigger(kind: string, opts: TransitionOptions): TriggerSource {
  switch (kind) {
    case 'slash':
      return { kind: 'slash', command: opts.slashCommand ?? '' };
    case 'auto':
      return { kind: 'auto', reason: opts.reason ?? 'auto transition' };
    case 'recovery':
      return { kind: 'recovery', original_phase: (opts.to ?? 'idle') as Phase };
    default:
      return { kind: 'cli', command: `l1dder transition --to ${opts.to ?? 'unknown'}` };
  }
}
