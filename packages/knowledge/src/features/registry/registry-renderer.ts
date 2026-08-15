import { createHash } from 'node:crypto';

import type { ProjectRegistry } from '@l1dder/schemas';

/** HTML comment marker that embeds the content hash in a generated view. */
export const REGISTRY_HASH_MARKER_PREFIX = '<!-- l1dder:registry-hash ';

/** Regex that extracts the 12-hex content hash from a generated registry view. */
export const REGISTRY_HASH_MARKER_RE =
  /<!--\s*l1dder:registry-hash\s+([a-f0-9]{12})\s*-->/;

/**
 * Render the deterministic human view for `knowledge/registry.md`.
 *
 * Includes a content-hash marker in the header. Equivalent registries (including
 * different input array order) produce byte-identical output.
 *
 * @param registry - Schema-valid project registry
 * @returns Full Markdown document including the hash marker line
 */
export function renderRegistry(registry: ProjectRegistry): string {
  const body = renderRegistryBody(registry);
  const hash = hashContent(body);
  return `${REGISTRY_HASH_MARKER_PREFIX}${hash} -->\n${body}`;
}

/**
 * Compute the 12-hex sha256 content hash for a registry view.
 *
 * Hashes the deterministic body only (never the hash-marker line itself).
 *
 * @param registry - Schema-valid project registry
 * @returns First 12 hex characters of sha256(body)
 */
export function registryContentHash(registry: ProjectRegistry): string {
  return hashContent(renderRegistryBody(registry));
}

/**
 * Why a generated registry view is considered fresh or stale.
 *
 * - `fresh` — byte-identical to {@link renderRegistry}
 * - `missing` — file absent (`existingView` is `undefined`)
 * - `missing-marker` — no valid hash marker in the file
 * - `manifest-changed` — marker hash differs from the current manifest hash
 * - `view-edited` — marker hash still matches, but the file body was edited
 */
export type GeneratedViewFreshnessStatus =
  | 'fresh'
  | 'missing'
  | 'missing-marker'
  | 'manifest-changed'
  | 'view-edited';

/**
 * Classify freshness of an existing generated view against the registry.
 *
 * Stale when the marker is missing/broken, the marker hash disagrees with the
 * manifest, **or** the file bytes differ from a fresh {@link renderRegistry}
 * (manual edits that leave the marker intact).
 *
 * @param existingView - Current `knowledge/registry.md` contents, or `undefined` if missing
 * @param registry - Current parsed registry
 * @returns Freshness status for doctor / CLI messaging
 */
export function inspectGeneratedViewFreshness(
  existingView: string | undefined,
  registry: ProjectRegistry,
): GeneratedViewFreshnessStatus {
  if (existingView === undefined) {
    return 'missing';
  }

  const expected = renderRegistry(registry);
  if (existingView === expected) {
    return 'fresh';
  }

  const existingHash = extractRegistryContentHash(existingView);
  if (existingHash === undefined) {
    return 'missing-marker';
  }

  if (existingHash !== registryContentHash(registry)) {
    return 'manifest-changed';
  }

  return 'view-edited';
}

/**
 * Whether an existing generated view is stale relative to the registry.
 *
 * Missing/malformed markers, manifest drift, and manual body edits are stale.
 * Prefer {@link inspectGeneratedViewFreshness} when the reason matters.
 *
 * @param existingView - Current contents of `knowledge/registry.md` (if any)
 * @param registry - Current parsed registry
 * @returns `true` when the view must be regenerated
 */
export function isGeneratedViewStale(
  existingView: string,
  registry: ProjectRegistry,
): boolean {
  return inspectGeneratedViewFreshness(existingView, registry) !== 'fresh';
}

/**
 * Extract the embedded registry content hash from a view or ai-context file.
 *
 * @param content - File contents that may contain {@link REGISTRY_HASH_MARKER_PREFIX}
 * @returns 12-hex hash, or `undefined` when the marker is missing/malformed
 */
export function extractRegistryContentHash(
  content: string,
): string | undefined {
  return REGISTRY_HASH_MARKER_RE.exec(content)?.[1];
}

/**
 * Compact registry-first lookup instruction for agents.
 *
 * Embedded in the generated view and surfaced by `l1dder registry show`.
 *
 * @returns Deterministic Markdown section (no trailing blank line required)
 */
export function registryLookupInstruction(): string {
  return [
    '## Registry-first lookup',
    '',
    'Before creating a new model, enum, class/interface/type/schema, service,',
    'port, or adapter:',
    '',
    '1. Open `knowledge/project-registry.yml` (canonical) or this generated view.',
    '2. Search existing `features`, `models`, `enums`, `symbols`, and `test_contracts`.',
    '3. Reuse an existing id/export when it already covers the need; otherwise',
    '   add a new registry row with FEAT/UC/DEC/Test Contract links before coding.',
    '4. Refresh this view with `l1dder registry sync` after manifest edits.',
    '5. Prove behavior with `// @tc TC-…` markers above the matching `it()`/`test()`.',
  ].join('\n');
}

/**
 * Build the Markdown body without the hash marker (hash input).
 *
 * @param registry - Schema-valid project registry
 * @returns Deterministic Markdown body
 */
function renderRegistryBody(registry: ProjectRegistry): string {
  const lines: string[] = [
    '<!-- GENERATED FILE — do not edit. Source: knowledge/project-registry.yml -->',
    '',
    '# Project Registry',
    '',
    'Machine-readable source of truth: `knowledge/project-registry.yml`.',
    '',
  ];

  lines.push(...registryLookupInstruction().split('\n'), '');
  lines.push(...renderFeaturesTable(registry));
  lines.push(...renderUsecasesTable(registry));
  lines.push(...renderDecisionsTable(registry));
  lines.push(...renderIntegrationsTable(registry));
  lines.push(...renderModelsTable(registry));
  lines.push(...renderEnumsTable(registry));
  lines.push(...renderTestContractsTable(registry));
  lines.push(...renderSymbolsTable(registry));
  lines.push(...renderPublicApiDiagram(registry));
  lines.push(...renderDebtTable(registry));
  lines.push(...renderBacklogTable(registry));

  // Trailing newline for POSIX-friendly files.
  return `${lines.join('\n').replace(/\n+$/u, '')}\n`;
}

/** Hard cap on Mermaid nodes so generated views stay reviewable. */
const PUBLIC_API_DIAGRAM_NODE_LIMIT = 60;

/**
 * @param registry - Registry document
 * @returns Markdown lines for the Symbols table
 */
function renderSymbolsTable(registry: ProjectRegistry): string[] {
  const rows = [...registry.symbols].sort(byText((item) => item.id));
  const lines = [
    '## Symbols',
    '',
    '| ID | Name | Kind | Package | Export | File | Features |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];

  for (const symbol of rows) {
    lines.push(
      `| ${cell(symbol.id)} | ${cell(symbol.name)} | ${cell(symbol.kind)} | ${cell(symbol.package ?? '')} | ${cell(symbol.export_path ?? '')} | ${cell(symbol.file)} | ${cell(joinSorted(symbol.features))} |`,
    );
  }

  if (rows.length === 0) {
    lines.push('| — | — | — | — | — | — | — |');
  }

  lines.push('');
  return lines;
}

/**
 * Render a bounded, deterministic Mermaid diagram of public API symbols.
 *
 * Only symbols with `export_path` are included (private helpers must not appear).
 * Edges come from manifest links: symbol → each linked FEAT / MODEL.
 * FEAT/MODEL nodes sit outside package subgraphs. Node count (symbols + linked
 * FEAT/MODEL) is capped at {@link PUBLIC_API_DIAGRAM_NODE_LIMIT}; edges only
 * connect visible nodes.
 *
 * @param registry - Registry document
 * @returns Markdown lines for the Domain / Public API section
 */
function renderPublicApiDiagram(registry: ProjectRegistry): string[] {
  const publicSymbols = [...registry.symbols]
    .filter((symbol) => symbol.export_path !== undefined)
    .sort((a, b) => {
      const pkgA = a.package ?? '';
      const pkgB = b.package ?? '';
      if (pkgA !== pkgB) return pkgA < pkgB ? -1 : 1;
      if (a.name !== b.name) return a.name < b.name ? -1 : 1;
      if (a.file === b.file) return 0;
      return a.file < b.file ? -1 : 1;
    });

  const { visibleSymbols, featureIds, modelIds, hiddenSymbols } =
    selectDiagramNodes(publicSymbols);

  const lines = [
    '## Domain / Public API',
    '',
    '```mermaid',
    'flowchart LR',
  ];

  if (visibleSymbols.length === 0) {
    lines.push('  empty["No public symbols"]');
  } else {
    const byPackage = new Map<string, typeof visibleSymbols>();
    for (const symbol of visibleSymbols) {
      const pkg = symbol.package ?? '(unknown)';
      const list = byPackage.get(pkg) ?? [];
      list.push(symbol);
      byPackage.set(pkg, list);
    }

    const packages = [...byPackage.keys()].sort();
    for (const pkg of packages) {
      const subgraphId = mermaidId(`pkg_${pkg}`);
      lines.push(`  subgraph ${subgraphId}["${escapeMermaidLabel(pkg)}"]`);
      const symbols = byPackage.get(pkg) ?? [];
      for (const symbol of symbols) {
        const nodeId = mermaidId(`sym_${symbol.id}`);
        const label = `${symbol.name}\\n${symbol.kind}`;
        lines.push(`    ${nodeId}["${escapeMermaidLabel(label)}"]`);
      }
      lines.push('  end');
    }

    for (const featureId of featureIds) {
      const nodeId = mermaidId(`feat_${featureId}`);
      lines.push(`  ${nodeId}["${escapeMermaidLabel(featureId)}"]`);
    }
    for (const modelId of modelIds) {
      const nodeId = mermaidId(`model_${modelId}`);
      lines.push(`  ${nodeId}["${escapeMermaidLabel(modelId)}"]`);
    }

    const visibleFeatSet = new Set(featureIds);
    const visibleModelSet = new Set(modelIds);
    const edges: string[] = [];
    for (const symbol of visibleSymbols) {
      const from = mermaidId(`sym_${symbol.id}`);
      for (const featureId of [...symbol.features].sort()) {
        if (!visibleFeatSet.has(featureId)) continue;
        edges.push(`${from} --> ${mermaidId(`feat_${featureId}`)}`);
      }
      for (const modelId of [...symbol.models].sort()) {
        if (!visibleModelSet.has(modelId)) continue;
        edges.push(`${from} --> ${mermaidId(`model_${modelId}`)}`);
      }
    }
    edges.sort();
    for (const edge of edges) {
      lines.push(`  ${edge}`);
    }
  }

  lines.push('```', '');

  if (hiddenSymbols > 0) {
    lines.push(
      `_${String(hiddenSymbols)} additional public symbol(s) hidden (diagram capped at ${String(PUBLIC_API_DIAGRAM_NODE_LIMIT)} nodes)._`,
      '',
    );
  }

  return lines;
}

/**
 * Greedily select symbol + linked FEAT/MODEL nodes under the hard node cap.
 *
 * @param publicSymbols - Sorted public symbol entries
 * @returns Visible symbols, linked ids, and count of omitted symbols
 */
function selectDiagramNodes(
  publicSymbols: readonly ProjectRegistry['symbols'][number][],
): {
  readonly visibleSymbols: ProjectRegistry['symbols'][number][];
  readonly featureIds: readonly string[];
  readonly modelIds: readonly string[];
  readonly hiddenSymbols: number;
} {
  const visibleSymbols: ProjectRegistry['symbols'][number][] = [];
  const featureIds = new Set<string>();
  const modelIds = new Set<string>();
  let nodeCount = 0;

  for (const symbol of publicSymbols) {
    if (nodeCount + 1 > PUBLIC_API_DIAGRAM_NODE_LIMIT) {
      break;
    }
    visibleSymbols.push(symbol);
    nodeCount += 1;

    const pending = [
      ...[...symbol.features]
        .filter((id) => !featureIds.has(id))
        .map((id) => ({ kind: 'feature' as const, id })),
      ...[...symbol.models]
        .filter((id) => !modelIds.has(id))
        .map((id) => ({ kind: 'model' as const, id })),
    ].sort((a, b) => {
      if (a.id !== b.id) return a.id < b.id ? -1 : 1;
      if (a.kind === b.kind) return 0;
      return a.kind < b.kind ? -1 : 1;
    });

    for (const item of pending) {
      if (nodeCount >= PUBLIC_API_DIAGRAM_NODE_LIMIT) break;
      if (item.kind === 'feature') {
        featureIds.add(item.id);
      } else {
        modelIds.add(item.id);
      }
      nodeCount += 1;
    }
  }

  return {
    visibleSymbols,
    featureIds: [...featureIds].sort(),
    modelIds: [...modelIds].sort(),
    hiddenSymbols: publicSymbols.length - visibleSymbols.length,
  };
}

/**
 * Build a Mermaid-safe identifier from an arbitrary string.
 *
 * @param value - Raw id seed
 * @returns Identifier using only `[A-Za-z0-9_]`
 */
function mermaidId(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9_]/gu, '_');
  if (/^[A-Za-z_]/u.test(cleaned)) return cleaned;
  return `n_${cleaned}`;
}

/**
 * Escape characters that would break a Mermaid node/subgraph label.
 *
 * @param value - Raw label text
 * @returns Escaped label
 */
function escapeMermaidLabel(value: string): string {
  return value.replace(/"/gu, '#quot;').replace(/\[/gu, '(').replace(/\]/gu, ')');
}

/**
 * @param registry - Registry document
 * @returns Markdown lines for the Features section
 */
function renderFeaturesTable(registry: ProjectRegistry): string[] {
  const rows = [...registry.features].sort(byText((item) => item.id));
  const lines = [
    '## Features',
    '',
    '| ID | Title | Status | Usecases | Iterations |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const feature of rows) {
    lines.push(
      `| ${cell(feature.id)} | ${cell(feature.title)} | ${cell(feature.status)} | ${cell(joinSorted(feature.usecases))} | ${cell(joinSorted(feature.iterations))} |`,
    );
  }

  if (rows.length === 0) {
    lines.push('| — | — | — | — | — |');
  }

  lines.push('');
  return lines;
}

/**
 * @param registry - Registry document
 * @returns Markdown lines for the Usecases section
 */
function renderUsecasesTable(registry: ProjectRegistry): string[] {
  const rows = [...registry.usecases].sort(byText((item) => item.id));
  const lines = [
    '## Usecases',
    '',
    '| ID | Title | Feature | Models | Integrations | Test Contracts |',
    '| --- | --- | --- | --- | --- | --- |',
  ];

  for (const usecase of rows) {
    lines.push(
      `| ${cell(usecase.id)} | ${cell(usecase.title)} | ${cell(usecase.feature)} | ${cell(joinSorted(usecase.covers.models))} | ${cell(joinSorted(usecase.covers.integrations))} | ${cell(joinSorted(usecase.test_contracts))} |`,
    );
  }

  if (rows.length === 0) {
    lines.push('| — | — | — | — | — | — |');
  }

  lines.push('');
  return lines;
}

/**
 * @param registry - Registry document
 * @returns Markdown lines for the Decisions section
 */
function renderDecisionsTable(registry: ProjectRegistry): string[] {
  const rows = [...registry.decisions].sort(byText((item) => item.id));
  const lines = [
    '## Decisions',
    '',
    '| ID | Title | Status | Source | Links |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const decision of rows) {
    lines.push(
      `| ${cell(decision.id)} | ${cell(decision.title)} | ${cell(decision.status)} | ${cell(decision.source)} | ${cell(joinSorted(decision.links))} |`,
    );
  }

  if (rows.length === 0) {
    lines.push('| — | — | — | — | — |');
  }

  lines.push('');
  return lines;
}

/**
 * @param registry - Registry document
 * @returns Markdown lines for the Integrations section
 */
function renderIntegrationsTable(registry: ProjectRegistry): string[] {
  const rows = [...registry.integrations].sort(byText((item) => item.id));
  const lines = [
    '## Integrations',
    '',
    '| ID | Title | Source | Usecases |',
    '| --- | --- | --- | --- |',
  ];

  for (const integration of rows) {
    lines.push(
      `| ${cell(integration.id)} | ${cell(integration.title)} | ${cell(integration.source)} | ${cell(joinSorted(integration.usecases))} |`,
    );
  }

  if (rows.length === 0) {
    lines.push('| — | — | — | — |');
  }

  lines.push('');
  return lines;
}

/**
 * @param registry - Registry document
 * @returns Markdown lines for the Models section
 */
function renderModelsTable(registry: ProjectRegistry): string[] {
  const rows = [...registry.models].sort(byText((item) => item.id));
  const lines = [
    '## Models',
    '',
    '| ID | Title | Source | Usecases |',
    '| --- | --- | --- | --- |',
  ];

  for (const model of rows) {
    lines.push(
      `| ${cell(model.id)} | ${cell(model.title)} | ${cell(model.source)} | ${cell(joinSorted(model.usecases))} |`,
    );
  }

  if (rows.length === 0) {
    lines.push('| — | — | — | — |');
  }

  lines.push('');
  return lines;
}

/**
 * @param registry - Registry document
 * @returns Markdown lines for the Enums section
 */
function renderEnumsTable(registry: ProjectRegistry): string[] {
  const rows = [...registry.enums].sort(byText((item) => item.id));
  const lines = [
    '## Enums',
    '',
    '| ID | Title | Source | Usecases |',
    '| --- | --- | --- | --- |',
  ];

  for (const enumEntry of rows) {
    lines.push(
      `| ${cell(enumEntry.id)} | ${cell(enumEntry.title)} | ${cell(enumEntry.source)} | ${cell(joinSorted(enumEntry.usecases))} |`,
    );
  }

  if (rows.length === 0) {
    lines.push('| — | — | — | — |');
  }

  lines.push('');
  return lines;
}

/**
 * @param registry - Registry document
 * @returns Markdown lines for the Test Contracts section
 */
function renderTestContractsTable(registry: ProjectRegistry): string[] {
  const rows = [...registry.test_contracts].sort(byText((item) => item.id));
  const lines = [
    '## Test Contracts',
    '',
    '| ID | Title | Feature | Usecase | Task |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const tc of rows) {
    lines.push(
      `| ${cell(tc.id)} | ${cell(tc.title)} | ${cell(tc.feature)} | ${cell(tc.usecase)} | ${cell(tc.task ?? '')} |`,
    );
  }

  if (rows.length === 0) {
    lines.push('| — | — | — | — | — |');
  }

  lines.push('');
  return lines;
}

/**
 * @param registry - Registry document
 * @returns Markdown lines for the Debt section
 */
function renderDebtTable(registry: ProjectRegistry): string[] {
  const rows = [...registry.debt_items].sort(byText((item) => item.id));
  const lines = [
    '## Debt',
    '',
    '| ID | Title | Status | Severity | Source | Links |',
    '| --- | --- | --- | --- | --- | --- |',
  ];

  for (const debt of rows) {
    lines.push(
      `| ${cell(debt.id)} | ${cell(debt.title)} | ${cell(debt.status)} | ${cell(debt.severity)} | ${cell(debt.source)} | ${cell(joinSorted(debt.links))} |`,
    );
  }

  if (rows.length === 0) {
    lines.push('| — | — | — | — | — | — |');
  }

  lines.push('');
  return lines;
}

/**
 * @param registry - Registry document
 * @returns Markdown lines for the Backlog section
 */
function renderBacklogTable(registry: ProjectRegistry): string[] {
  const rows = [...registry.backlog_items].sort(byText((item) => item.id));
  const lines = [
    '## Backlog',
    '',
    '| ID | Title | Status | Priority | Kind | Source | Links |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];

  for (const item of rows) {
    lines.push(
      `| ${cell(item.id)} | ${cell(item.title)} | ${cell(item.status)} | ${cell(item.priority)} | ${cell(item.kind)} | ${cell(item.source)} | ${cell(joinSorted(item.links))} |`,
    );
  }

  if (rows.length === 0) {
    lines.push('| — | — | — | — | — | — | — |');
  }

  lines.push('');
  return lines;
}

/**
 * Escape pipe characters so Markdown table cells stay intact.
 *
 * @param value - Raw cell text
 * @returns Escaped cell text
 */
function cell(value: string): string {
  return value.replace(/\|/g, '\\|');
}

/**
 * Join list values in sorted order for deterministic cells.
 *
 * @param values - Ids or labels
 * @returns Comma-separated sorted list, or empty string
 */
function joinSorted(values: readonly string[]): string {
  return [...values].sort(byText((value) => value)).join(', ');
}

/**
 * Code-unit comparator keyed by a projection.
 *
 * Deliberately not `localeCompare`: collation depends on the host ICU data,
 * which would make generated views differ between machines.
 *
 * @param key - Projection selecting the sort key
 * @returns Comparator producing a stable, locale-independent order
 */
function byText<T>(key: (item: T) => string): (a: T, b: T) => number {
  return (a, b) => {
    const left = key(a);
    const right = key(b);
    if (left === right) return 0;
    return left < right ? -1 : 1;
  };
}

/**
 * SHA-256 truncated to 12 hex characters (same length as adapter content hash).
 *
 * @param content - Bytes to hash
 * @returns 12-character hex digest prefix
 */
function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 12);
}
