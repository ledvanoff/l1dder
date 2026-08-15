import { describe, expect, it } from 'vitest';
import { InMemoryFileSystem } from '@l1dder/core/testing';
import {
  REGISTRY_HASH_MARKER_PREFIX,
  REGISTRY_MANIFEST_PATH,
  REGISTRY_VIEW_PATH,
  registryContentHash,
  renderRegistry,
} from '@l1dder/knowledge';
import { ProjectRegistrySchema } from '@l1dder/schemas';

import { checkRegistry, REGISTRY_DOCTOR_CHECK_IDS } from './registry.js';

const ROOT = '/doctor-registry';

const SOURCE_MD = `# Features

## FEAT-001

demo

## UC-001-01

demo

## debt-001

Debt card
`;

const CLEAN_MANIFEST = `
schema_version: 1
features:
  - id: FEAT-001
    title: Demo Feature
    status: planned
    usecases: [UC-001-01]
    sources:
      to_be: knowledge/to-be/usecases.md#feat-001
usecases:
  - id: UC-001-01
    title: Demo usecase
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
    title: given clean registry
    feature: FEAT-001
    usecase: UC-001-01
    required: false
debt_items:
  - id: DEBT-001
    title: Sample debt
    severity: low
    status: open
    source: knowledge/roadmap.md#debt-001
    links: [FEAT-001]
`.trimStart();

async function seed(
  files: Record<string, string>,
): Promise<InMemoryFileSystem> {
  const fs = new InMemoryFileSystem();
  await fs.mkdir(`${ROOT}/knowledge/to-be`);
  for (const [rel, content] of Object.entries(files)) {
    await fs.writeFile(`${ROOT}/${rel}`, content);
  }
  return fs;
}

describe('checkRegistry', () => {
  it('given missing manifest, returns a single warn (not nine fails)', async () => {
    const fs = new InMemoryFileSystem();
    const checks = await checkRegistry(fs, ROOT);

    expect(checks).toHaveLength(1);
    expect(checks[0]?.id).toBe('registry-schema');
    expect(checks[0]?.level).toBe('warn');
    expect(checks[0]?.message).toMatch(/not created yet/i);
    expect(checks.some((c) => c.level === 'fail')).toBe(false);
  });

  it('given broken DEBT roadmap anchor, emits registry-source-paths fail', async () => {
    const broken = CLEAN_MANIFEST.replace(
      'knowledge/roadmap.md#debt-001',
      'knowledge/roadmap.md#missing-debt',
    );
    const fs = await seed({
      [REGISTRY_MANIFEST_PATH]: broken,
      'knowledge/to-be/usecases.md': SOURCE_MD,
      'knowledge/roadmap.md': SOURCE_MD,
    });

    const checks = await checkRegistry(fs, ROOT);
    const source = checks.find((c) => c.id === 'registry-source-paths');
    expect(source?.level).toBe('fail');
    expect(source?.details?.some((d) => d.code === 'REGISTRY_BROKEN_ANCHOR')).toBe(
      true,
    );
  });

  it('given stale ai-context hash, fails; without marker, warns', async () => {
    const registry = ProjectRegistrySchema.parse({
      schema_version: 1,
      features: [
        {
          id: 'FEAT-001',
          title: 'Demo Feature',
          status: 'planned',
          usecases: ['UC-001-01'],
          sources: { to_be: 'knowledge/to-be/usecases.md#feat-001' },
        },
      ],
      usecases: [
        {
          id: 'UC-001-01',
          title: 'Demo usecase',
          feature: 'FEAT-001',
          sources: { requirements: 'knowledge/to-be/usecases.md#uc-001-01' },
          test_contracts: ['TC-001-01-A'],
        },
      ],
      test_contracts: [
        {
          id: 'TC-001-01-A',
          title: 'given clean registry',
          feature: 'FEAT-001',
          usecase: 'UC-001-01',
          required: false,
        },
      ],
      debt_items: [
        {
          id: 'DEBT-001',
          title: 'Sample debt',
          severity: 'low',
          status: 'open',
          source: 'knowledge/roadmap.md#debt-001',
          links: ['FEAT-001'],
        },
      ],
    });
    const view = renderRegistry(registry);
    const hash = registryContentHash(registry);

    const fsMissingMarker = await seed({
      [REGISTRY_MANIFEST_PATH]: CLEAN_MANIFEST,
      'knowledge/to-be/usecases.md': SOURCE_MD,
      'knowledge/roadmap.md': SOURCE_MD,
      [REGISTRY_VIEW_PATH]: view,
      'knowledge/ai-context.md': '# AI context\nNo marker here.\n',
    });
    const warnChecks = await checkRegistry(fsMissingMarker, ROOT);
    expect(
      warnChecks.find((c) => c.id === 'ai-context-freshness')?.level,
    ).toBe('warn');

    const fsStale = await seed({
      [REGISTRY_MANIFEST_PATH]: CLEAN_MANIFEST,
      'knowledge/to-be/usecases.md': SOURCE_MD,
      'knowledge/roadmap.md': SOURCE_MD,
      [REGISTRY_VIEW_PATH]: view,
      'knowledge/ai-context.md': `${REGISTRY_HASH_MARKER_PREFIX}deadbeef0000 -->\n# AI\n`,
    });
    const staleChecks = await checkRegistry(fsStale, ROOT);
    expect(
      staleChecks.find((c) => c.id === 'ai-context-freshness')?.level,
    ).toBe('fail');

    const fsFresh = await seed({
      [REGISTRY_MANIFEST_PATH]: CLEAN_MANIFEST,
      'knowledge/to-be/usecases.md': SOURCE_MD,
      'knowledge/roadmap.md': SOURCE_MD,
      [REGISTRY_VIEW_PATH]: view,
      'knowledge/ai-context.md': `${REGISTRY_HASH_MARKER_PREFIX}${hash} -->\n# AI\n`,
    });
    const freshChecks = await checkRegistry(fsFresh, ROOT);
    expect(
      freshChecks.find((c) => c.id === 'ai-context-freshness')?.level,
    ).toBe('pass');
    expect(freshChecks.map((c) => c.id).sort()).toEqual(
      [...REGISTRY_DOCTOR_CHECK_IDS].sort(),
    );
  });

  it('marks registry-generated-freshness as fixable when stale', async () => {
    const fs = await seed({
      [REGISTRY_MANIFEST_PATH]: CLEAN_MANIFEST,
      'knowledge/to-be/usecases.md': SOURCE_MD,
      'knowledge/roadmap.md': SOURCE_MD,
      [REGISTRY_VIEW_PATH]: `${REGISTRY_HASH_MARKER_PREFIX}deadbeef0000 -->\n# stale\n`,
    });

    const checks = await checkRegistry(fs, ROOT);
    const freshness = checks.find((c) => c.id === 'registry-generated-freshness');
    expect(freshness?.level).toBe('fail');
    expect(freshness?.fixable).toBe(true);
  });

  it('given manually edited view (marker intact), registry-generated-freshness fails', async () => {
    const registry = ProjectRegistrySchema.parse({
      schema_version: 1,
      features: [
        {
          id: 'FEAT-001',
          title: 'Demo Feature',
          status: 'planned',
          usecases: ['UC-001-01'],
          sources: { to_be: 'knowledge/to-be/usecases.md#feat-001' },
        },
      ],
      usecases: [
        {
          id: 'UC-001-01',
          title: 'Demo usecase',
          feature: 'FEAT-001',
          sources: { requirements: 'knowledge/to-be/usecases.md#uc-001-01' },
          test_contracts: ['TC-001-01-A'],
        },
      ],
      test_contracts: [
        {
          id: 'TC-001-01-A',
          title: 'given clean registry',
          feature: 'FEAT-001',
          usecase: 'UC-001-01',
          required: false,
        },
      ],
      debt_items: [
        {
          id: 'DEBT-001',
          title: 'Sample debt',
          severity: 'low',
          status: 'open',
          source: 'knowledge/roadmap.md#debt-001',
          links: ['FEAT-001'],
        },
      ],
    });
    const view = `${renderRegistry(registry)}garbage\n`;
    const fs = await seed({
      [REGISTRY_MANIFEST_PATH]: CLEAN_MANIFEST,
      'knowledge/to-be/usecases.md': SOURCE_MD,
      'knowledge/roadmap.md': SOURCE_MD,
      [REGISTRY_VIEW_PATH]: view,
    });

    const checks = await checkRegistry(fs, ROOT);
    const freshness = checks.find((c) => c.id === 'registry-generated-freshness');
    expect(freshness?.level).toBe('fail');
    expect(freshness?.fixable).toBe(true);
    expect(freshness?.message).toMatch(/edited manually/i);
    expect(freshness?.details?.some((d) => d.message.includes('view-edited'))).toBe(
      true,
    );
  });
});
