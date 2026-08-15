import { describe, expect, it } from 'vitest';

import { createTestContractEvidenceIndexer } from '../../testing.js';

describe('TestContractEvidenceIndexer', () => {
  it('given marker directly above it(), evidence includes file and title', async () => {
    const { indexer, projectRoot } = createTestContractEvidenceIndexer({
      'packages/demo/package.json': JSON.stringify({ name: '@l1dder/demo' }),
      'packages/demo/src/demo.test.ts': [
        "import { describe, expect, it } from 'vitest';",
        '',
        "describe('demo', () => {",
        '  // @tc TC-001-05-A',
        "  it('returns err when transition is forbidden', () => {",
        '    expect(true).toBe(true);',
        '  });',
        '});',
        '',
      ].join('\n'),
    });

    const index = await indexer.index(projectRoot);
    expect(index.scannedFiles).toBe(1);
    expect(index.markerCount).toBe(1);
    expect(index.evidence).toEqual([
      {
        contractId: 'TC-001-05-A',
        file: 'packages/demo/src/demo.test.ts',
        title: 'returns err when transition is forbidden',
        line: 5,
      },
    ]);
  });

  it('given blank lines and comments between marker and it(), evidence is still created', async () => {
    const { indexer, projectRoot } = createTestContractEvidenceIndexer({
      'packages/demo/package.json': JSON.stringify({ name: '@l1dder/demo' }),
      'packages/demo/src/gap.test.ts': [
        '  // @tc TC-001-05-A',
        '',
        '  // rationale: covers forbidden transition',
        '  /*',
        '   * multi-line note',
        '   */',
        "  it('still attached', () => {});",
        '',
      ].join('\n'),
    });

    const index = await indexer.index(projectRoot);
    expect(index.evidence).toEqual([
      {
        contractId: 'TC-001-05-A',
        file: 'packages/demo/src/gap.test.ts',
        title: 'still attached',
        line: 7,
      },
    ]);
    expect(index.markerWarnings).toEqual([]);
  });

  it('given marker above describe() with test inside, no evidence and warning', async () => {
    const { indexer, projectRoot } = createTestContractEvidenceIndexer({
      'packages/demo/package.json': JSON.stringify({ name: '@l1dder/demo' }),
      'packages/demo/src/describe.test.ts': [
        '  // @tc TC-001-05-A',
        "  describe('group', () => {",
        "    it('inner test', () => {});",
        '  });',
        '',
      ].join('\n'),
    });

    const index = await indexer.index(projectRoot);
    expect(index.evidence).toEqual([]);
    expect(index.markerWarnings).toHaveLength(1);
    expect(index.markerWarnings[0]?.message).toMatch(
      /must directly precede an it\(\)\/test\(\) call/u,
    );
  });

  it('given marker then ordinary code with a distant test, no evidence and warning', async () => {
    const { indexer, projectRoot } = createTestContractEvidenceIndexer({
      'packages/demo/package.json': JSON.stringify({ name: '@l1dder/demo' }),
      'packages/demo/src/distant.test.ts': [
        '  // @tc TC-001-05-A',
        '  const helper = 1;',
        '  void helper;',
        '',
        "  it('far below and must not attach', () => {});",
        '',
      ].join('\n'),
    });

    const index = await indexer.index(projectRoot);
    expect(index.evidence).toEqual([]);
    expect(
      index.markerWarnings.some((w) =>
        /must directly precede an it\(\)\/test\(\) call/u.test(w.message),
      ),
    ).toBe(true);
  });

  it('given two markers stacked above one test, both contracts get evidence', async () => {
    const { indexer, projectRoot } = createTestContractEvidenceIndexer({
      'packages/demo/package.json': JSON.stringify({ name: '@l1dder/demo' }),
      'packages/demo/src/stack.test.ts': [
        '  // @tc TC-001-05-A',
        '  // @tc TC-001-05-B',
        "  it('shared proof', () => {});",
        '',
      ].join('\n'),
    });

    const index = await indexer.index(projectRoot);
    expect(index.markerWarnings).toEqual([]);
    expect(
      index.evidence
        .map((e) => e.contractId)
        .slice()
        .sort(),
    ).toEqual(['TC-001-05-A', 'TC-001-05-B']);
    expect(index.evidence.every((e) => e.title === 'shared proof')).toBe(true);
    expect(index.evidence.every((e) => e.line === 3)).toBe(true);
  });

  it('supports multiple TC ids on one marker and it.each titles', async () => {
    const { indexer, projectRoot } = createTestContractEvidenceIndexer({
      'packages/demo/package.json': JSON.stringify({ name: '@l1dder/demo' }),
      'packages/demo/src/multi.test.ts': [
        '  // @tc TC-001-05-A, TC-001-05-B',
        "  it.each([1, 2])('handles case %s', (n) => {",
        '    void n;',
        '  });',
        '',
      ].join('\n'),
    });

    const index = await indexer.index(projectRoot);
    expect(index.evidence.map((e) => e.contractId).sort()).toEqual([
      'TC-001-05-A',
      'TC-001-05-B',
    ]);
    expect(index.evidence.every((e) => e.title === 'handles case %s')).toBe(
      true,
    );
  });

  it('ignores unmarked tests and non-test sources', async () => {
    const { indexer, projectRoot } = createTestContractEvidenceIndexer({
      'packages/demo/package.json': JSON.stringify({ name: '@l1dder/demo' }),
      'packages/demo/src/demo.ts': 'export class Demo {}\n',
      'packages/demo/src/demo.test.ts': [
        "  it('unmarked positive behavior', () => {});",
        '  // @tc TC-002-01-A',
        "  it.skip('marked skip still counts', () => {});",
        '',
      ].join('\n'),
    });

    const index = await indexer.index(projectRoot);
    expect(index.evidence).toHaveLength(1);
    expect(index.evidence[0]?.title).toBe('marked skip still counts');
  });

  it('warns when marker has invalid id or no following test', async () => {
    const { indexer, projectRoot } = createTestContractEvidenceIndexer({
      'packages/demo/package.json': JSON.stringify({ name: '@l1dder/demo' }),
      'packages/demo/src/bad.test.ts': [
        '  // @tc NOT-A-TC',
        "  it('still a test', () => {});",
        '  // @tc TC-001-01-A',
        '  const orphan = 1;',
        '',
      ].join('\n'),
    });

    const index = await indexer.index(projectRoot);
    expect(index.evidence).toEqual([]);
    expect(index.markerWarnings.length).toBeGreaterThanOrEqual(2);
    expect(
      index.markerWarnings.some((w) => /Invalid @tc contract id/u.test(w.message)),
    ).toBe(true);
    expect(
      index.markerWarnings.some((w) =>
        /must directly precede an it\(\)\/test\(\) call/u.test(w.message),
      ),
    ).toBe(true);
  });
});
