import { describe, expect, it } from 'vitest';

import { createTestRegistryReader } from '../../testing.js';
import { REGISTRY_MANIFEST_PATH } from './registry-reader.js';

/** Minimal schema-valid registry YAML. */
const VALID_MANIFEST = `
schema_version: 1
features:
  - id: FEAT-001
    title: Guided Product Discovery
    status: planned
    usecases: [UC-001-01]
    sources:
      to_be: knowledge/to-be/usecases.md#feat-001
usecases:
  - id: UC-001-01
    title: Run discovery milestones
    feature: FEAT-001
    sources:
      requirements: knowledge/to-be/usecases.md#uc-001-01
    covers:
      architecture: []
      integrations: []
      models: []
    test_contracts: [TC-001-01-A]
test_contracts:
  - id: TC-001-01-A
    title: given valid milestone order, discovery advances
    feature: FEAT-001
    usecase: UC-001-01
`.trimStart();

describe('RegistryReader', () => {
  it('reads a valid registry manifest', async () => {
    const reader = createTestRegistryReader({
      [REGISTRY_MANIFEST_PATH]: VALID_MANIFEST,
    });

    expect(await reader.exists()).toBe(true);

    const result = await reader.read();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.schema_version).toBe(1);
    expect(result.value.features[0]?.id).toBe('FEAT-001');
    expect(result.value.usecases[0]?.id).toBe('UC-001-01');
  });

  it('returns ReadError when the manifest file is missing', async () => {
    const reader = createTestRegistryReader({});

    expect(await reader.exists()).toBe(false);

    const result = await reader.read();
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('READ_ERROR');
    expect(result.error.path).toBe(REGISTRY_MANIFEST_PATH);
  });

  it('returns ParseError with issue path for invalid schema', async () => {
    const reader = createTestRegistryReader({
      [REGISTRY_MANIFEST_PATH]: `
schema_version: 1
features:
  - id: NOT-A-FEATURE
    title: Broken
    status: planned
`.trimStart(),
    });

    const result = await reader.read();
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('PARSE_ERROR');
    if (result.error.code !== 'PARSE_ERROR') return;
    expect(result.error.path).toBe(REGISTRY_MANIFEST_PATH);
    expect(result.error.details.length).toBeGreaterThan(0);
    expect(result.error.details).toMatch(/features/i);
  });

  it('returns ParseError for invalid YAML syntax', async () => {
    const reader = createTestRegistryReader({
      [REGISTRY_MANIFEST_PATH]: 'schema_version: [\n  - broken',
    });

    const result = await reader.read();
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('PARSE_ERROR');
    if (result.error.code !== 'PARSE_ERROR') return;
    expect(result.error.details.length).toBeGreaterThan(0);
  });
});
