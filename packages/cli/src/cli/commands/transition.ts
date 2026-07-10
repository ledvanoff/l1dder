import type { CliContext } from '../context.js';
import {
  ExitCode,
  mapErrorToExitCode,
  errorToCode,
  errorToHint,
} from '../output/exit-codes.js';
import { Phase } from '@l1dder/core';
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
    return {
      exitCode: ExitCode.USAGE_ERROR,
      error: {
        code: 'USAGE_ERROR',
        message: `Invalid phase: "${opts.to}". Valid phases: ${[...VALID_PHASES].join(', ')}`,
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

  if (opts.force && !opts.reason) {
    return {
      exitCode: ExitCode.USAGE_ERROR,
      error: {
        code: 'USAGE_ERROR',
        message: '--reason is required when using --force',
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
