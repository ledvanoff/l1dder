import { describe, expect, it } from 'vitest';

import { createTestSymbolIndexer } from '../../testing.js';

/** Shared package.json with `.` and `./testing` export barrels. */
function packageJson(name: string): string {
  return JSON.stringify({
    name,
    type: 'module',
    exports: {
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
      },
      './testing': {
        types: './dist/testing.d.ts',
        import: './dist/testing.js',
      },
    },
  });
}

describe('TypeScriptSymbolIndexer', () => {
  it('given barrel-exported Zod schema and class, both appear with correct paths', async () => {
    const { indexer, projectRoot } = createTestSymbolIndexer({
      'packages/demo/package.json': packageJson('@l1dder/demo'),
      'packages/demo/src/index.ts': [
        "export { DemoService } from './demo-service.js';",
        "export { DemoSchema } from './demo-schema.js';",
        '',
      ].join('\n'),
      'packages/demo/src/testing.ts':
        "export { createDemoFixture } from './create-demo-fixture.js';\n",
      'packages/demo/src/demo-service.ts':
        'export class DemoService {}\n',
      'packages/demo/src/demo-schema.ts':
        'import { z } from "zod/v4";\nexport const DemoSchema = z.object({ id: z.string() });\n',
      'packages/demo/src/create-demo-fixture.ts':
        'export function createDemoFixture(): void {}\n',
    });

    const symbols = await indexer.index(projectRoot);
    const service = symbols.find((s) => s.name === 'DemoService');
    const schema = symbols.find((s) => s.name === 'DemoSchema');
    const fixture = symbols.find((s) => s.name === 'createDemoFixture');

    expect(service).toMatchObject({
      kind: 'class',
      file: 'packages/demo/src/demo-service.ts',
      package: '@l1dder/demo',
      exportPath: '.',
      featureIds: [],
      usecaseIds: [],
      modelIds: [],
    });
    expect(schema).toMatchObject({
      kind: 'schema',
      file: 'packages/demo/src/demo-schema.ts',
      package: '@l1dder/demo',
      exportPath: '.',
    });
    expect(fixture).toMatchObject({
      kind: 'function',
      exportPath: './testing',
    });
  });

  it('given private helper, it does not appear in the public symbol index', async () => {
    const { indexer, projectRoot } = createTestSymbolIndexer({
      'packages/demo/package.json': packageJson('@l1dder/demo'),
      'packages/demo/src/index.ts':
        "export { PublicApi } from './public-api.js';\n",
      'packages/demo/src/public-api.ts': [
        'export class PublicApi {}',
        'function privateHelper(): void {}',
        'const hidden = 1;',
        '',
      ].join('\n'),
    });

    const symbols = await indexer.index(projectRoot);
    expect(symbols.map((s) => s.name).sort()).toEqual(['PublicApi']);
    expect(symbols[0]?.exportPath).toBe('.');
  });

  it('given export not re-exported by barrel, exportPath is undefined', async () => {
    const { indexer, projectRoot } = createTestSymbolIndexer({
      'packages/demo/package.json': packageJson('@l1dder/demo'),
      'packages/demo/src/index.ts':
        "export { PublicApi } from './public-api.js';\n",
      'packages/demo/src/public-api.ts': 'export class PublicApi {}\n',
      'packages/demo/src/internal.ts': 'export class InternalOnly {}\n',
    });

    const symbols = await indexer.index(projectRoot);
    const internal = symbols.find((s) => s.name === 'InternalOnly');
    expect(internal).toBeDefined();
    expect(internal?.exportPath).toBeUndefined();
  });

  it('ignores test and spec files', async () => {
    const { indexer, projectRoot } = createTestSymbolIndexer({
      'packages/demo/package.json': packageJson('@l1dder/demo'),
      'packages/demo/src/index.ts': "export { Real } from './real.js';\n",
      'packages/demo/src/real.ts': 'export class Real {}\n',
      'packages/demo/src/real.test.ts': 'export class TestOnly {}\n',
      'packages/demo/src/real.spec.ts': 'export class SpecOnly {}\n',
    });

    const names = (await indexer.index(projectRoot)).map((s) => s.name).sort();
    expect(names).toEqual(['Real']);
  });
});
