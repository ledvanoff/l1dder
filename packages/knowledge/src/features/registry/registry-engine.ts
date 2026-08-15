/**
 * Shared registry sync/check orchestration for CLI and doctor.
 *
 * Single implementation used by `l1dder registry sync|check` and the
 * `registry-generated-freshness` doctor fixer — no duplicated write paths.
 */

import type { FileSystemPort } from '@l1dder/core';
import type { ProjectRegistry } from '@l1dder/schemas';
import { stringifyYaml } from '@l1dder/yaml';
import { join } from 'node:path';

import { ParseError, ReadError } from '../../errors.js';
import {
  RegistryReader,
  REGISTRY_MANIFEST_PATH,
} from './registry-reader.js';
import {
  extractRegistryContentHash,
  inspectGeneratedViewFreshness,
  registryContentHash,
  registryLookupInstruction,
  renderRegistry,
  type GeneratedViewFreshnessStatus,
} from './registry-renderer.js';
import {
  RegistryValidator,
  type RegistryIssue,
  type RegistryValidationReport,
} from './registry-validator.js';
import { TestContractEvidenceIndexer } from './test-contract-evidence-indexer.js';
import { TypeScriptSymbolIndexer } from './typescript-symbol-indexer.js';

/** Relative path of the generated human registry view. */
export const REGISTRY_VIEW_PATH = 'knowledge/registry.md';

/** Relative path of the curated AI context entrypoint. */
export const AI_CONTEXT_PATH = 'knowledge/ai-context.md';

/** Stable machine codes for registry CLI / engine outcomes. */
export type RegistryEngineErrorCode =
  | 'REGISTRY_MANIFEST_MISSING'
  | 'REGISTRY_MANIFEST_EXISTS'
  | 'REGISTRY_READ_ERROR'
  | 'REGISTRY_PARSE_ERROR'
  | 'REGISTRY_VALIDATION_FAILED';

/** Failure from {@link loadRegistryBundle}. */
export interface RegistryEngineError {
  readonly code: RegistryEngineErrorCode;
  readonly message: string;
  readonly hint?: string;
  readonly issues?: readonly RegistryIssue[];
}

/** Loaded manifest + validation report (+ optional generated view text). */
export interface RegistryBundle {
  readonly registry: ProjectRegistry;
  readonly report: RegistryValidationReport;
  readonly contentHash: string;
  readonly viewPath: string;
  readonly viewExists: boolean;
  readonly viewStale: boolean;
  /** Why the generated view is fresh or stale (for actionable messaging). */
  readonly viewFreshness: GeneratedViewFreshnessStatus;
  readonly existingView: string | undefined;
}

/** Result of {@link syncRegistryView}. */
export interface RegistrySyncResult {
  readonly bundle: RegistryBundle;
  readonly rendered: string;
  /** `true` when the file was written (content differed). */
  readonly wrote: boolean;
  readonly unchanged: boolean;
}

/** Dependencies for registry engine operations. */
export interface RegistryEngineDeps {
  readonly fs: FileSystemPort;
  readonly projectRoot: string;
}

/**
 * Build a fully-wired {@link RegistryValidator} with symbol + TC indexers.
 *
 * @param deps - Filesystem + project root
 * @returns Validator ready for registry checks
 */
export function createRegistryValidator(
  deps: RegistryEngineDeps,
): RegistryValidator {
  const symbolIndexer = new TypeScriptSymbolIndexer({ fs: deps.fs });
  const testContractIndexer = new TestContractEvidenceIndexer({
    fs: deps.fs,
  });
  return new RegistryValidator({
    fs: deps.fs,
    projectRoot: deps.projectRoot,
    symbolIndexer,
    testContractIndexer,
  });
}

/**
 * Load and validate the project registry (schema + filesystem/index checks).
 *
 * @param deps - Filesystem + project root
 * @returns Bundle on success, or a typed engine error
 */
export async function loadRegistryBundle(
  deps: RegistryEngineDeps,
): Promise<
  | { readonly ok: true; readonly value: RegistryBundle }
  | { readonly ok: false; readonly error: RegistryEngineError }
> {
  const reader = new RegistryReader({
    fs: deps.fs,
    projectRoot: deps.projectRoot,
  });

  if (!(await reader.exists())) {
    return {
      ok: false,
      error: {
        code: 'REGISTRY_MANIFEST_MISSING',
        message: `Registry manifest not found: ${REGISTRY_MANIFEST_PATH}`,
        hint: 'Create a draft with `l1dder registry sync --init`, then backfill entities (HARD-8 / T-17).',
      },
    };
  }

  const read = await reader.read();
  if (!read.ok) {
    if (read.error instanceof ReadError) {
      return {
        ok: false,
        error: {
          code: 'REGISTRY_READ_ERROR',
          message: read.error.message,
        },
      };
    }
    if (read.error instanceof ParseError) {
      return {
        ok: false,
        error: {
          code: 'REGISTRY_PARSE_ERROR',
          message: read.error.message,
          hint: 'Fix schema/YAML issues in knowledge/project-registry.yml',
        },
      };
    }
    return {
      ok: false,
      error: {
        code: 'REGISTRY_READ_ERROR',
        message: 'Failed to read registry manifest',
      },
    };
  }

  const registry = read.value;
  const validator = createRegistryValidator(deps);
  const report = await validator.validate(registry);
  const contentHash = registryContentHash(registry);

  const viewFull = join(deps.projectRoot, REGISTRY_VIEW_PATH);
  let existingView: string | undefined;
  let viewExists = false;
  try {
    if (await deps.fs.exists(viewFull)) {
      existingView = await deps.fs.readFile(viewFull);
      viewExists = true;
    }
  } catch {
    viewExists = false;
  }

  const viewFreshness = inspectGeneratedViewFreshness(existingView, registry);
  const viewStale = viewFreshness !== 'fresh';

  return {
    ok: true,
    value: {
      registry,
      report,
      contentHash,
      viewPath: REGISTRY_VIEW_PATH,
      viewExists,
      viewStale,
      viewFreshness,
      existingView,
    },
  };
}

/**
 * Validate and write `knowledge/registry.md` when content changes.
 *
 * Fail-closed: does not write when error-severity validation issues exist.
 * Idempotent: when the rendered bytes match the existing file, reports
 * `unchanged` and skips the write.
 *
 * @param deps - Filesystem + project root
 * @returns Sync result, or engine error
 */
export async function syncRegistryView(
  deps: RegistryEngineDeps,
): Promise<
  | { readonly ok: true; readonly value: RegistrySyncResult }
  | { readonly ok: false; readonly error: RegistryEngineError }
> {
  const loaded = await loadRegistryBundle(deps);
  if (!loaded.ok) return loaded;

  const bundle = loaded.value;
  const hasErrors = bundle.report.issues.some(
    (issue) => (issue.severity ?? 'error') === 'error',
  );
  if (hasErrors) {
    return {
      ok: false,
      error: {
        code: 'REGISTRY_VALIDATION_FAILED',
        message: 'Registry validation failed; refusing to write generated view',
        hint: 'Fix error-severity issues, then re-run `l1dder registry sync`.',
        issues: bundle.report.issues,
      },
    };
  }

  const rendered = renderRegistry(bundle.registry);
  const unchanged = bundle.existingView === rendered;
  if (!unchanged) {
    await deps.fs.writeFile(
      join(deps.projectRoot, REGISTRY_VIEW_PATH),
      rendered,
    );
  }

  return {
    ok: true,
    value: {
      bundle: {
        ...bundle,
        viewExists: true,
        viewStale: false,
        viewFreshness: 'fresh',
        existingView: rendered,
        contentHash: registryContentHash(bundle.registry),
      },
      rendered,
      wrote: !unchanged,
      unchanged,
    },
  };
}

/**
 * Create a minimal valid draft manifest when missing.
 *
 * Does not overwrite an existing file.
 *
 * @param deps - Filesystem + project root
 * @returns Paths written, or an error when the file already exists / IO fails
 */
export async function initRegistryManifest(
  deps: RegistryEngineDeps,
): Promise<
  | { readonly ok: true; readonly path: string }
  | { readonly ok: false; readonly error: RegistryEngineError }
> {
  const fullPath = join(deps.projectRoot, REGISTRY_MANIFEST_PATH);
  if (await deps.fs.exists(fullPath)) {
    return {
      ok: false,
      error: {
        code: 'REGISTRY_MANIFEST_EXISTS',
        message: `Registry manifest already exists: ${REGISTRY_MANIFEST_PATH}`,
        hint: 'Edit the existing file or remove it before re-running --init.',
      },
    };
  }

  const draft = {
    schema_version: 1,
    features: [],
    usecases: [],
    decisions: [],
    integrations: [],
    models: [],
    enums: [],
    test_contracts: [],
    symbols: [],
    debt_items: [],
    backlog_items: [],
    iterations: [],
  };
  const yaml = stringifyYaml(draft);
  try {
    await deps.fs.writeFile(fullPath, yaml);
  } catch (cause) {
    return {
      ok: false,
      error: {
        code: 'REGISTRY_READ_ERROR',
        message:
          cause instanceof Error
            ? cause.message
            : 'Failed to write registry manifest',
      },
    };
  }

  return { ok: true, path: REGISTRY_MANIFEST_PATH };
}

/**
 * Inspect ai-context freshness relative to the current registry content hash.
 *
 * @param deps - Filesystem + project root
 * @param expectedHash - Current registry content hash
 * @returns Freshness status for doctor / show
 */
export async function inspectAiContextFreshness(
  deps: RegistryEngineDeps,
  expectedHash: string,
): Promise<{
  readonly status: 'fresh' | 'stale' | 'missing_marker' | 'missing_file';
  readonly embeddedHash?: string;
  readonly path: string;
}> {
  const fullPath = join(deps.projectRoot, AI_CONTEXT_PATH);
  if (!(await deps.fs.exists(fullPath))) {
    return { status: 'missing_file', path: AI_CONTEXT_PATH };
  }

  let content: string;
  try {
    content = await deps.fs.readFile(fullPath);
  } catch {
    return { status: 'missing_file', path: AI_CONTEXT_PATH };
  }

  const embeddedHash = extractRegistryContentHash(content);
  if (embeddedHash === undefined) {
    return { status: 'missing_marker', path: AI_CONTEXT_PATH };
  }
  if (embeddedHash !== expectedHash) {
    return { status: 'stale', embeddedHash, path: AI_CONTEXT_PATH };
  }
  return { status: 'fresh', embeddedHash, path: AI_CONTEXT_PATH };
}

/**
 * Collection counters for `registry show`.
 *
 * @param registry - Parsed registry
 * @returns Sorted count map
 */
export function registryCollectionCounts(
  registry: ProjectRegistry,
): Record<string, number> {
  return {
    features: registry.features.length,
    usecases: registry.usecases.length,
    decisions: registry.decisions.length,
    integrations: registry.integrations.length,
    models: registry.models.length,
    enums: registry.enums.length,
    test_contracts: registry.test_contracts.length,
    symbols: registry.symbols.length,
    debt_items: registry.debt_items.length,
    backlog_items: registry.backlog_items.length,
  };
}

export {
  registryLookupInstruction,
  REGISTRY_MANIFEST_PATH,
};
