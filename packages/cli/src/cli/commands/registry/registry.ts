import type { RegistryOutput } from '@l1dder/schemas';
import {
  AI_CONTEXT_PATH,
  REGISTRY_MANIFEST_PATH,
  REGISTRY_VIEW_PATH,
  initRegistryManifest,
  inspectAiContextFreshness,
  loadRegistryBundle,
  registryCollectionCounts,
  registryLookupInstruction,
  syncRegistryView,
  type RegistryBundle,
  type RegistryEngineError,
  type RegistryIssue,
} from '@l1dder/knowledge';

import type { CliContext } from '../../context.js';
import { ExitCode } from '../../output/exit-codes.js';

/** Options for `l1dder registry` subcommands. */
export interface RegistryCommandOptions {
  readonly init?: boolean | undefined;
  readonly filter?: string | undefined;
}

/** Result returned by registry command handlers. */
export interface RegistryCommandResult {
  exitCode: number;
  data?: RegistryOutput;
  humanText?: string;
  error?: { code: string; message: string; hint?: string };
}

/**
 * Execute `l1dder registry` — delegates to check / sync / show.
 *
 * @param ctx - CLI context
 * @param subcommand - `check` | `sync` | `show` (default `show`)
 * @param opts - Flags (`--init`, `--filter`)
 */
export async function executeRegistry(
  ctx: CliContext,
  subcommand: string | undefined,
  opts: RegistryCommandOptions,
): Promise<RegistryCommandResult> {
  const action = subcommand ?? 'show';
  switch (action) {
    case 'check':
      return executeRegistryCheck(ctx);
    case 'sync':
      return executeRegistrySync(ctx, opts);
    case 'show':
      return executeRegistryShow(ctx, opts);
    default:
      return {
        exitCode: ExitCode.USAGE_ERROR,
        error: {
          code: 'USAGE_ERROR',
          message: `Unknown subcommand: ${action}`,
          hint: 'Available: check, sync, show',
        },
      };
  }
}

/**
 * Read-only registry validation + generated-view freshness.
 */
async function executeRegistryCheck(
  ctx: CliContext,
): Promise<RegistryCommandResult> {
  const deps = { fs: ctx.fs, projectRoot: ctx.cwd };
  const loaded = await loadRegistryBundle(deps);
  if (!loaded.ok) {
    return engineErrorResult(loaded.error);
  }

  const bundle = loaded.value;
  const errors = countSeverity(bundle.report.issues, 'error');
  const warnings = countSeverity(bundle.report.issues, 'warning');
  const freshnessIssues = freshnessAsIssues(bundle);
  const allIssues = [...bundle.report.issues, ...freshnessIssues];
  const errorCount =
    errors + countSeverity(freshnessIssues, 'error');
  const warningCount =
    warnings + countSeverity(freshnessIssues, 'warning');

  const data: RegistryOutput = {
    action: 'check',
    manifest_path: REGISTRY_MANIFEST_PATH,
    view_path: REGISTRY_VIEW_PATH,
    content_hash: bundle.contentHash,
    view_stale: bundle.viewStale,
    issue_summary: { error: errorCount, warning: warningCount },
    issues: allIssues.map(toIssueOutput),
  };

  return {
    exitCode: errorCount > 0 ? ExitCode.GENERIC_ERROR : ExitCode.SUCCESS,
    data,
    humanText: formatCheckHuman(data, allIssues),
  };
}

/**
 * Validate and regenerate `knowledge/registry.md` (idempotent).
 */
async function executeRegistrySync(
  ctx: CliContext,
  opts: RegistryCommandOptions,
): Promise<RegistryCommandResult> {
  const deps = { fs: ctx.fs, projectRoot: ctx.cwd };

  let initializedPath: string | undefined;
  if (opts.init) {
    const init = await initRegistryManifest(deps);
    if (!init.ok) {
      return engineErrorResult(init.error);
    }
    initializedPath = init.path;
    // Fall through to the sync below: a manifest without its generated view
    // fails `registry check` (REGISTRY_VIEW_STALE), so `--init` alone would
    // leave a fresh project red until the user ran sync a second time.
  }

  const synced = await syncRegistryView(deps);
  if (!synced.ok) {
    return engineErrorResult(synced.error);
  }

  const { bundle, wrote, unchanged } = synced.value;
  const errors = countSeverity(bundle.report.issues, 'error');
  const warnings = countSeverity(bundle.report.issues, 'warning');

  const data: RegistryOutput = {
    action: initializedPath === undefined ? 'sync' : 'init',
    manifest_path: REGISTRY_MANIFEST_PATH,
    view_path: REGISTRY_VIEW_PATH,
    content_hash: bundle.contentHash,
    view_stale: false,
    wrote,
    unchanged,
    issue_summary: { error: errors, warning: warnings },
    issues: bundle.report.issues.map(toIssueOutput),
    counts: registryCollectionCounts(bundle.registry),
  };

  const syncLine = unchanged
    ? `Registry view unchanged (${REGISTRY_VIEW_PATH}, hash ${bundle.contentHash}).\n`
    : `Registry view written: ${REGISTRY_VIEW_PATH} (hash ${bundle.contentHash}).\n`;
  const human =
    initializedPath === undefined
      ? syncLine
      : `Created draft registry manifest: ${initializedPath}\n${syncLine}`;

  return {
    exitCode: ExitCode.SUCCESS,
    data,
    humanText: human,
  };
}

/**
 * Human-readable registry summary (+ optional id/name filter).
 */
async function executeRegistryShow(
  ctx: CliContext,
  opts: RegistryCommandOptions,
): Promise<RegistryCommandResult> {
  const deps = { fs: ctx.fs, projectRoot: ctx.cwd };
  const loaded = await loadRegistryBundle(deps);
  if (!loaded.ok) {
    return engineErrorResult(loaded.error);
  }

  const bundle = loaded.value;
  const errors = countSeverity(bundle.report.issues, 'error');
  const warnings = countSeverity(bundle.report.issues, 'warning');
  const ai = await inspectAiContextFreshness(deps, bundle.contentHash);
  const lookup = registryLookupInstruction();
  const filter = opts.filter?.trim();

  const data: RegistryOutput = {
    action: 'show',
    manifest_path: REGISTRY_MANIFEST_PATH,
    view_path: REGISTRY_VIEW_PATH,
    content_hash: bundle.contentHash,
    view_stale: bundle.viewStale,
    counts: registryCollectionCounts(bundle.registry),
    issue_summary: { error: errors, warning: warnings },
    issues: bundle.report.issues.map(toIssueOutput),
    lookup_instruction: lookup,
    ai_context: {
      status: ai.status,
      path: ai.path,
      ...(ai.embeddedHash !== undefined
        ? { embedded_hash: ai.embeddedHash }
        : {}),
    },
    ...(filter !== undefined && filter.length > 0
      ? {
          filter,
          matches: filterRegistry(bundle, filter),
        }
      : {}),
  };

  return {
    exitCode: ExitCode.SUCCESS,
    data,
    humanText: formatShowHuman(data, lookup),
  };
}

function engineErrorResult(error: RegistryEngineError): RegistryCommandResult {
  const exitCode =
    error.code === 'REGISTRY_MANIFEST_MISSING'
      ? ExitCode.NOT_INITIALIZED
      : error.code === 'REGISTRY_PARSE_ERROR' ||
          error.code === 'REGISTRY_VALIDATION_FAILED'
        ? ExitCode.SCHEMA_VALIDATION
        : ExitCode.GENERIC_ERROR;

  return {
    exitCode,
    error: {
      code: error.code,
      message: error.message,
      ...(error.hint !== undefined ? { hint: error.hint } : {}),
    },
    ...(error.issues !== undefined
      ? {
          data: {
            action: 'check' as const,
            manifest_path: REGISTRY_MANIFEST_PATH,
            view_path: REGISTRY_VIEW_PATH,
            issues: error.issues.map(toIssueOutput),
            issue_summary: {
              error: countSeverity(error.issues, 'error'),
              warning: countSeverity(error.issues, 'warning'),
            },
          },
        }
      : {}),
  };
}

function freshnessAsIssues(bundle: RegistryBundle): RegistryIssue[] {
  if (!bundle.viewStale) return [];
  return [
    {
      code: 'REGISTRY_VIEW_STALE',
      ref: REGISTRY_VIEW_PATH,
      message: staleViewMessage(bundle),
      path: REGISTRY_VIEW_PATH,
      severity: 'error',
    },
  ];
}

/** Human-readable stale-view reason for check / doctor. */
function staleViewMessage(bundle: RegistryBundle): string {
  switch (bundle.viewFreshness) {
    case 'missing':
      return `Generated view missing: ${REGISTRY_VIEW_PATH}`;
    case 'missing-marker':
      return `Generated view is missing a valid content-hash marker: ${REGISTRY_VIEW_PATH}`;
    case 'manifest-changed':
      return `Generated view is stale relative to ${REGISTRY_MANIFEST_PATH} (manifest changed)`;
    case 'view-edited':
      return `Generated view was edited manually: ${REGISTRY_VIEW_PATH}`;
    case 'fresh':
      return `Generated view is stale: ${REGISTRY_VIEW_PATH}`;
  }
}

function toIssueOutput(issue: RegistryIssue): NonNullable<RegistryOutput['issues']>[number] {
  return {
    code: issue.code,
    ref: issue.ref,
    message: issue.message,
    severity: issue.severity ?? 'error',
    ...(issue.path !== undefined ? { path: issue.path } : {}),
  };
}

function countSeverity(
  issues: readonly RegistryIssue[],
  severity: 'error' | 'warning',
): number {
  return issues.filter((i) => (i.severity ?? 'error') === severity).length;
}

function filterRegistry(
  bundle: RegistryBundle,
  filter: string,
): NonNullable<RegistryOutput['matches']> {
  const q = filter.toLowerCase();
  const matches: NonNullable<RegistryOutput['matches']> = [];
  const push = (
    collection: string,
    id: string,
    title?: string,
    name?: string,
  ): void => {
    const hay = `${id} ${title ?? ''} ${name ?? ''}`.toLowerCase();
    if (!hay.includes(q)) return;
    matches.push({
      collection,
      id,
      ...(title !== undefined ? { title } : {}),
      ...(name !== undefined ? { name } : {}),
    });
  };

  for (const f of bundle.registry.features) push('features', f.id, f.title);
  for (const u of bundle.registry.usecases) push('usecases', u.id, u.title);
  for (const d of bundle.registry.decisions) push('decisions', d.id, d.title);
  for (const m of bundle.registry.models) push('models', m.id, m.title);
  for (const e of bundle.registry.enums) push('enums', e.id, e.title);
  for (const t of bundle.registry.test_contracts) push('test_contracts', t.id, t.title);
  for (const s of bundle.registry.symbols) push('symbols', s.id, undefined, s.name);
  for (const d of bundle.registry.debt_items) push('debt_items', d.id, d.title);
  for (const b of bundle.registry.backlog_items) push('backlog_items', b.id, b.title);
  return matches.sort((a, b) => {
    if (a.collection !== b.collection) {
      return a.collection < b.collection ? -1 : 1;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

function formatCheckHuman(
  data: RegistryOutput,
  issues: readonly RegistryIssue[],
): string {
  const lines = [
    '',
    'Registry check',
    `  manifest: ${data.manifest_path}`,
    `  view: ${data.view_path}${data.view_stale ? ' (STALE)' : ' (fresh)'}`,
    `  hash: ${data.content_hash ?? '—'}`,
    `  issues: ${String(data.issue_summary?.error ?? 0)} error / ${String(data.issue_summary?.warning ?? 0)} warning`,
    '',
  ];
  for (const issue of issues) {
    const sev = (issue.severity ?? 'error').toUpperCase();
    lines.push(`  [${sev}] ${issue.code}: ${issue.message}`);
  }
  lines.push('');
  return lines.join('\n');
}

function formatShowHuman(data: RegistryOutput, lookup: string): string {
  const lines = [
    '',
    'Project Registry',
    `  manifest: ${data.manifest_path}`,
    `  view: ${data.view_path}${data.view_stale ? ' (STALE)' : ' (fresh)'}`,
    `  hash: ${data.content_hash ?? '—'}`,
    `  ai-context: ${data.ai_context?.status ?? '—'} (${AI_CONTEXT_PATH})`,
    `  issues: ${String(data.issue_summary?.error ?? 0)} error / ${String(data.issue_summary?.warning ?? 0)} warning`,
    '',
    '  Counts:',
  ];
  for (const [key, value] of Object.entries(data.counts ?? {}).sort()) {
    lines.push(`    ${key}: ${String(value)}`);
  }
  if (data.matches !== undefined) {
    lines.push('', `  Filter "${data.filter ?? ''}": ${String(data.matches.length)} match(es)`);
    for (const match of data.matches) {
      lines.push(
        `    - ${match.collection}/${match.id}${match.title !== undefined ? ` — ${match.title}` : ''}${match.name !== undefined ? ` (${match.name})` : ''}`,
      );
    }
  }
  lines.push('', lookup, '');
  return lines.join('\n');
}
