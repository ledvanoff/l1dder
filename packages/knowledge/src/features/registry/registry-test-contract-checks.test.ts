import { describe, expect, it } from 'vitest';
import { ProjectRegistrySchema, type ProjectRegistry } from '@l1dder/schemas';
import type { TestContractEvidenceIndex } from '@l1dder/core';

import { collectTestContractIssues } from './registry-test-contract-checks.js';
import { createTestRegistryValidator } from '../../testing.js';

/** Build a schema-valid registry from a partial input. */
function registry(input: unknown): ProjectRegistry {
  return ProjectRegistrySchema.parse(input);
}

/** Minimal registry with one test contract. */
function withContract(
  overrides: Partial<ProjectRegistry['test_contracts'][number]> = {},
): ProjectRegistry {
  return registry({
    schema_version: 1,
    features: [
      {
        id: 'FEAT-001',
        title: 'Guided Discovery',
        status: 'planned',
        usecases: ['UC-001-01'],
      },
    ],
    usecases: [
      {
        id: 'UC-001-01',
        title: 'Run discovery',
        feature: 'FEAT-001',
        sources: { requirements: 'knowledge/to-be/usecases.md#uc-001-01' },
        test_contracts: ['TC-001-01-A'],
      },
    ],
    test_contracts: [
      {
        id: 'TC-001-01-A',
        title: 'given valid input, check passes',
        feature: 'FEAT-001',
        usecase: 'UC-001-01',
        ...overrides,
      },
    ],
  });
}

describe('collectTestContractIssues', () => {
  it('given required TC with no matching test, check fails', () => {
    const emptyIndex: TestContractEvidenceIndex = {
      evidence: [],
      markerWarnings: [],
      scannedFiles: 0,
      markerCount: 0,
    };

    const issues = collectTestContractIssues(withContract(), emptyIndex);
    const missing = issues.find((i) => i.code === 'REGISTRY_TC_EVIDENCE_MISSING');
    expect(missing).toBeDefined();
    expect(missing?.severity).toBe('error');
    expect(missing?.ref).toBe('TC-001-01-A');
  });

  it('given optional TC with no evidence, emits warning only', () => {
    const issues = collectTestContractIssues(
      withContract({ required: false }),
      {
        evidence: [],
        markerWarnings: [],
        scannedFiles: 0,
        markerCount: 0,
      },
    );

    const missing = issues.find((i) => i.code === 'REGISTRY_TC_EVIDENCE_MISSING');
    expect(missing?.severity).toBe('warning');
  });

  it('given matching behavior test marker, evidence satisfies required TC', () => {
    const issues = collectTestContractIssues(withContract(), {
      evidence: [
        {
          contractId: 'TC-001-01-A',
          file: 'packages/demo/src/demo.test.ts',
          title: 'given valid input, check passes',
          line: 12,
        },
      ],
      markerWarnings: [],
      scannedFiles: 1,
      markerCount: 1,
    });

    expect(issues).toEqual([]);
  });

  it('reports REGISTRY_TC_UNKNOWN_REF for marker ids absent from the manifest', () => {
    const issues = collectTestContractIssues(withContract(), {
      evidence: [
        {
          contractId: 'TC-001-01-A',
          file: 'packages/demo/src/demo.test.ts',
          title: 'ok',
          line: 1,
        },
        {
          contractId: 'TC-999-01-Z',
          file: 'packages/demo/src/other.test.ts',
          title: 'orphan',
          line: 4,
        },
      ],
      markerWarnings: [],
      scannedFiles: 2,
      markerCount: 2,
    });

    const unknown = issues.find((i) => i.code === 'REGISTRY_TC_UNKNOWN_REF');
    expect(unknown).toBeDefined();
    expect(unknown?.severity).toBe('error');
    expect(unknown?.ref).toBe('TC-999-01-Z');
    expect(unknown?.message).toContain('packages/demo/src/other.test.ts');
  });

  it('maps marker warnings to REGISTRY_TC_MARKER_INVALID', () => {
    const issues = collectTestContractIssues(withContract(), {
      evidence: [
        {
          contractId: 'TC-001-01-A',
          file: 'packages/demo/src/demo.test.ts',
          title: 'ok',
          line: 1,
        },
      ],
      markerWarnings: [
        {
          file: 'packages/demo/src/bad.test.ts',
          line: 3,
          raw: '// @tc BAD',
          message: 'Invalid @tc contract id(s) BAD at packages/demo/src/bad.test.ts:3',
        },
      ],
      scannedFiles: 2,
      markerCount: 2,
    });

    const invalid = issues.find((i) => i.code === 'REGISTRY_TC_MARKER_INVALID');
    expect(invalid?.severity).toBe('warning');
  });
});

describe('RegistryValidator + test contract indexer', () => {
  it('given required TC with no matching test, validation fails', async () => {
    const files = {
      'knowledge/to-be/usecases.md': '## UC-001-01\n',
      'packages/demo/package.json': JSON.stringify({ name: '@l1dder/demo' }),
      'packages/demo/src/demo.test.ts':
        "it('unrelated unmarked test', () => {});\n",
    };

    const validator = createTestRegistryValidator(files, '/project', {
      withTestContractIndexer: true,
    });
    const report = await validator.validate(withContract());
    expect(report.ok).toBe(false);
    expect(
      report.issues.some((i) => i.code === 'REGISTRY_TC_EVIDENCE_MISSING'),
    ).toBe(true);
  });

  it('given matching @tc marker, required contract passes', async () => {
    const files = {
      'knowledge/to-be/usecases.md': '## UC-001-01\n',
      'packages/demo/package.json': JSON.stringify({ name: '@l1dder/demo' }),
      'packages/demo/src/demo.test.ts': [
        '  // @tc TC-001-01-A',
        "  it('given valid input, check passes', () => {});",
        '',
      ].join('\n'),
    };

    const validator = createTestRegistryValidator(files, '/project', {
      withTestContractIndexer: true,
    });
    const report = await validator.validate(withContract());
    expect(report.ok).toBe(true);
    expect(
      report.issues.filter((i) => i.code.startsWith('REGISTRY_TC_')),
    ).toEqual([]);
  });
});
