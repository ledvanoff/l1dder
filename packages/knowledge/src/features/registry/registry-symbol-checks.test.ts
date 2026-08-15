import { describe, expect, it } from 'vitest';
import { ProjectRegistrySchema, type ProjectRegistry } from '@l1dder/schemas';

import { collectSymbolIssues } from './registry-symbol-checks.js';
import type { CodeSymbol } from '@l1dder/core';
import {
  createTestRegistryValidator,
  createTestSymbolIndexer,
} from '../../testing.js';

/** Build a schema-valid registry from a partial input. */
function registry(input: unknown): ProjectRegistry {
  return ProjectRegistrySchema.parse(input);
}

/** Minimal linked registry with optional symbols. */
function baseRegistry(
  symbols: ProjectRegistry['symbols'] = [],
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
        covers: { models: ['MODEL-001'], integrations: [], architecture: [] },
        test_contracts: [],
      },
    ],
    models: [
      {
        id: 'MODEL-001',
        title: 'Registry',
        source: 'knowledge/models/model-001.md#model-001',
        usecases: ['UC-001-01'],
      },
    ],
    symbols,
  });
}

/** Helper to build a public indexed symbol. */
function pub(
  partial: Pick<CodeSymbol, 'name' | 'kind' | 'file'> &
    Partial<Omit<CodeSymbol, 'name' | 'kind' | 'file'>>,
): CodeSymbol {
  return {
    package: '@l1dder/demo',
    exportPath: '.',
    featureIds: [],
    usecaseIds: [],
    modelIds: [],
    ...partial,
  };
}

describe('collectSymbolIssues', () => {
  // @tc TC-003-01-A
  it('given one name exported from two files of one package via one barrel, reports error with both locations', () => {
    const indexed: CodeSymbol[] = [
      pub({
        name: 'SharedName',
        kind: 'class',
        file: 'packages/demo/src/one.ts',
        package: '@l1dder/demo',
        exportPath: '.',
      }),
      pub({
        name: 'SharedName',
        kind: 'class',
        file: 'packages/demo/src/two.ts',
        package: '@l1dder/demo',
        exportPath: '.',
      }),
    ];

    const issues = collectSymbolIssues(baseRegistry(), indexed);
    const dup = issues.find((i) => i.code === 'REGISTRY_SYMBOL_DUPLICATE');
    expect(dup).toBeDefined();
    expect(dup?.severity).toBe('error');
    expect(dup?.message).toContain('packages/demo/src/one.ts');
    expect(dup?.message).toContain('packages/demo/src/two.ts');
  });

  it('given one name in two different packages, reports warning not error and ok stays true', async () => {
    const indexed: CodeSymbol[] = [
      pub({
        name: 'Phase',
        kind: 'type',
        file: 'packages/core/src/domain/phase.ts',
        package: '@l1dder/core',
      }),
      pub({
        name: 'Phase',
        kind: 'type',
        file: 'packages/schemas/src/state.ts',
        package: '@l1dder/schemas',
      }),
    ];

    const issues = collectSymbolIssues(baseRegistry(), indexed);
    expect(issues.some((i) => i.code === 'REGISTRY_SYMBOL_DUPLICATE')).toBe(
      false,
    );
    const cross = issues.find((i) => i.code === 'REGISTRY_SYMBOL_CROSS_PACKAGE');
    expect(cross).toBeDefined();
    expect(cross?.severity).toBe('warning');
    expect(cross?.message).toContain('packages/core/src/domain/phase.ts');
    expect(cross?.message).toContain('packages/schemas/src/state.ts');

    const files = {
      'knowledge/to-be/usecases.md': '## UC-001-01\n',
      'knowledge/models/model-001.md': '## MODEL-001\n',
      'packages/core/package.json': JSON.stringify({
        name: '@l1dder/core',
        exports: { '.': { import: './dist/index.js' } },
      }),
      'packages/schemas/package.json': JSON.stringify({
        name: '@l1dder/schemas',
        exports: { '.': { import: './dist/index.js' } },
      }),
      'packages/core/src/index.ts': "export type { Phase } from './domain/phase.js';\n",
      'packages/core/src/domain/phase.ts': 'export type Phase = string;\n',
      'packages/schemas/src/index.ts': "export type { Phase } from './state.js';\n",
      'packages/schemas/src/state.ts': 'export type Phase = string;\n',
    };
    const validator = createTestRegistryValidator(files, '/project', {
      withSymbolIndexer: true,
    });
    const report = await validator.validate(baseRegistry());
    expect(report.ok).toBe(true);
    expect(
      report.issues.some((i) => i.code === 'REGISTRY_SYMBOL_CROSS_PACKAGE'),
    ).toBe(true);
    expect(
      report.issues.some((i) => i.code === 'REGISTRY_SYMBOL_DUPLICATE'),
    ).toBe(false);
  });

  it('given pair X and XSchema, emits no similar warning', () => {
    const indexed: CodeSymbol[] = [
      pub({
        name: 'Config',
        kind: 'type',
        file: 'packages/schemas/src/config.ts',
        package: '@l1dder/schemas',
      }),
      pub({
        name: 'ConfigSchema',
        kind: 'schema',
        file: 'packages/schemas/src/config.ts',
        package: '@l1dder/schemas',
      }),
    ];

    const issues = collectSymbolIssues(baseRegistry(), indexed);
    expect(issues.some((i) => i.code === 'REGISTRY_SYMBOL_SIMILAR')).toBe(false);
  });

  it('given type Ok and function ok, emits no similar warning', () => {
    const indexed: CodeSymbol[] = [
      pub({
        name: 'Ok',
        kind: 'type',
        file: 'packages/core/src/domain/result.ts',
        package: '@l1dder/core',
      }),
      pub({
        name: 'ok',
        kind: 'function',
        file: 'packages/core/src/domain/result.ts',
        package: '@l1dder/core',
      }),
    ];

    const issues = collectSymbolIssues(baseRegistry(), indexed);
    expect(issues.some((i) => i.code === 'REGISTRY_SYMBOL_SIMILAR')).toBe(false);
  });

  it('given two really similar names like StageManager and StateManager, warning is kept', () => {
    const indexed: CodeSymbol[] = [
      pub({
        name: 'StageManager',
        kind: 'class',
        file: 'packages/state/src/features/stage/stage-manager.ts',
        package: '@l1dder/state',
      }),
      pub({
        name: 'StateManager',
        kind: 'class',
        file: 'packages/state/src/state-manager.ts',
        package: '@l1dder/state',
      }),
    ];

    const issues = collectSymbolIssues(baseRegistry(), indexed);
    const similar = issues.find((i) => i.code === 'REGISTRY_SYMBOL_SIMILAR');
    expect(similar).toBeDefined();
    expect(similar?.severity).toBe('warning');
    expect(similar?.message).toMatch(/StageManager/);
    expect(similar?.message).toMatch(/StateManager/);
  });

  it('reports REGISTRY_SYMBOL_MISSING when declaration is absent', () => {
    const issues = collectSymbolIssues(
      baseRegistry([
        {
          id: 'SYM-001',
          name: 'MissingClass',
          kind: 'class',
          file: 'packages/demo/src/missing.ts',
          features: ['FEAT-001'],
          usecases: [],
          models: [],
        },
      ]),
      [],
    );

    expect(issues.some((i) => i.code === 'REGISTRY_SYMBOL_MISSING')).toBe(true);
  });

  it('reports REGISTRY_SYMBOL_EXPORT_PATH when barrel does not re-export', () => {
    const indexed: CodeSymbol[] = [
      {
        name: 'Internal',
        kind: 'class',
        file: 'packages/demo/src/internal.ts',
        package: '@l1dder/demo',
        featureIds: [],
        usecaseIds: [],
        modelIds: [],
      },
    ];

    const issues = collectSymbolIssues(
      baseRegistry([
        {
          id: 'SYM-001',
          name: 'Internal',
          kind: 'class',
          file: 'packages/demo/src/internal.ts',
          export_path: '.',
          features: [],
          usecases: [],
          models: [],
        },
      ]),
      indexed,
    );

    expect(issues.some((i) => i.code === 'REGISTRY_SYMBOL_EXPORT_PATH')).toBe(
      true,
    );
  });
});

describe('TypeScriptSymbolIndexer + RegistryValidator integration', () => {
  it('given matching manifest symbol, validation passes', async () => {
    const files = {
      'knowledge/to-be/usecases.md': '## UC-001-01\n',
      'knowledge/models/model-001.md': '## MODEL-001\n',
      'packages/demo/package.json': JSON.stringify({
        name: '@l1dder/demo',
        exports: { '.': { import: './dist/index.js' } },
      }),
      'packages/demo/src/index.ts': "export { DemoService } from './demo.js';\n",
      'packages/demo/src/demo.ts': 'export class DemoService {}\n',
    };

    const validator = createTestRegistryValidator(files, '/project', {
      withSymbolIndexer: true,
    });
    const report = await validator.validate(
      baseRegistry([
        {
          id: 'SYM-001',
          name: 'DemoService',
          kind: 'class',
          file: 'packages/demo/src/demo.ts',
          package: '@l1dder/demo',
          export_path: '.',
          features: ['FEAT-001'],
          usecases: ['UC-001-01'],
          models: ['MODEL-001'],
        },
      ]),
    );

    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it('createTestSymbolIndexer wires InMemoryFileSystem for package scans', async () => {
    const { indexer, projectRoot } = createTestSymbolIndexer({
      'packages/demo/package.json': JSON.stringify({
        name: '@l1dder/demo',
        exports: { '.': { import: './dist/index.js' } },
      }),
      'packages/demo/src/index.ts': 'export const Answer = 42;\n',
    });
    const symbols = await indexer.index(projectRoot);
    expect(symbols.some((s) => s.name === 'Answer' && s.kind === 'const')).toBe(
      true,
    );
  });
});
