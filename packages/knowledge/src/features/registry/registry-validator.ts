import type {
  FileSystemPort,
  SymbolIndexerPort,
  TestContractEvidencePort,
} from '@l1dder/core';
import type { ProjectRegistry } from '@l1dder/schemas';
import { join } from 'node:path';

import {
  collectAnchorTargets,
  splitSourceAnchor,
} from './markdown-slug.js';
import {
  collectSymbolIssues,
  type RegistrySymbolIssueCode,
} from './registry-symbol-checks.js';
import {
  collectTestContractIssues,
  type RegistryTestContractIssueCode,
} from './registry-test-contract-checks.js';

/** Stable machine codes for registry filesystem/graph/symbol/TC issues. */
export type RegistryIssueCode =
  | 'REGISTRY_BROKEN_PATH'
  | 'REGISTRY_BROKEN_ANCHOR'
  | 'REGISTRY_ORPHAN'
  | 'REGISTRY_CYCLE'
  | 'REGISTRY_UNKNOWN_REF'
  | 'REGISTRY_VIEW_STALE'
  | RegistrySymbolIssueCode
  | RegistryTestContractIssueCode;

/** Severity of a registry finding. Absent/`error` fails the report. */
export type RegistryIssueSeverity = 'error' | 'warning';

/** One actionable registry validation finding. Consumers branch on `code`. */
export interface RegistryIssue {
  readonly code: RegistryIssueCode;
  /** Entity id or source-anchor string the issue is about. */
  readonly ref: string;
  /** English, actionable description (never used for control flow). */
  readonly message: string;
  /** Optional relative file path related to the issue. */
  readonly path?: string;
  /**
   * Finding severity. Defaults to `error` when omitted so existing consumers
   * and tests keep fail-closed behaviour.
   */
  readonly severity?: RegistryIssueSeverity;
}

/** Aggregate result of {@link RegistryValidator.validate}. */
export interface RegistryValidationReport {
  readonly ok: boolean;
  readonly issues: readonly RegistryIssue[];
}

/** Dependencies for {@link RegistryValidator} (Hexagonal Lite). */
export interface RegistryValidatorDeps {
  readonly fs: FileSystemPort;
  readonly projectRoot: string;
  /** Optional TypeScript indexer; when omitted, symbol checks are skipped. */
  readonly symbolIndexer?: SymbolIndexerPort;
  /**
   * Optional `@tc` evidence indexer; when omitted, test-contract evidence
   * checks are skipped.
   */
  readonly testContractIndexer?: TestContractEvidencePort;
}

/**
 * Validates registry concerns that Zod schemas cannot see.
 *
 * Checks broken source paths/anchors, orphan entities, relation cycles, and
 * (when configured) symbol / test-contract evidence indexes.
 * Never throws — all findings are returned as {@link RegistryIssue} values.
 */
export class RegistryValidator {
  private readonly fs: FileSystemPort;
  private readonly projectRoot: string;
  private readonly symbolIndexer: SymbolIndexerPort | undefined;
  private readonly testContractIndexer: TestContractEvidencePort | undefined;

  constructor(deps: RegistryValidatorDeps) {
    this.fs = deps.fs;
    this.projectRoot = deps.projectRoot;
    this.symbolIndexer = deps.symbolIndexer;
    this.testContractIndexer = deps.testContractIndexer;
  }

  /**
   * Run filesystem, graph, and (when configured) index checks.
   *
   * @param registry - Schema-valid project registry document
   * @returns Report with zero or more issues (`ok` when no error-severity findings)
   */
  async validate(registry: ProjectRegistry): Promise<RegistryValidationReport> {
    const issues: RegistryIssue[] = [];

    await this.collectPathAndAnchorIssues(registry, issues);
    collectOrphanIssues(registry, issues);
    collectPoolLinkIssues(registry, issues);
    collectCycleIssues(registry, issues);

    if (this.symbolIndexer !== undefined) {
      const indexed = await this.symbolIndexer.index(this.projectRoot);
      issues.push(...collectSymbolIssues(registry, indexed));
    }

    if (this.testContractIndexer !== undefined) {
      const tcIndex = await this.testContractIndexer.index(this.projectRoot);
      issues.push(...collectTestContractIssues(registry, tcIndex));
    }

    const hasErrors = issues.some(
      (issue) => (issue.severity ?? 'error') === 'error',
    );
    return { ok: !hasErrors, issues };
  }

  /**
   * Detect missing files and missing Markdown heading anchors.
   *
   * @param registry - Parsed registry
   * @param issues - Mutable issue accumulator
   */
  private async collectPathAndAnchorIssues(
    registry: ProjectRegistry,
    issues: RegistryIssue[],
  ): Promise<void> {
    const anchors = collectSourceAnchors(registry);
    const slugCache = new Map<string, ReadonlySet<string>>();

    for (const anchor of anchors) {
      const { filePath, headingSlug } = splitSourceAnchor(anchor);
      if (filePath.length === 0) {
        issues.push({
          code: 'REGISTRY_BROKEN_PATH',
          ref: anchor,
          message: `Source anchor has an empty file path: ${anchor}`,
        });
        continue;
      }

      const fullPath = join(this.projectRoot, filePath);
      const fileExists = await this.fs.exists(fullPath);
      if (!fileExists) {
        issues.push({
          code: 'REGISTRY_BROKEN_PATH',
          ref: anchor,
          message: `Source file does not exist: ${filePath}`,
          path: filePath,
        });
        continue;
      }

      if (headingSlug === undefined) {
        continue;
      }

      let slugs = slugCache.get(filePath);
      if (slugs === undefined) {
        try {
          const content = await this.fs.readFile(fullPath);
          slugs = collectAnchorTargets(content);
        } catch {
          issues.push({
            code: 'REGISTRY_BROKEN_PATH',
            ref: anchor,
            message: `Source file cannot be read: ${filePath}`,
            path: filePath,
          });
          continue;
        }
        slugCache.set(filePath, slugs);
      }

      if (!slugs.has(headingSlug)) {
        issues.push({
          code: 'REGISTRY_BROKEN_ANCHOR',
          ref: anchor,
          message: `Markdown anchor "${headingSlug}" not found in ${filePath} (no matching heading slug or explicit <a id>)`,
          path: filePath,
        });
      }
    }
  }
}

/**
 * Collect every typed source-anchor string from the manifest.
 *
 * @param registry - Parsed registry
 * @returns Deduplicated list of anchors to check on disk
 */
function collectSourceAnchors(registry: ProjectRegistry): readonly string[] {
  const anchors = new Set<string>();

  for (const feature of registry.features) {
    const { sources } = feature;
    if (sources.to_be !== undefined) anchors.add(sources.to_be);
    if (sources.as_is !== undefined) anchors.add(sources.as_is);
    if (sources.spec !== undefined) anchors.add(sources.spec);
  }

  for (const usecase of registry.usecases) {
    anchors.add(usecase.sources.requirements);
    for (const arch of usecase.covers.architecture) {
      anchors.add(arch);
    }
  }

  for (const decision of registry.decisions) {
    anchors.add(decision.source);
  }
  for (const integration of registry.integrations) {
    anchors.add(integration.source);
  }
  for (const model of registry.models) {
    anchors.add(model.source);
  }
  for (const enumEntry of registry.enums) {
    anchors.add(enumEntry.source);
  }
  for (const tc of registry.test_contracts) {
    if (tc.source !== undefined) anchors.add(tc.source);
  }
  for (const debt of registry.debt_items) {
    anchors.add(debt.source);
  }
  for (const backlog of registry.backlog_items) {
    anchors.add(backlog.source);
  }

  return [...anchors].sort();
}

/**
 * Detect entities that nothing references.
 *
 * Orphan kinds: usecases, models, enums, integrations, test contracts.
 * A relation counts in either direction: `usecases[].covers` / free-form
 * `links` pointing at the entity, or the entity declaring its own
 * `usecases` back-reference. Enums are only reachable through the latter two,
 * since `covers` has no `enums` field.
 *
 * @param registry - Parsed registry
 * @param issues - Mutable issue accumulator
 */
function collectOrphanIssues(
  registry: ProjectRegistry,
  issues: RegistryIssue[],
): void {
  const referenced = new Set<string>();

  for (const feature of registry.features) {
    for (const ucId of feature.usecases) {
      referenced.add(ucId);
    }
  }

  for (const usecase of registry.usecases) {
    for (const modelId of usecase.covers.models) {
      referenced.add(modelId);
    }
    for (const integrationId of usecase.covers.integrations) {
      referenced.add(integrationId);
    }
    for (const tcId of usecase.test_contracts) {
      referenced.add(tcId);
    }
  }

  for (const id of collectFreeFormLinkIds(registry)) {
    referenced.add(id);
  }

  for (const usecase of registry.usecases) {
    if (!referenced.has(usecase.id)) {
      issues.push({
        code: 'REGISTRY_ORPHAN',
        ref: usecase.id,
        message: `Usecase ${usecase.id} is not referenced by any features[].usecases`,
      });
    }
  }

  for (const model of registry.models) {
    if (!referenced.has(model.id) && model.usecases.length === 0) {
      issues.push({
        code: 'REGISTRY_ORPHAN',
        ref: model.id,
        message: `Model ${model.id} has no usecase relation in either direction`,
      });
    }
  }

  for (const integration of registry.integrations) {
    if (!referenced.has(integration.id) && integration.usecases.length === 0) {
      issues.push({
        code: 'REGISTRY_ORPHAN',
        ref: integration.id,
        message: `Integration ${integration.id} has no usecase relation in either direction`,
      });
    }
  }

  for (const enumEntry of registry.enums) {
    if (!referenced.has(enumEntry.id) && enumEntry.usecases.length === 0) {
      issues.push({
        code: 'REGISTRY_ORPHAN',
        ref: enumEntry.id,
        message: `Enum ${enumEntry.id} has no usecase relation in either direction`,
      });
    }
  }

  for (const tc of registry.test_contracts) {
    if (!referenced.has(tc.id)) {
      issues.push({
        code: 'REGISTRY_ORPHAN',
        ref: tc.id,
        message: `Test contract ${tc.id} is not referenced by any usecases[].test_contracts`,
      });
    }
  }

  for (const debt of registry.debt_items) {
    if (!referenced.has(debt.id) && debt.links.length === 0) {
      issues.push({
        code: 'REGISTRY_ORPHAN',
        ref: debt.id,
        message: `Debt ${debt.id} has no links and is not referenced by any free-form links`,
      });
    }
  }

  for (const backlog of registry.backlog_items) {
    if (!referenced.has(backlog.id) && backlog.links.length === 0) {
      issues.push({
        code: 'REGISTRY_ORPHAN',
        ref: backlog.id,
        message: `Backlog ${backlog.id} has no links and is not referenced by any free-form links`,
      });
    }
  }
}

/** Typed registry id prefixes that may appear in free-form `links`. */
const TYPED_LINK_RE =
  /^(FEAT|UC|DEC|MODEL|ENUM|INT|TC|DEBT|BL|SYM)-/u;

/**
 * Validate typed id links on debt/backlog pool rows.
 *
 * Only values that look like registry ids are checked — narrative file anchors
 * are ignored (runtime must not treat prose as machine state).
 *
 * @param registry - Parsed registry
 * @param issues - Mutable issue accumulator
 */
function collectPoolLinkIssues(
  registry: ProjectRegistry,
  issues: RegistryIssue[],
): void {
  const known = collectKnownIds(registry);

  const checkLinks = (
    id: string,
    links: readonly string[],
    pathPrefix: string,
  ): void => {
    for (const link of links) {
      if (!TYPED_LINK_RE.test(link)) continue;
      if (known.has(link)) continue;
      issues.push({
        code: 'REGISTRY_UNKNOWN_REF',
        ref: id,
        message: `${pathPrefix} link "${link}" does not match any declared registry id`,
        path: pathPrefix,
        severity: 'error',
      });
    }
  };

  const checkPromotion = (
    id: string,
    status: string,
    nomination:
      | {
          readonly iteration: string;
          readonly session?: string | undefined;
        }
      | undefined,
    pathPrefix: string,
  ): void => {
    if (
      (status === 'nominated' || status === 'scheduled') &&
      nomination === undefined
    ) {
      issues.push({
        code: 'REGISTRY_UNKNOWN_REF',
        ref: id,
        message: `${pathPrefix} status is "${status}" but nomination is missing`,
        path: `${pathPrefix}.nomination`,
        severity: 'error',
      });
      return;
    }
    if (nomination === undefined) return;

    // Session may optionally reference a typed registry id; narrative labels
    // are ignored (no prose-as-state).
    const session = nomination.session;
    if (
      session !== undefined &&
      TYPED_LINK_RE.test(session) &&
      !known.has(session)
    ) {
      issues.push({
        code: 'REGISTRY_UNKNOWN_REF',
        ref: id,
        message: `${pathPrefix} nomination.session "${session}" does not match any declared registry id`,
        path: `${pathPrefix}.nomination.session`,
        severity: 'error',
      });
    }
  };

  for (const debt of registry.debt_items) {
    const pathPrefix = `debt_items[${debt.id}]`;
    checkLinks(debt.id, debt.links, pathPrefix);
    checkPromotion(debt.id, debt.status, debt.nomination, pathPrefix);
  }
  for (const backlog of registry.backlog_items) {
    const pathPrefix = `backlog_items[${backlog.id}]`;
    checkLinks(backlog.id, backlog.links, pathPrefix);
    checkPromotion(backlog.id, backlog.status, backlog.nomination, pathPrefix);
  }
}

/**
 * Detect directed cycles among registry id relations.
 *
 * Typed edges use a single forward direction (feature→usecase→covers/TC) so
 * structural parent/back-ref pairs do not create ubiquitous 2-cycles. Free-form
 * `links` values that match known ids are included as edges.
 *
 * @param registry - Parsed registry
 * @param issues - Mutable issue accumulator
 */
function collectCycleIssues(
  registry: ProjectRegistry,
  issues: RegistryIssue[],
): void {
  const graph = buildRelationGraph(registry);
  const cycles = findCycles(graph);

  for (const cycle of cycles) {
    const path = cycle.join(' → ');
    const start = cycle[0] ?? 'unknown';
    issues.push({
      code: 'REGISTRY_CYCLE',
      ref: start,
      message: `Relation cycle detected: ${path}`,
    });
  }
}

/**
 * Build adjacency lists for cycle detection.
 *
 * @param registry - Parsed registry
 * @returns Directed graph of known entity ids
 */
function buildRelationGraph(
  registry: ProjectRegistry,
): Map<string, string[]> {
  const knownIds = collectKnownIds(registry);
  const graph = new Map<string, string[]>();

  for (const id of knownIds) {
    graph.set(id, []);
  }

  const addEdge = (from: string, to: string): void => {
    if (!knownIds.has(from) || !knownIds.has(to) || from === to) return;
    const edges = graph.get(from);
    if (edges === undefined) return;
    if (!edges.includes(to)) {
      edges.push(to);
    }
  };

  for (const feature of registry.features) {
    for (const ucId of feature.usecases) {
      addEdge(feature.id, ucId);
    }
  }

  for (const usecase of registry.usecases) {
    for (const modelId of usecase.covers.models) {
      addEdge(usecase.id, modelId);
    }
    for (const integrationId of usecase.covers.integrations) {
      addEdge(usecase.id, integrationId);
    }
    for (const tcId of usecase.test_contracts) {
      addEdge(usecase.id, tcId);
    }
  }

  for (const decision of registry.decisions) {
    for (const link of decision.links) {
      addEdge(decision.id, link);
    }
  }

  for (const debt of registry.debt_items) {
    for (const link of debt.links) {
      addEdge(debt.id, link);
    }
  }

  for (const backlog of registry.backlog_items) {
    for (const link of backlog.links) {
      addEdge(backlog.id, link);
    }
  }

  // Stable edge order for deterministic issue messages.
  for (const edges of graph.values()) {
    edges.sort();
  }

  return graph;
}

/**
 * Collect every declared entity id in the manifest.
 *
 * @param registry - Parsed registry
 * @returns Set of known ids
 */
function collectKnownIds(registry: ProjectRegistry): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const item of registry.features) ids.add(item.id);
  for (const item of registry.usecases) ids.add(item.id);
  for (const item of registry.decisions) ids.add(item.id);
  for (const item of registry.integrations) ids.add(item.id);
  for (const item of registry.models) ids.add(item.id);
  for (const item of registry.enums) ids.add(item.id);
  for (const item of registry.test_contracts) ids.add(item.id);
  for (const item of registry.symbols) ids.add(item.id);
  for (const item of registry.debt_items) ids.add(item.id);
  for (const item of registry.backlog_items) ids.add(item.id);
  return ids;
}

/**
 * Free-form link values that coincide with declared entity ids.
 *
 * @param registry - Parsed registry
 * @returns Ids referenced from decisions/debt/backlog `links`
 */
function collectFreeFormLinkIds(registry: ProjectRegistry): ReadonlySet<string> {
  const known = collectKnownIds(registry);
  const refs = new Set<string>();

  const consider = (links: readonly string[]): void => {
    for (const link of links) {
      if (known.has(link)) refs.add(link);
    }
  };

  for (const decision of registry.decisions) consider(decision.links);
  for (const debt of registry.debt_items) consider(debt.links);
  for (const backlog of registry.backlog_items) consider(backlog.links);

  return refs;
}

/**
 * DFS cycle detection with three colors; each cycle path ends on the start id.
 *
 * @param graph - Directed adjacency lists
 * @returns List of cycle paths (each closes on the repeated node)
 */
function findCycles(graph: Map<string, string[]>): string[][] {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;

  const color = new Map<string, number>();
  const stack: string[] = [];
  const cycles: string[][] = [];
  const seenCycleKeys = new Set<string>();

  const nodes = [...graph.keys()].sort();
  for (const node of nodes) {
    color.set(node, WHITE);
  }

  const dfs = (node: string): void => {
    color.set(node, GRAY);
    stack.push(node);

    const edges = graph.get(node) ?? [];
    for (const next of edges) {
      const nextColor = color.get(next) ?? WHITE;
      if (nextColor === GRAY) {
        const startIndex = stack.indexOf(next);
        if (startIndex >= 0) {
          const path = [...stack.slice(startIndex), next];
          const key = canonicalizeCycleKey(path);
          if (!seenCycleKeys.has(key)) {
            seenCycleKeys.add(key);
            cycles.push(path);
          }
        }
      } else if (nextColor === WHITE) {
        dfs(next);
      }
    }

    stack.pop();
    color.set(node, BLACK);
  };

  for (const node of nodes) {
    if ((color.get(node) ?? WHITE) === WHITE) {
      dfs(node);
    }
  }

  return cycles;
}

/**
 * Normalize a cycle path so the same loop is reported once.
 *
 * @param path - Cycle path that ends with a repeat of the start node
 * @returns Stable key independent of walk entry point
 */
function canonicalizeCycleKey(path: string[]): string {
  if (path.length < 2) return path.join('>');
  // Drop the closing repeat for rotation.
  const body = path.slice(0, -1);
  if (body.length === 0) return path.join('>');

  let minIndex = 0;
  for (let i = 1; i < body.length; i++) {
    const current = body[i];
    const min = body[minIndex];
    if (current !== undefined && min !== undefined && current < min) {
      minIndex = i;
    }
  }

  const rotated = [...body.slice(minIndex), ...body.slice(0, minIndex)];
  return `${rotated.join('>')}>${rotated[0] ?? ''}`;
}
