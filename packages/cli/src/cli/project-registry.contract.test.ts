import { existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  loadRegistryBundle,
  renderRegistry,
  REGISTRY_MANIFEST_PATH,
} from '@l1dder/knowledge';
import type { RegistryIssue } from '@l1dder/knowledge';
import type { ProjectRegistry } from '@l1dder/schemas';
import { beforeAll, describe, expect, it } from 'vitest';

import { createNodeFs } from './adapters/node-fs.js';

/**
 * T-17: L1DDER carries its own canonical manifest, so the framework has to pass
 * the check it sells. A unit-level guard keeps every later session honest —
 * renaming a heading, dropping a public symbol or deleting a proving test breaks
 * this test instead of silently rotting `knowledge/project-registry.yml`.
 */
const projectRoot = process.cwd();

/**
 * `knowledge/` is denylisted from the public mirror (`scripts/sync-public.mjs`),
 * so this suite only runs where the private manifest exists.
 */
const manifestPresent = existsSync(join(projectRoot, REGISTRY_MANIFEST_PATH));

describe.skipIf(!manifestPresent)('L1DDER project registry manifest', () => {
  const fs = createNodeFs();

  let registry: ProjectRegistry;
  let issues: readonly RegistryIssue[];
  let viewStale: boolean;

  beforeAll(async () => {
    const loaded = await loadRegistryBundle({ fs, projectRoot });
    if (!loaded.ok) {
      throw new Error(
        `${REGISTRY_MANIFEST_PATH}: ${loaded.error.code} — ${loaded.error.message}`,
      );
    }
    registry = loaded.value.registry;
    issues = loaded.value.report.issues;
    viewStale = loaded.value.viewStale;
  }, 60_000);

  // @tc TC-002-01-A
  it('passes registry validation without error-severity issues', () => {
    const errors = issues.filter(
      (issue) => (issue.severity ?? 'error') === 'error',
    );

    expect(
      errors.map((issue) => `${issue.code} ${issue.ref}: ${issue.message}`),
    ).toEqual([]);
  });

  it('keeps the generated human view in sync with the manifest', () => {
    expect(viewStale).toBe(false);
    expect(renderRegistry(registry).length).toBeGreaterThan(0);
  });

  it('gives every feature at least one use case', () => {
    const featuresWithoutUsecases = registry.features
      .filter((feature) => feature.usecases.length === 0)
      .map((feature) => feature.id);

    expect(featuresWithoutUsecases).toEqual([]);
  });

  it('gives every implemented feature at least one test contract', () => {
    const contractsByFeature = new Set(
      registry.test_contracts.map((contract) => contract.feature),
    );
    const uncovered = registry.features
      .filter((feature) => feature.status === 'done')
      .filter((feature) => !contractsByFeature.has(feature.id))
      .map((feature) => feature.id);

    expect(uncovered).toEqual([]);
  });

  it('links every delivery session to a declared workflow profile and rail', () => {
    const sessions = registry.iterations.flatMap((iteration) =>
      iteration.sessions.map((session) => ({
        rail: iteration.id,
        ...session,
      })),
    );

    expect(sessions.length).toBeGreaterThan(50);
    expect(
      sessions.filter((session) => session.source_anchor.length === 0),
    ).toEqual([]);
  });

  it('keeps exactly one in-progress delivery iteration', () => {
    const active = registry.iterations
      .filter((iteration) => iteration.status === 'in_progress')
      .map((iteration) => iteration.id);

    expect(active).toHaveLength(1);
  });
});
