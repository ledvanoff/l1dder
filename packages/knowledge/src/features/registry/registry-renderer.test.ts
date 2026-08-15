import { describe, expect, it } from 'vitest';
import { ProjectRegistrySchema, type ProjectRegistry } from '@l1dder/schemas';

import {
  extractRegistryContentHash,
  inspectGeneratedViewFreshness,
  isGeneratedViewStale,
  registryContentHash,
  renderRegistry,
} from './registry-renderer.js';

/** Parse a plain object into a typed registry. */
function registry(input: unknown): ProjectRegistry {
  return ProjectRegistrySchema.parse(input);
}

/** Small registry used for renderer determinism checks. */
function sampleRegistry(): ProjectRegistry {
  return registry({
    schema_version: 1,
    features: [
      {
        id: 'FEAT-002',
        title: 'Second | Feature',
        status: 'planned',
        usecases: ['UC-002-01'],
      },
      {
        id: 'FEAT-001',
        title: 'First Feature',
        status: 'done',
        usecases: ['UC-001-01'],
      },
    ],
    usecases: [
      {
        id: 'UC-002-01',
        title: 'Second usecase',
        feature: 'FEAT-002',
        sources: { requirements: 'knowledge/to-be/usecases.md#uc-002-01' },
        test_contracts: [],
      },
      {
        id: 'UC-001-01',
        title: 'First usecase',
        feature: 'FEAT-001',
        sources: { requirements: 'knowledge/to-be/usecases.md#uc-001-01' },
        covers: { models: ['MODEL-001'], integrations: [], architecture: [] },
        test_contracts: ['TC-001-01-A'],
      },
    ],
    models: [
      {
        id: 'MODEL-001',
        title: 'Core model',
        source: 'knowledge/to-be/erd.md#model-001',
        usecases: ['UC-001-01'],
      },
    ],
    test_contracts: [
      {
        id: 'TC-001-01-A',
        title: 'given X, expect Y',
        feature: 'FEAT-001',
        usecase: 'UC-001-01',
        task: 'T-08',
      },
    ],
  });
}

describe('registry renderer', () => {
  it('given equivalent registry input, rendered output and hash are deterministic', () => {
    const a = sampleRegistry();
    const b = registry({
      schema_version: 1,
      // Intentionally reverse collection order vs sampleRegistry().
      test_contracts: [...a.test_contracts].reverse(),
      models: [...a.models].reverse(),
      usecases: [...a.usecases].reverse(),
      features: [...a.features].reverse(),
    });

    const renderedA = renderRegistry(a);
    const renderedB = renderRegistry(b);

    expect(renderedA).toBe(renderedB);
    expect(registryContentHash(a)).toBe(registryContentHash(b));
    expect(registryContentHash(a)).toMatch(/^[a-f0-9]{12}$/);

    // Features sorted by id: FEAT-001 before FEAT-002.
    const featSection = renderedA.indexOf('## Features');
    const feat001 = renderedA.indexOf('| FEAT-001 |', featSection);
    const feat002 = renderedA.indexOf('| FEAT-002 |', featSection);
    expect(feat001).toBeGreaterThan(-1);
    expect(feat002).toBeGreaterThan(feat001);

    // Pipe characters in titles are escaped.
    expect(renderedA).toContain('Second \\| Feature');

    // No unstable timestamps / package versions.
    expect(renderedA).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(renderedA).not.toMatch(/0\.\d+\.\d+/);
  });

  it('embeds hash marker that matches registryContentHash', () => {
    const data = sampleRegistry();
    const rendered = renderRegistry(data);
    const hash = registryContentHash(data);

    expect(rendered.startsWith(`<!-- l1dder:registry-hash ${hash} -->`)).toBe(
      true,
    );
  });

  it('reports stale when marker is missing or hash mismatches', () => {
    const data = sampleRegistry();
    const fresh = renderRegistry(data);

    expect(isGeneratedViewStale(fresh, data)).toBe(false);
    expect(inspectGeneratedViewFreshness(fresh, data)).toBe('fresh');
    expect(isGeneratedViewStale('# Project Registry\n', data)).toBe(true);
    expect(inspectGeneratedViewFreshness('# Project Registry\n', data)).toBe(
      'missing-marker',
    );
    expect(
      isGeneratedViewStale(
        '<!-- l1dder:registry-hash deadbeef0000 -->\n# Project Registry\n',
        data,
      ),
    ).toBe(true);
    expect(
      inspectGeneratedViewFreshness(
        '<!-- l1dder:registry-hash deadbeef0000 -->\n# Project Registry\n',
        data,
      ),
    ).toBe('manifest-changed');
  });

  it('given generated view with appended text (marker intact), reports view-edited stale', () => {
    const data = sampleRegistry();
    const fresh = renderRegistry(data);
    const edited = `${fresh}garbage\n`;

    expect(inspectGeneratedViewFreshness(edited, data)).toBe('view-edited');
    expect(isGeneratedViewStale(edited, data)).toBe(true);
  });

  it('given middle-of-table edit (marker intact), reports view-edited stale', () => {
    const data = sampleRegistry();
    const fresh = renderRegistry(data);
    const edited = fresh.replace('| FEAT-001 |', '| FEAT-001-EDITED |');

    expect(edited).not.toBe(fresh);
    expect(extractRegistryContentHash(edited)).toBe(registryContentHash(data));
    expect(inspectGeneratedViewFreshness(edited, data)).toBe('view-edited');
    expect(isGeneratedViewStale(edited, data)).toBe(true);
  });

  it('given untouched view after render, reports fresh', () => {
    const data = sampleRegistry();
    const fresh = renderRegistry(data);

    expect(inspectGeneratedViewFreshness(fresh, data)).toBe('fresh');
    expect(isGeneratedViewStale(fresh, data)).toBe(false);
  });

  it('reports fresh after equivalent reorder of registry arrays', () => {
    const a = sampleRegistry();
    const b = registry({
      schema_version: 1,
      features: [...a.features].reverse(),
      usecases: [...a.usecases].reverse(),
      models: [...a.models],
      test_contracts: [...a.test_contracts],
    });

    const view = renderRegistry(a);
    expect(isGeneratedViewStale(view, b)).toBe(false);
  });

  it('given reordered symbols, public API Mermaid diagram is byte-deterministic', () => {
    const a = registry({
      schema_version: 1,
      features: [
        {
          id: 'FEAT-001',
          title: 'First',
          status: 'planned',
          usecases: [],
        },
      ],
      models: [
        {
          id: 'MODEL-001',
          title: 'Core',
          source: 'knowledge/to-be/erd.md#model-001',
          usecases: [],
        },
      ],
      symbols: [
        {
          id: 'SYM-002',
          name: 'Beta',
          kind: 'class',
          file: 'packages/b/src/beta.ts',
          package: '@l1dder/b',
          export_path: '.',
          features: ['FEAT-001'],
          models: ['MODEL-001'],
        },
        {
          id: 'SYM-001',
          name: 'Alpha',
          kind: 'schema',
          file: 'packages/a/src/alpha.ts',
          package: '@l1dder/a',
          export_path: '.',
          features: ['FEAT-001'],
        },
        {
          id: 'SYM-003',
          name: 'Hidden',
          kind: 'function',
          file: 'packages/a/src/hidden.ts',
          package: '@l1dder/a',
          // no export_path → must not appear in the diagram
        },
      ],
    });
    const b = registry({
      schema_version: 1,
      features: [...a.features],
      models: [...a.models],
      symbols: [...a.symbols].reverse(),
    });

    const renderedA = renderRegistry(a);
    const renderedB = renderRegistry(b);
    expect(renderedA).toBe(renderedB);

    const diagramStart = renderedA.indexOf('## Domain / Public API');
    expect(diagramStart).toBeGreaterThan(-1);
    const diagram = renderedA.slice(diagramStart);
    expect(diagram).toContain('```mermaid');
    expect(diagram).toContain('Alpha');
    expect(diagram).toContain('Beta');
    expect(diagram).not.toContain('Hidden');
    expect(diagram).toContain('-->');
    expect(diagram).toContain('FEAT-001');
    expect(diagram).toContain('MODEL-001');

    // Hash marker is outside the body; diagram is part of the hashed body.
    const hash = registryContentHash(a);
    expect(renderedA.startsWith(`<!-- l1dder:registry-hash ${hash} -->`)).toBe(
      true,
    );
  });

  it('renders deterministic symbol→feature/model edges for visible nodes only', () => {
    const data = registry({
      schema_version: 1,
      features: [
        { id: 'FEAT-002', title: 'B', status: 'planned', usecases: [] },
        { id: 'FEAT-001', title: 'A', status: 'planned', usecases: [] },
      ],
      models: [
        {
          id: 'MODEL-001',
          title: 'M',
          source: 'knowledge/to-be/erd.md#model-001',
          usecases: [],
        },
      ],
      symbols: [
        {
          id: 'SYM-001',
          name: 'Loader',
          kind: 'class',
          file: 'packages/a/src/loader.ts',
          package: '@l1dder/a',
          export_path: '.',
          features: ['FEAT-002', 'FEAT-001'],
          models: ['MODEL-001'],
        },
      ],
    });

    const rendered = renderRegistry(data);
    const diagramStart = rendered.indexOf('```mermaid');
    const diagramEnd = rendered.indexOf('```', diagramStart + 1);
    const diagram = rendered.slice(diagramStart, diagramEnd);

    expect(diagram).toContain('sym_SYM_001 --> feat_FEAT_001');
    expect(diagram).toContain('sym_SYM_001 --> feat_FEAT_002');
    expect(diagram).toContain('sym_SYM_001 --> model_MODEL_001');

    // Edge order is byte-sorted.
    const feat001 = diagram.indexOf('sym_SYM_001 --> feat_FEAT_001');
    const feat002 = diagram.indexOf('sym_SYM_001 --> feat_FEAT_002');
    const model001 = diagram.indexOf('sym_SYM_001 --> model_MODEL_001');
    expect(feat001).toBeGreaterThan(-1);
    expect(feat002).toBeGreaterThan(feat001);
    expect(model001).toBeGreaterThan(feat002);

    const again = renderRegistry(
      registry({
        schema_version: 1,
        features: [...data.features].reverse(),
        models: [...data.models],
        symbols: [...data.symbols],
      }),
    );
    expect(again).toBe(rendered);
  });

  it('bounds the public API diagram and reports hidden node count', () => {
    const symbols = Array.from({ length: 62 }, (_, index) => {
      const n = String(index + 1).padStart(3, '0');
      return {
        id: `SYM-${n}`,
        name: `Symbol${n}`,
        kind: 'class' as const,
        file: `packages/demo/src/s${n}.ts`,
        package: '@l1dder/demo',
        export_path: '.',
      };
    });

    const data = registry({ schema_version: 1, symbols });
    const rendered = renderRegistry(data);
    expect(rendered).toContain(
      '_2 additional public symbol(s) hidden (diagram capped at 60 nodes)._',
    );

    const diagramStart = rendered.indexOf('```mermaid');
    const diagramEnd = rendered.indexOf('```', diagramStart + 1);
    const diagram = rendered.slice(diagramStart, diagramEnd);
    expect(diagram).toContain('Symbol001');
    expect(diagram).toContain('Symbol060');
    expect(diagram).not.toContain('Symbol061');
    expect(diagram).not.toContain('Symbol062');
  });
});
