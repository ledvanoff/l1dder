import { describe, expect, it } from 'vitest';
import { InMemoryFileSystem } from '@l1dder/core/testing';

import {
  initRegistryManifest,
  loadRegistryBundle,
  syncRegistryView,
  REGISTRY_VIEW_PATH,
} from './registry-engine.js';
import { REGISTRY_MANIFEST_PATH } from './registry-reader.js';

const ROOT = '/engine-project';

const CLEAN_MANIFEST = `
schema_version: 1
features: []
usecases: []
decisions: []
integrations: []
models: []
enums: []
test_contracts: []
symbols: []
debt_items: []
backlog_items: []
iterations: []
`.trimStart();

describe('registry engine', () => {
  it('loadRegistryBundle reports REGISTRY_MANIFEST_MISSING without throwing', async () => {
    const fs = new InMemoryFileSystem();
    const result = await loadRegistryBundle({ fs, projectRoot: ROOT });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('REGISTRY_MANIFEST_MISSING');
  });

  // @tc TC-003-02-A
  it('sync is idempotent for an empty valid registry', async () => {
    const fs = new InMemoryFileSystem();
    await fs.mkdir(`${ROOT}/knowledge`);
    await fs.writeFile(`${ROOT}/${REGISTRY_MANIFEST_PATH}`, CLEAN_MANIFEST);

    const first = await syncRegistryView({ fs, projectRoot: ROOT });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.value.wrote).toBe(true);
    const bytes1 = await fs.readFile(`${ROOT}/${REGISTRY_VIEW_PATH}`);

    const second = await syncRegistryView({ fs, projectRoot: ROOT });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value.unchanged).toBe(true);
    const bytes2 = await fs.readFile(`${ROOT}/${REGISTRY_VIEW_PATH}`);
    expect(bytes2).toBe(bytes1);
  });

  it('initRegistryManifest writes a draft once', async () => {
    const fs = new InMemoryFileSystem();
    await fs.mkdir(`${ROOT}/knowledge`);

    const first = await initRegistryManifest({ fs, projectRoot: ROOT });
    expect(first.ok).toBe(true);

    const second = await initRegistryManifest({ fs, projectRoot: ROOT });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error.code).toBe('REGISTRY_MANIFEST_EXISTS');
  });

  it('initRegistryManifest draft lists iterations alongside other collections', async () => {
    const fs = new InMemoryFileSystem();
    await fs.mkdir(`${ROOT}/knowledge`);

    const first = await initRegistryManifest({ fs, projectRoot: ROOT });
    expect(first.ok).toBe(true);

    const draft = await fs.readFile(`${ROOT}/${REGISTRY_MANIFEST_PATH}`);
    expect(draft).toContain('backlog_items: []');
    expect(draft).toContain('iterations: []');
    expect(draft.indexOf('backlog_items: []')).toBeLessThan(
      draft.indexOf('iterations: []'),
    );
  });
});
