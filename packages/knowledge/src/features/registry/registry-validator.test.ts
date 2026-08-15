import { describe, expect, it } from 'vitest';
import { ProjectRegistrySchema, type ProjectRegistry } from '@l1dder/schemas';

import { createTestRegistryValidator } from '../../testing.js';

/** Build a schema-valid registry from a partial input. */
function registry(input: unknown): ProjectRegistry {
  return ProjectRegistrySchema.parse(input);
}

/** Shared Markdown fixtures that match valid anchors. */
const FILES = {
  'knowledge/to-be/usecases.md':
    '## FEAT-001: Guided Discovery\n\n## UC-001-01: Run discovery\n',
  'knowledge/to-be/architecture.md': '## FEAT-001: Architecture notes\n',
  'knowledge/decisions/dec-hard-01.md': '## DEC-HARD-01: First\n',
  'knowledge/decisions/dec-hard-02.md': '## DEC-HARD-02: Second\n',
  'knowledge/models/model-001.md': '## MODEL-001: Registry\n',
  'knowledge/models/model-002.md': '## MODEL-002: Orphan\n',
  'knowledge/integrations/int-01.md': '## INT-01: Cursor\n',
  'knowledge/enums/enum-001.md': '## ENUM-001: Status\n',
  'knowledge/roadmap.md': '## DEBT-001\n\n## BL-001\n',
};

/** Linked happy-path registry used as a base for mutations. */
function linkedRegistry(): ProjectRegistry {
  return registry({
    schema_version: 1,
    features: [
      {
        id: 'FEAT-001',
        title: 'Guided Discovery',
        status: 'planned',
        usecases: ['UC-001-01'],
        sources: { to_be: 'knowledge/to-be/usecases.md#feat-001-guided-discovery' },
      },
    ],
    usecases: [
      {
        id: 'UC-001-01',
        title: 'Run discovery',
        feature: 'FEAT-001',
        sources: {
          requirements: 'knowledge/to-be/usecases.md#uc-001-01-run-discovery',
        },
        covers: {
          architecture: [
            'knowledge/to-be/architecture.md#feat-001-architecture-notes',
          ],
          integrations: ['INT-01'],
          models: ['MODEL-001'],
        },
        test_contracts: ['TC-001-01-A'],
      },
    ],
    integrations: [
      {
        id: 'INT-01',
        title: 'Cursor',
        source: 'knowledge/integrations/int-01.md#int-01-cursor',
        usecases: ['UC-001-01'],
      },
    ],
    models: [
      {
        id: 'MODEL-001',
        title: 'Registry',
        source: 'knowledge/models/model-001.md#model-001-registry',
        usecases: ['UC-001-01'],
      },
    ],
    test_contracts: [
      {
        id: 'TC-001-01-A',
        title: 'given valid input, check passes',
        feature: 'FEAT-001',
        usecase: 'UC-001-01',
      },
    ],
  });
}

describe('RegistryValidator', () => {
  it('returns no issues for a clean linked registry', async () => {
    const validator = createTestRegistryValidator(FILES);
    const report = await validator.validate(linkedRegistry());
    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it('reports REGISTRY_BROKEN_PATH when a source file is missing', async () => {
    const validator = createTestRegistryValidator(FILES);
    const data = linkedRegistry();
    const broken = registry({
      ...data,
      models: [
        {
          id: 'MODEL-001',
          title: 'Registry',
          source: 'knowledge/models/missing.md#model-001',
          usecases: ['UC-001-01'],
        },
      ],
    });

    const report = await validator.validate(broken);
    const issue = report.issues.find((i) => i.code === 'REGISTRY_BROKEN_PATH');
    expect(issue).toBeDefined();
    expect(issue?.path).toBe('knowledge/models/missing.md');
    expect(issue?.message).toMatch(/does not exist/i);
  });

  it('reports REGISTRY_BROKEN_ANCHOR when the heading slug is absent', async () => {
    const validator = createTestRegistryValidator(FILES);
    const data = linkedRegistry();
    const broken = registry({
      ...data,
      features: [
        {
          ...data.features[0],
          sources: { to_be: 'knowledge/to-be/usecases.md#does-not-exist' },
        },
      ],
    });

    const report = await validator.validate(broken);
    const issue = report.issues.find((i) => i.code === 'REGISTRY_BROKEN_ANCHOR');
    expect(issue).toBeDefined();
    expect(issue?.ref).toContain('#does-not-exist');
    expect(issue?.message).toMatch(/not found/i);
  });

  it('does not report broken anchor when the github slug matches', async () => {
    const validator = createTestRegistryValidator(FILES);
    const report = await validator.validate(linkedRegistry());
    expect(
      report.issues.filter((i) => i.code === 'REGISTRY_BROKEN_ANCHOR'),
    ).toEqual([]);
  });

  it('resolves a pool anchor declared as an inline <a id> inside a table', async () => {
    const validator = createTestRegistryValidator({
      ...FILES,
      'knowledge/roadmap.md':
        '### Technical Debt\n\n| ID | Status |\n|---|---|\n| <a id="debt-001"></a>DEBT-001 | open |\n',
    });
    const data = linkedRegistry();
    const withPool = registry({
      ...data,
      debt_items: [
        {
          id: 'DEBT-001',
          title: 'Sync intent specs with the final API',
          status: 'open',
          severity: 'medium',
          source: 'knowledge/roadmap.md#debt-001',
          links: ['FEAT-001'],
        },
      ],
    });

    const report = await validator.validate(withPool);
    expect(
      report.issues.filter(
        (i) =>
          i.code === 'REGISTRY_BROKEN_ANCHOR' ||
          i.code === 'REGISTRY_BROKEN_PATH',
      ),
    ).toEqual([]);
  });

  it('given orphan model or test contract, check returns actionable issue without throwing', async () => {
    const validator = createTestRegistryValidator({
      ...FILES,
      'knowledge/models/model-002.md': '## MODEL-002: Orphan\n',
    });

    const data = linkedRegistry();
    const withOrphans = registry({
      ...data,
      models: [
        ...data.models,
        {
          id: 'MODEL-002',
          title: 'Orphan model',
          source: 'knowledge/models/model-002.md#model-002-orphan',
          usecases: [],
        },
      ],
      test_contracts: [
        ...data.test_contracts,
        {
          id: 'TC-001-01-B',
          title: 'orphan contract',
          feature: 'FEAT-001',
          usecase: 'UC-001-01',
        },
      ],
    });

    await expect(validator.validate(withOrphans)).resolves.toBeDefined();
    const report = await validator.validate(withOrphans);

    const orphanRefs = report.issues
      .filter((i) => i.code === 'REGISTRY_ORPHAN')
      .map((i) => i.ref)
      .sort();

    expect(orphanRefs).toContain('MODEL-002');
    expect(orphanRefs).toContain('TC-001-01-B');
    expect(
      report.issues.find((i) => i.ref === 'MODEL-002')?.message.length,
    ).toBeGreaterThan(0);
  });

  it('accepts an enum whose only relation is its own usecases back-reference', async () => {
    const validator = createTestRegistryValidator(FILES);
    const data = linkedRegistry();
    const withEnum = registry({
      ...data,
      enums: [
        {
          id: 'ENUM-001',
          title: 'Status',
          source: 'knowledge/enums/enum-001.md#enum-001-status',
          usecases: ['UC-001-01'],
        },
      ],
    });

    const report = await validator.validate(withEnum);

    expect(report.issues.filter((i) => i.code === 'REGISTRY_ORPHAN')).toEqual([]);
  });

  it('reports REGISTRY_ORPHAN for an enum with no relation in either direction', async () => {
    const validator = createTestRegistryValidator(FILES);
    const data = linkedRegistry();
    const withEnum = registry({
      ...data,
      enums: [
        {
          id: 'ENUM-001',
          title: 'Status',
          source: 'knowledge/enums/enum-001.md#enum-001-status',
          usecases: [],
        },
      ],
    });

    const report = await validator.validate(withEnum);

    expect(
      report.issues.find((i) => i.code === 'REGISTRY_ORPHAN')?.ref,
    ).toBe('ENUM-001');
  });

  it('reports REGISTRY_CYCLE when free-form links form a loop', async () => {
    const validator = createTestRegistryValidator({
      ...FILES,
      'knowledge/decisions/dec-hard-01.md': '## DEC-HARD-01: First\n',
      'knowledge/decisions/dec-hard-02.md': '## DEC-HARD-02: Second\n',
    });

    const data = linkedRegistry();
    const cyclic = registry({
      ...data,
      decisions: [
        {
          id: 'DEC-HARD-01',
          title: 'First',
          source: 'knowledge/decisions/dec-hard-01.md#dec-hard-01-first',
          status: 'accepted',
          links: ['DEC-HARD-02'],
        },
        {
          id: 'DEC-HARD-02',
          title: 'Second',
          source: 'knowledge/decisions/dec-hard-02.md#dec-hard-02-second',
          status: 'accepted',
          links: ['DEC-HARD-01'],
        },
      ],
    });

    const report = await validator.validate(cyclic);
    const cycle = report.issues.find((i) => i.code === 'REGISTRY_CYCLE');
    expect(cycle).toBeDefined();
    expect(cycle?.message).toMatch(/DEC-HARD-01/);
    expect(cycle?.message).toMatch(/DEC-HARD-02/);
    expect(cycle?.message).toMatch(/→/);
  });

  it('never throws even when many issues are present', async () => {
    const validator = createTestRegistryValidator({});
    const data = linkedRegistry();

    await expect(validator.validate(data)).resolves.toMatchObject({
      ok: false,
    });
  });
});
