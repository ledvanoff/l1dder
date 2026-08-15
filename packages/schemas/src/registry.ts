import { z } from 'zod/v4';

import { BacklogItemSchema, DebtItemSchema } from './debt-backlog.js';
import { WorkflowProfileIdSchema } from './workflow-profile.js';

/**
 * Canonical traceability manifest (`knowledge/project-registry.yml`).
 *
 * Holds machine-readable relations (FEAT→UC→DEC/MODEL/INT/TC) and pool indexes.
 * Narrative stays in Markdown; this contract only validates structure, IDs, and
 * cross-references.
 *
 * @packageDocumentation
 */

/** Current `schema_version` literal accepted by {@link ProjectRegistrySchema}. */
export const CURRENT_REGISTRY_SCHEMA_VERSION = 1 as const;

/** Short human label stored in the manifest (not full narrative). */
const ShortTitle = z.string().min(1).max(120);

/** File path + optional `#anchor` pointing at narrative source. */
const SourceAnchor = z.string().min(1);

// ─── ID schemas ───

/** Stable feature id: `FEAT-NNN`. */
export const FeatureIdSchema = z.string().regex(/^FEAT-\d{3}$/);

/** Stable usecase id: `UC-NNN-MM` (NNN must match parent feature number). */
export const UsecaseIdSchema = z.string().regex(/^UC-\d{3}-\d{2}$/);

/** Stable domain model id: `MODEL-NNN`. */
export const ModelIdSchema = z.string().regex(/^MODEL-\d{3}$/);

/** Stable enum id: `ENUM-NNN`. */
export const EnumIdSchema = z.string().regex(/^ENUM-\d{3}$/);

/** Stable test-contract id: `TC-NNN-MM-L` (e.g. `TC-001-05-A`). */
export const TestContractIdSchema = z.string().regex(/^TC-\d{3}-\d{2}-[A-Z]$/);

/**
 * Integration id: `INT-` + at least two digits (`INT-01`…`INT-07` and longer).
 */
export const IntegrationIdSchema = z.string().regex(/^INT-\d{2,}$/);

/**
 * Decision id without forcing a historical rename.
 *
 * Accepts forms such as `DEC-6-1`, `DEC-DM-15`, `DEC-HARD-02`, `DEC-TR-5`.
 */
export const DecisionIdSchema = z
  .string()
  .regex(/^DEC-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+$/);

/** Stable code-symbol id: `SYM-NNN`. */
export const SymbolIdSchema = z.string().regex(/^SYM-\d{3}$/);

/** Stable delivery iteration id: `ITER-NNN`. */
export const IterationIdSchema = z.string().regex(/^ITER-\d{3}$/);

/**
 * Delivery / Agent Session id (e.g. `AS-1`, `HARD-5`, `HARD-D`, `H-HARD`,
 * `DF-E1`).
 *
 * Uppercase letter prefix, hyphen, alphanumeric suffix. The suffix is not
 * digits-only: real session rails label discovery sessions `<ITER>-D` and
 * hygiene sessions `H-<ITER>`, so a numeric-only suffix cannot express them.
 */
export const DeliverySessionIdSchema = z
  .string()
  .regex(/^[A-Z][A-Z0-9]{0,9}-[A-Z0-9]{1,6}$/);

/** Lifecycle status of a delivery iteration or session rail entry. */
export const DeliveryRailStatusSchema = z.enum([
  'pending',
  'in_progress',
  'done',
  'skipped',
]);

// ─── Entry schemas ───

/**
 * Kind of a registered code symbol.
 *
 * Syntactic kinds (`class`…`schema`) come from the indexer; semantic kinds
 * (`service`/`port`/`adapter`) are manifest labels for architecture roles.
 */
export const SymbolKindSchema = z.enum([
  'class',
  'interface',
  'type',
  'enum',
  'function',
  'const',
  'schema',
  'service',
  'port',
  'adapter',
]);

/** Lifecycle status of a registry feature entry. */
export const FeatureStatusSchema = z.enum([
  'planned',
  'in_progress',
  'done',
  'dropped',
]);

/** Optional Markdown anchors for a feature's narrative surfaces. */
export const FeatureSourcesSchema = z
  .object({
    to_be: SourceAnchor.optional(),
    as_is: SourceAnchor.optional(),
    spec: SourceAnchor.optional(),
  })
  .strict();

/** One feature row in the traceability manifest. */
export const FeatureEntrySchema = z
  .object({
    id: FeatureIdSchema,
    title: ShortTitle,
    status: FeatureStatusSchema,
    usecases: z.array(UsecaseIdSchema).default([]),
    sources: FeatureSourcesSchema.default({}),
    iterations: z.array(z.string().min(1)).default([]),
  })
  .strict();

/** Coverage links from a usecase to architecture / integrations / models. */
export const UsecaseCoversSchema = z
  .object({
    architecture: z.array(SourceAnchor).default([]),
    integrations: z.array(IntegrationIdSchema).default([]),
    models: z.array(ModelIdSchema).default([]),
  })
  .strict();

/** Required requirements-anchor block for a usecase. */
export const UsecaseSourcesSchema = z
  .object({
    requirements: SourceAnchor,
  })
  .strict();

/** One usecase row in the traceability manifest. */
export const UsecaseEntrySchema = z
  .object({
    id: UsecaseIdSchema,
    title: ShortTitle,
    feature: FeatureIdSchema,
    sources: UsecaseSourcesSchema,
    covers: UsecaseCoversSchema.default({
      architecture: [],
      integrations: [],
      models: [],
    }),
    test_contracts: z.array(TestContractIdSchema).default([]),
  })
  .strict();

/** Lifecycle status of a registry decision entry. */
export const DecisionEntryStatusSchema = z.enum([
  'accepted',
  'superseded',
  'rejected',
]);

/** One decision row in the traceability manifest. */
export const DecisionEntrySchema = z
  .object({
    id: DecisionIdSchema,
    title: ShortTitle,
    source: SourceAnchor,
    status: DecisionEntryStatusSchema.default('accepted'),
    links: z.array(z.string().min(1)).default([]),
  })
  .strict();

/** One integration row in the traceability manifest. */
export const IntegrationEntrySchema = z
  .object({
    id: IntegrationIdSchema,
    title: ShortTitle,
    source: SourceAnchor,
    usecases: z.array(UsecaseIdSchema).default([]),
  })
  .strict();

/** One domain-model row in the traceability manifest. */
export const ModelEntrySchema = z
  .object({
    id: ModelIdSchema,
    title: ShortTitle,
    source: SourceAnchor,
    usecases: z.array(UsecaseIdSchema).default([]),
  })
  .strict();

/** One enum row in the traceability manifest. */
export const EnumEntrySchema = z
  .object({
    id: EnumIdSchema,
    title: ShortTitle,
    source: SourceAnchor,
    usecases: z.array(UsecaseIdSchema).default([]),
  })
  .strict();

/** One test-contract row linking FEAT/UC/(task) to expected behavior. */
export const TestContractEntrySchema = z
  .object({
    id: TestContractIdSchema,
    title: ShortTitle,
    feature: FeatureIdSchema,
    usecase: UsecaseIdSchema,
    task: z.string().min(1).optional(),
    source: SourceAnchor.optional(),
    /**
     * When `true` (default), missing `@tc` evidence fails registry check.
     * When `false`, missing evidence is a warning only.
     */
    required: z.boolean().default(true),
  })
  .strict();

/**
 * One public/domain code-symbol row linked to FEAT/UC/MODEL.
 *
 * `file` is a repo-relative TypeScript path (not a Markdown source anchor) and
 * is excluded from unique-anchor checks. Pair `(name, file)` must be unique.
 */
export const SymbolEntrySchema = z
  .object({
    id: SymbolIdSchema,
    name: z.string().min(1),
    kind: SymbolKindSchema,
    file: z.string().min(1),
    package: z.string().min(1).optional(),
    export_path: z.string().min(1).optional(),
    features: z.array(FeatureIdSchema).default([]),
    usecases: z.array(UsecaseIdSchema).default([]),
    models: z.array(ModelIdSchema).default([]),
  })
  .strict();

/** One Agent Session row nested under a delivery iteration. */
export const DeliverySessionEntrySchema = z
  .object({
    id: DeliverySessionIdSchema,
    title: ShortTitle,
    status: DeliveryRailStatusSchema,
    profile: WorkflowProfileIdSchema,
    depends_on: z.array(DeliverySessionIdSchema).default([]),
    features: z.array(FeatureIdSchema).default([]),
    usecases: z.array(UsecaseIdSchema).default([]),
    source_anchor: SourceAnchor,
  })
  .strict();

/** One delivery iteration row with nested Agent Sessions. */
export const IterationEntrySchema = z
  .object({
    id: IterationIdSchema,
    title: ShortTitle,
    status: DeliveryRailStatusSchema,
    depends_on: z.array(IterationIdSchema).default([]),
    sessions: z.array(DeliverySessionEntrySchema).default([]),
    source_anchor: SourceAnchor,
  })
  .strict();

// ─── Helpers for cross-field invariants ───

/**
 * Extracts the three-digit feature number from a `FEAT-NNN` id.
 *
 * @param id - Feature identifier
 * @returns Digits, or `undefined` when the id shape is unexpected
 */
function featureNumber(id: string): string | undefined {
  return /^FEAT-(\d{3})$/.exec(id)?.[1];
}

/**
 * Extracts the parent feature number from a `UC-NNN-MM` id.
 *
 * @param id - Usecase identifier
 * @returns Digits, or `undefined` when the id shape is unexpected
 */
function usecaseParentNumber(id: string): string | undefined {
  return /^UC-(\d{3})-\d{2}$/.exec(id)?.[1];
}

/** Shape of {@link ProjectRegistrySchema} after defaults are applied. */
type ProjectRegistryData = z.infer<typeof ProjectRegistryObjectSchema>;

/** Zod 4 parse payload for registry cross-field checks. */
type RegistryCheckCtx = z.core.ParsePayload<ProjectRegistryData>;

/**
 * Pushes a custom validation issue with an exact path.
 *
 * @param ctx - Zod check context
 * @param message - Short machine-useful English message
 * @param path - Exact issue path into the manifest
 */
function pushIssue(
  ctx: RegistryCheckCtx,
  message: string,
  path: Array<PropertyKey>,
): void {
  ctx.issues.push({
    code: 'custom',
    message,
    path,
    input: ctx.value,
  });
}

/**
 * Records an id occurrence; emits a custom issue when the id was already seen.
 *
 * @param seen - Map of id → first path
 * @param id - Identifier under check
 * @param path - Zod issue path for this occurrence
 * @param ctx - Zod check context
 */
function trackUniqueId(
  seen: Map<string, Array<PropertyKey>>,
  id: string,
  path: Array<PropertyKey>,
  ctx: RegistryCheckCtx,
): void {
  const previous = seen.get(id);
  if (previous !== undefined) {
    pushIssue(ctx, `duplicate id ${id}`, path);
    return;
  }
  seen.set(id, path);
}

/**
 * Records a source-anchor occurrence; emits a custom issue on duplicates.
 *
 * @param seen - Map of anchor → first path
 * @param anchor - Anchor string
 * @param path - Zod issue path for this occurrence
 * @param ctx - Zod check context
 */
function trackUniqueAnchor(
  seen: Map<string, Array<PropertyKey>>,
  anchor: string,
  path: Array<PropertyKey>,
  ctx: RegistryCheckCtx,
): void {
  const previous = seen.get(anchor);
  if (previous !== undefined) {
    pushIssue(ctx, `duplicate source anchor ${anchor}`, path);
    return;
  }
  seen.set(anchor, path);
}

/**
 * Emits an issue when a referenced id is missing from its target set.
 *
 * @param id - Referenced identifier
 * @param known - Set of declared ids in the target collection
 * @param path - Zod issue path of the reference
 * @param ctx - Zod check context
 */
function requireKnownId(
  id: string,
  known: ReadonlySet<string>,
  path: Array<PropertyKey>,
  ctx: RegistryCheckCtx,
): void {
  if (!known.has(id)) {
    pushIssue(ctx, `unknown reference ${id}`, path);
  }
}

/**
 * Detects a cycle in a directed adjacency list via Kahn's algorithm.
 *
 * @param nodes - Map of id → dependency ids
 * @returns One id that participates in a cycle, or `undefined` when acyclic
 */
function findCycleNode(
  nodes: ReadonlyMap<string, readonly string[]>,
): string | undefined {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const [id] of nodes) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (const [id, deps] of nodes) {
    for (const dep of deps) {
      if (!nodes.has(dep)) continue;
      adjacency.get(dep)?.push(id);
      inDegree.set(id, (inDegree.get(id) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  let visited = 0;
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    visited += 1;
    for (const neighbor of adjacency.get(current) ?? []) {
      const nextDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, nextDegree);
      if (nextDegree === 0) queue.push(neighbor);
    }
  }

  if (visited === nodes.size) {
    return undefined;
  }

  for (const [id, degree] of inDegree) {
    if (degree > 0) return id;
  }
  return undefined;
}

/**
 * Cross-field invariants for the project registry manifest.
 *
 * Enforces parent-number alignment, id uniqueness (per collection and global),
 * unique source anchors, and referential integrity of typed id links.
 *
 * @param ctx - Zod check context (`value` + mutable `issues`)
 */
function checkProjectRegistry(ctx: RegistryCheckCtx): void {
  const data = ctx.value;

  // 1) Parent-number invariant: UC-XXX-* must hang under FEAT-XXX.
  for (let i = 0; i < data.usecases.length; i++) {
    const usecase = data.usecases[i];
    if (usecase === undefined) continue;
    const ucNum = usecaseParentNumber(usecase.id);
    const featNum = featureNumber(usecase.feature);
    if (ucNum !== undefined && featNum !== undefined && ucNum !== featNum) {
      pushIssue(
        ctx,
        `usecase ${usecase.id} parent number must match feature ${usecase.feature}`,
        ['usecases', i, 'feature'],
      );
    }
  }

  // 2) Unique ids within each collection and globally across the manifest.
  const seenIds = new Map<string, Array<PropertyKey>>();
  const collections: Array<{
    key: keyof ProjectRegistryData;
    items: ReadonlyArray<{ id: string }>;
  }> = [
    { key: 'features', items: data.features },
    { key: 'usecases', items: data.usecases },
    { key: 'decisions', items: data.decisions },
    { key: 'integrations', items: data.integrations },
    { key: 'models', items: data.models },
    { key: 'enums', items: data.enums },
    { key: 'test_contracts', items: data.test_contracts },
    { key: 'symbols', items: data.symbols },
    { key: 'debt_items', items: data.debt_items },
    { key: 'backlog_items', items: data.backlog_items },
    { key: 'iterations', items: data.iterations },
  ];

  for (const { key, items } of collections) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item === undefined) continue;
      trackUniqueId(seenIds, item.id, [key, i, 'id'], ctx);
    }
  }

  // 2c) Session ids must be unique across all iterations (and vs other ids).
  for (let i = 0; i < data.iterations.length; i++) {
    const iteration = data.iterations[i];
    if (iteration === undefined) continue;
    for (let j = 0; j < iteration.sessions.length; j++) {
      const session = iteration.sessions[j];
      if (session === undefined) continue;
      trackUniqueId(
        seenIds,
        session.id,
        ['iterations', i, 'sessions', j, 'id'],
        ctx,
      );
    }
  }

  // 2b) Unique (name, file) pairs among symbols (file is not a Markdown anchor).
  const seenSymbolLocations = new Map<string, Array<PropertyKey>>();
  for (let i = 0; i < data.symbols.length; i++) {
    const symbol = data.symbols[i];
    if (symbol === undefined) continue;
    const key = `${symbol.name}\0${symbol.file}`;
    const previous = seenSymbolLocations.get(key);
    if (previous !== undefined) {
      pushIssue(
        ctx,
        `duplicate symbol name+file ${symbol.name} @ ${symbol.file}`,
        ['symbols', i, 'name'],
      );
      continue;
    }
    seenSymbolLocations.set(key, ['symbols', i, 'name']);
  }

  // 3) Unique source anchors across the whole manifest.
  const seenAnchors = new Map<string, Array<PropertyKey>>();

  for (let i = 0; i < data.features.length; i++) {
    const feature = data.features[i];
    if (feature === undefined) continue;
    const { sources } = feature;
    if (sources.to_be !== undefined) {
      trackUniqueAnchor(seenAnchors, sources.to_be, ['features', i, 'sources', 'to_be'], ctx);
    }
    if (sources.as_is !== undefined) {
      trackUniqueAnchor(seenAnchors, sources.as_is, ['features', i, 'sources', 'as_is'], ctx);
    }
    if (sources.spec !== undefined) {
      trackUniqueAnchor(seenAnchors, sources.spec, ['features', i, 'sources', 'spec'], ctx);
    }
  }

  for (let i = 0; i < data.usecases.length; i++) {
    const usecase = data.usecases[i];
    if (usecase === undefined) continue;
    trackUniqueAnchor(
      seenAnchors,
      usecase.sources.requirements,
      ['usecases', i, 'sources', 'requirements'],
      ctx,
    );
  }

  const singleSourceCollections: Array<{
    key: 'decisions' | 'integrations' | 'models' | 'enums' | 'debt_items' | 'backlog_items';
    items: ReadonlyArray<{ source: string }>;
  }> = [
    { key: 'decisions', items: data.decisions },
    { key: 'integrations', items: data.integrations },
    { key: 'models', items: data.models },
    { key: 'enums', items: data.enums },
    { key: 'debt_items', items: data.debt_items },
    { key: 'backlog_items', items: data.backlog_items },
  ];

  for (const { key, items } of singleSourceCollections) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item === undefined) continue;
      trackUniqueAnchor(seenAnchors, item.source, [key, i, 'source'], ctx);
    }
  }

  for (let i = 0; i < data.test_contracts.length; i++) {
    const tc = data.test_contracts[i];
    if (tc === undefined || tc.source === undefined) continue;
    trackUniqueAnchor(seenAnchors, tc.source, ['test_contracts', i, 'source'], ctx);
  }

  // Delivery rails (iterations / sessions) are exempt from global source-anchor
  // uniqueness: every session of an iteration legitimately points at the same
  // human Delivery Plan table anchor (e.g. knowledge/roadmap.md#delivery-plan).
  // Id uniqueness, depends_on integrity, and cycle checks for rails still apply.

  // 4) Referential integrity for typed id links.
  const featureIds = new Set(data.features.map((f) => f.id));
  const usecaseIds = new Set(data.usecases.map((u) => u.id));
  const integrationIds = new Set(data.integrations.map((x) => x.id));
  const modelIds = new Set(data.models.map((x) => x.id));
  const testContractIds = new Set(data.test_contracts.map((x) => x.id));
  const iterationIds = new Set(data.iterations.map((x) => x.id));
  const sessionIds = new Set(
    data.iterations.flatMap((iteration) =>
      iteration.sessions.map((session) => session.id),
    ),
  );

  for (let i = 0; i < data.features.length; i++) {
    const feature = data.features[i];
    if (feature === undefined) continue;
    for (let j = 0; j < feature.usecases.length; j++) {
      const ref = feature.usecases[j];
      if (ref === undefined) continue;
      requireKnownId(ref, usecaseIds, ['features', i, 'usecases', j], ctx);
    }
  }

  for (let i = 0; i < data.usecases.length; i++) {
    const usecase = data.usecases[i];
    if (usecase === undefined) continue;
    requireKnownId(usecase.feature, featureIds, ['usecases', i, 'feature'], ctx);

    for (let j = 0; j < usecase.covers.integrations.length; j++) {
      const ref = usecase.covers.integrations[j];
      if (ref === undefined) continue;
      requireKnownId(ref, integrationIds, ['usecases', i, 'covers', 'integrations', j], ctx);
    }

    for (let j = 0; j < usecase.covers.models.length; j++) {
      const ref = usecase.covers.models[j];
      if (ref === undefined) continue;
      requireKnownId(ref, modelIds, ['usecases', i, 'covers', 'models', j], ctx);
    }

    for (let j = 0; j < usecase.test_contracts.length; j++) {
      const ref = usecase.test_contracts[j];
      if (ref === undefined) continue;
      requireKnownId(ref, testContractIds, ['usecases', i, 'test_contracts', j], ctx);
    }
  }

  for (let i = 0; i < data.test_contracts.length; i++) {
    const tc = data.test_contracts[i];
    if (tc === undefined) continue;
    requireKnownId(tc.feature, featureIds, ['test_contracts', i, 'feature'], ctx);
    requireKnownId(tc.usecase, usecaseIds, ['test_contracts', i, 'usecase'], ctx);
  }

  for (let i = 0; i < data.symbols.length; i++) {
    const symbol = data.symbols[i];
    if (symbol === undefined) continue;
    for (let j = 0; j < symbol.features.length; j++) {
      const ref = symbol.features[j];
      if (ref === undefined) continue;
      requireKnownId(ref, featureIds, ['symbols', i, 'features', j], ctx);
    }
    for (let j = 0; j < symbol.usecases.length; j++) {
      const ref = symbol.usecases[j];
      if (ref === undefined) continue;
      requireKnownId(ref, usecaseIds, ['symbols', i, 'usecases', j], ctx);
    }
    for (let j = 0; j < symbol.models.length; j++) {
      const ref = symbol.models[j];
      if (ref === undefined) continue;
      requireKnownId(ref, modelIds, ['symbols', i, 'models', j], ctx);
    }
  }

  const usecaseBackrefCollections: Array<{
    key: 'integrations' | 'models' | 'enums';
    items: ReadonlyArray<{ usecases: readonly string[] }>;
  }> = [
    { key: 'integrations', items: data.integrations },
    { key: 'models', items: data.models },
    { key: 'enums', items: data.enums },
  ];

  for (const { key, items } of usecaseBackrefCollections) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item === undefined) continue;
      for (let j = 0; j < item.usecases.length; j++) {
        const ref = item.usecases[j];
        if (ref === undefined) continue;
        requireKnownId(ref, usecaseIds, [key, i, 'usecases', j], ctx);
      }
    }
  }

  // 5) Delivery rails: depends_on integrity, FEAT/UC refs, and DAG cycles.
  const iterationDeps = new Map<string, readonly string[]>();
  for (let i = 0; i < data.iterations.length; i++) {
    const iteration = data.iterations[i];
    if (iteration === undefined) continue;
    iterationDeps.set(iteration.id, iteration.depends_on);
    for (let j = 0; j < iteration.depends_on.length; j++) {
      const ref = iteration.depends_on[j];
      if (ref === undefined) continue;
      requireKnownId(ref, iterationIds, ['iterations', i, 'depends_on', j], ctx);
    }
  }

  const sessionDeps = new Map<string, readonly string[]>();
  for (let i = 0; i < data.iterations.length; i++) {
    const iteration = data.iterations[i];
    if (iteration === undefined) continue;
    for (let j = 0; j < iteration.sessions.length; j++) {
      const session = iteration.sessions[j];
      if (session === undefined) continue;
      sessionDeps.set(session.id, session.depends_on);

      for (let k = 0; k < session.depends_on.length; k++) {
        const ref = session.depends_on[k];
        if (ref === undefined) continue;
        requireKnownId(
          ref,
          sessionIds,
          ['iterations', i, 'sessions', j, 'depends_on', k],
          ctx,
        );
      }

      for (let k = 0; k < session.features.length; k++) {
        const ref = session.features[k];
        if (ref === undefined) continue;
        requireKnownId(
          ref,
          featureIds,
          ['iterations', i, 'sessions', j, 'features', k],
          ctx,
        );
      }

      for (let k = 0; k < session.usecases.length; k++) {
        const ref = session.usecases[k];
        if (ref === undefined) continue;
        requireKnownId(
          ref,
          usecaseIds,
          ['iterations', i, 'sessions', j, 'usecases', k],
          ctx,
        );
      }
    }
  }

  const iterationCycle = findCycleNode(iterationDeps);
  if (iterationCycle !== undefined) {
    const index = data.iterations.findIndex((item) => item.id === iterationCycle);
    pushIssue(
      ctx,
      `dependency cycle among iterations involving ${iterationCycle}`,
      ['iterations', index >= 0 ? index : 0, 'depends_on'],
    );
  }

  const sessionCycle = findCycleNode(sessionDeps);
  if (sessionCycle !== undefined) {
    let path: Array<PropertyKey> = ['iterations', 0, 'sessions', 0, 'depends_on'];
    for (let i = 0; i < data.iterations.length; i++) {
      const iteration = data.iterations[i];
      if (iteration === undefined) continue;
      const sessionIndex = iteration.sessions.findIndex(
        (session) => session.id === sessionCycle,
      );
      if (sessionIndex >= 0) {
        path = ['iterations', i, 'sessions', sessionIndex, 'depends_on'];
        break;
      }
    }
    pushIssue(
      ctx,
      `dependency cycle among sessions involving ${sessionCycle}`,
      path,
    );
  }
}

/** Structural half of the manifest: entry shapes without cross-field rules. */
const ProjectRegistryObjectSchema = z
  .object({
    schema_version: z.literal(CURRENT_REGISTRY_SCHEMA_VERSION),
    features: z.array(FeatureEntrySchema).default([]),
    usecases: z.array(UsecaseEntrySchema).default([]),
    decisions: z.array(DecisionEntrySchema).default([]),
    integrations: z.array(IntegrationEntrySchema).default([]),
    models: z.array(ModelEntrySchema).default([]),
    enums: z.array(EnumEntrySchema).default([]),
    test_contracts: z.array(TestContractEntrySchema).default([]),
    symbols: z.array(SymbolEntrySchema).default([]),
    debt_items: z.array(DebtItemSchema).default([]),
    backlog_items: z.array(BacklogItemSchema).default([]),
    iterations: z.array(IterationEntrySchema).default([]),
  })
  .strict();

/**
 * Full `knowledge/project-registry.yml` document schema.
 *
 * Structural fields use `.strict()` entry schemas; cross-field rules live in
 * {@link checkProjectRegistry}. Pool rows reuse {@link DebtItemSchema} /
 * {@link BacklogItemSchema} (registry-first — no duplicate shapes).
 */
export const ProjectRegistrySchema =
  ProjectRegistryObjectSchema.check(checkProjectRegistry);

/**
 * Deterministic JSON Schema for the project registry manifest.
 *
 * Lives next to {@link ProjectRegistrySchema} (single consumer, no shared
 * JSON-Schema helpers yet). Uses Zod 4 built-in `z.toJSONSchema` — structural
 * only; `.check()` invariants are not encoded in JSON Schema.
 *
 * @returns JSON Schema object for {@link ProjectRegistrySchema}
 */
export function projectRegistryJsonSchema(): z.core.JSONSchema.BaseSchema {
  return z.toJSONSchema(ProjectRegistrySchema);
}

// ─── Inferred types ───

/** Stable `FEAT-NNN` identifier. */
export type FeatureId = z.infer<typeof FeatureIdSchema>;
/** Stable `UC-NNN-MM` identifier. */
export type UsecaseId = z.infer<typeof UsecaseIdSchema>;
/** Stable `MODEL-NNN` identifier. */
export type ModelId = z.infer<typeof ModelIdSchema>;
/** Stable `ENUM-NNN` identifier. */
export type EnumId = z.infer<typeof EnumIdSchema>;
/** Stable `TC-NNN-MM-L` identifier. */
export type TestContractId = z.infer<typeof TestContractIdSchema>;
/** Stable `INT-NN+` identifier. */
export type IntegrationId = z.infer<typeof IntegrationIdSchema>;
/** Stable decision identifier (`DEC-…`). */
export type DecisionId = z.infer<typeof DecisionIdSchema>;
/** Stable `SYM-NNN` identifier. */
export type SymbolId = z.infer<typeof SymbolIdSchema>;
/** Stable `ITER-NNN` identifier. */
export type IterationId = z.infer<typeof IterationIdSchema>;
/** Delivery / Agent Session identifier (e.g. `HARD-5`). */
export type DeliverySessionId = z.infer<typeof DeliverySessionIdSchema>;
/** Lifecycle status of a delivery iteration or session rail entry. */
export type DeliveryRailStatus = z.infer<typeof DeliveryRailStatusSchema>;
/** Kind of a registered code symbol. */
export type SymbolKind = z.infer<typeof SymbolKindSchema>;
/** Lifecycle status of a registry feature. */
export type FeatureStatus = z.infer<typeof FeatureStatusSchema>;
/** Optional narrative anchors for a feature. */
export type FeatureSources = z.infer<typeof FeatureSourcesSchema>;
/** Feature row in the traceability manifest. */
export type Feature = z.infer<typeof FeatureEntrySchema>;
/** Coverage links from a usecase. */
export type UsecaseCovers = z.infer<typeof UsecaseCoversSchema>;
/** Requirements-anchor block for a usecase. */
export type UsecaseSources = z.infer<typeof UsecaseSourcesSchema>;
/** Usecase row in the traceability manifest. */
export type Usecase = z.infer<typeof UsecaseEntrySchema>;
/** Lifecycle status of a registry decision entry. */
export type DecisionEntryStatus = z.infer<typeof DecisionEntryStatusSchema>;
/**
 * Decision row in the traceability manifest.
 *
 * Named `DecisionEntry` to avoid clashing with state.yml `Decision`.
 */
export type DecisionEntry = z.infer<typeof DecisionEntrySchema>;
/** Integration row in the traceability manifest. */
export type Integration = z.infer<typeof IntegrationEntrySchema>;
/** Domain-model row in the traceability manifest. */
export type Model = z.infer<typeof ModelEntrySchema>;
/** Enum row in the traceability manifest. */
export type EnumEntry = z.infer<typeof EnumEntrySchema>;
/** Test-contract row in the traceability manifest. */
export type TestContract = z.infer<typeof TestContractEntrySchema>;
/**
 * Code-symbol row in the traceability manifest.
 *
 * Named `SymbolEntry` to avoid clashing with the global `Symbol` type.
 */
export type SymbolEntry = z.infer<typeof SymbolEntrySchema>;
/** Agent Session row nested under a delivery iteration. */
export type DeliverySessionEntry = z.infer<typeof DeliverySessionEntrySchema>;
/** Delivery iteration row with nested Agent Sessions. */
export type IterationEntry = z.infer<typeof IterationEntrySchema>;
/** Full project registry / traceability manifest document. */
export type ProjectRegistry = z.infer<typeof ProjectRegistrySchema>;
