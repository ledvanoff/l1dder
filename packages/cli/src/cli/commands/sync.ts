import { join } from 'node:path';

import type { InstallPlan } from '@l1dder/core';

import type { CliContext } from '../context.js';
import { ExitCode } from '../output/exit-codes.js';
import {
  buildAdapterContext,
  getAdapterRegistry,
  getSupportedAdapters,
  resolveTargetAdapters,
  validateAdapterId,
} from './adapter-context.js';
import { runTargetInstall, type TargetInstallResult } from './install-runner.js';

/** Options parsed from `l1dder sync` flags. */
interface SyncOptions {
  ai?: readonly string[];
  force?: boolean;
  dryRun?: boolean;
  prune?: boolean;
}

/** Result returned by executeSync. */
interface SyncResult {
  exitCode: number;
  data?: unknown;
  humanText?: string;
  error?: { code: string; message: string; hint?: string };
}

/**
 * Execute `l1dder sync` — regenerate AI IDE integration files.
 *
 * Uses install-state plan/apply per target (DEC-XH-8).
 */
export async function executeSync(
  ctx: CliContext,
  opts: SyncOptions,
): Promise<SyncResult> {
  const { cwd, colors } = ctx;

  const stateExists = await ctx.fs.exists(join(cwd, '.l1dder', 'state.yml'));
  if (!stateExists) {
    return {
      exitCode: ExitCode.NOT_INITIALIZED,
      error: {
        code: 'NOT_INITIALIZED',
        message: 'Project not initialized. Run `l1dder init` first.',
        hint: 'l1dder init --name my-project --ai cursor',
      },
    };
  }

  const targetIds = await resolveTargetAdapters(ctx, opts.ai);
  if (!targetIds || targetIds.length === 0) {
    return {
      exitCode: ExitCode.USAGE_ERROR,
      error: {
        code: 'NO_ADAPTER',
        message: 'No adapter configured. Use --ai <adapter> or configure in config.yml.',
        hint: `Supported adapters: ${getSupportedAdapters(ctx).join(', ')}`,
      },
    };
  }

  for (const adapterId of targetIds) {
    if (!validateAdapterId(ctx, adapterId)) {
      return {
        exitCode: ExitCode.USAGE_ERROR,
        error: {
          code: 'INVALID_ADAPTER',
          message: `Unknown adapter: "${adapterId}". Supported: ${getSupportedAdapters(ctx).join(', ')}`,
          hint: `Supported adapters: ${getSupportedAdapters(ctx).join(', ')}`,
        },
      };
    }
  }

  const registry = getAdapterRegistry(ctx);
  const adapterCtx = await buildAdapterContext(ctx, cwd, {
    force: opts.force,
    dryRun: opts.dryRun,
  });

  const targetResults: TargetInstallResult[] = [];
  try {
    for (const targetId of targetIds) {
      const adapter = registry.resolve(targetId);
      if (!adapter) {
        return {
          exitCode: ExitCode.USAGE_ERROR,
          error: {
            code: 'INVALID_ADAPTER',
            message: `Adapter not registered: "${targetId}"`,
          },
        };
      }

      const result = await runTargetInstall(
        { fs: ctx.fs, logger: ctx.logger, clock: ctx.clock },
        {
          projectRoot: cwd,
          targetId,
          adapter,
          adapterCtx,
          force: opts.force ?? false,
          dryRun: opts.dryRun ?? false,
          prune: opts.prune ?? false,
        },
      );
      targetResults.push(result);
    }
  } catch (e) {
    return {
      exitCode: ExitCode.GENERIC_ERROR,
      error: {
        code: 'ADAPTER_ERROR',
        message: `Adapter generation failed: ${(e as Error).message}`,
      },
    };
  }

  const g = colors.glyph;
  const lines: string[] = [];
  const primaryTarget = targetIds[0] ?? 'cursor';
  lines.push(
    `${g.info} Syncing IDE files (${targetIds.length === 1 ? `adapter: ${primaryTarget}` : `targets: ${targetIds.join(', ')}`})${opts.dryRun ? ' [dry-run]' : ''}${opts.prune ? ' [prune]' : ''}...`,
  );
  lines.push('');

  let totalErrors = 0;

  for (const result of targetResults) {
    if (targetResults.length > 1) {
      lines.push(`Target: ${result.targetId}`);
    }
    appendPlanLines(lines, g, result);
    totalErrors += result.errors.length;
    if (targetResults.length > 1) {
      lines.push('');
    }
  }

  const aggregate = aggregateResults(targetResults);
  if (aggregate.created.length === 0 && aggregate.updated.length === 0 && aggregate.pruned.length === 0) {
    lines.push(`${g.pass} All files up to date.`);
  }

  return {
    exitCode: totalErrors > 0 ? ExitCode.GENERIC_ERROR : ExitCode.SUCCESS,
    data: {
      adapter: primaryTarget,
      adapters: targetIds,
      targets: targetResults.map((result) => ({
        adapter: result.targetId,
        plan: summarizeTargetPlan(result.plan),
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        pruned: result.pruned,
        orphaned: result.orphaned,
        errors: result.errors,
      })),
      created: aggregate.created,
      updated: aggregate.updated,
      skipped: aggregate.skipped,
      pruned: aggregate.pruned,
      orphaned: aggregate.orphaned,
      errors: aggregate.errors,
    },
    humanText: lines.join('\n'),
  };
}

function appendPlanLines(
  lines: string[],
  g: { pass: string; info: string; fail: string },
  result: TargetInstallResult,
): void {
  if (result.created.length > 0) {
    lines.push(`${g.pass} Created: ${String(result.created.length)}`);
    for (const f of result.created) lines.push(`  + ${f}`);
  }
  if (result.updated.length > 0) {
    lines.push(`${g.pass} Updated: ${String(result.updated.length)}`);
    for (const f of result.updated) lines.push(`  ~ ${f}`);
  }
  if (result.skipped.length > 0) {
    lines.push(`${g.info} Skipped: ${String(result.skipped.length)} (unchanged)`);
  }
  if (result.orphaned.length > 0) {
    lines.push(`${g.info} Orphaned: ${String(result.orphaned.length)}`);
    for (const f of result.orphaned) lines.push(`  ? ${f}`);
  }
  if (result.pruned.length > 0) {
    lines.push(`${g.pass} Pruned: ${String(result.pruned.length)}`);
    for (const f of result.pruned) lines.push(`  - ${f}`);
  }
  if (result.errors.length > 0) {
    lines.push(`${g.fail} Errors: ${String(result.errors.length)}`);
    for (const e of result.errors) lines.push(`  ! ${e.path}: ${e.message}`);
  }
}

function summarizeTargetPlan(plan: InstallPlan): Record<'create' | 'update' | 'skip' | 'orphan', number> {
  const summary: Record<'create' | 'update' | 'skip' | 'orphan', number> = {
    create: 0,
    update: 0,
    skip: 0,
    orphan: 0,
  };
  for (const item of plan.items) {
    summary[item.action] += 1;
  }
  return summary;
}

function aggregateResults(results: readonly TargetInstallResult[]) {
  const created: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];
  const pruned: string[] = [];
  const orphaned: string[] = [];
  const errors: Array<{ path: string; message: string }> = [];

  for (const result of results) {
    created.push(...result.created);
    updated.push(...result.updated);
    skipped.push(...result.skipped);
    pruned.push(...result.pruned);
    orphaned.push(...result.orphaned);
    errors.push(...result.errors);
  }

  return { created, updated, skipped, pruned, orphaned, errors };
}
