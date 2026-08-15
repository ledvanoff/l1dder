import { describe, expect, it } from 'vitest';

import {
  ProjectRegistrySchema,
  projectRegistryJsonSchema,
} from './registry.js';

/** Minimal valid registry used as a base for mutation tests. */
function minimalRegistry() {
  return {
    schema_version: 1 as const,
    features: [
      {
        id: 'FEAT-001',
        title: 'Guided Product Discovery',
        status: 'planned' as const,
        usecases: ['UC-001-01'],
        sources: {
          to_be: 'knowledge/to-be/usecases.md#feat-001',
        },
        iterations: ['HARD-2'],
      },
    ],
    usecases: [
      {
        id: 'UC-001-01',
        title: 'Run discovery milestones',
        feature: 'FEAT-001',
        sources: {
          requirements: 'knowledge/to-be/usecases.md#uc-001-01',
        },
        covers: {
          architecture: ['knowledge/to-be/architecture.md#feat-001'],
          integrations: [],
          models: [],
        },
        test_contracts: ['TC-001-01-A'],
      },
    ],
    test_contracts: [
      {
        id: 'TC-001-01-A',
        title: 'given valid milestone order, discovery advances',
        feature: 'FEAT-001',
        usecase: 'UC-001-01',
        task: 'T-04',
      },
    ],
  };
}

/**
 * Finds the first issue whose path equals the expected segments.
 *
 * @param issues - Zod issues from a failed parse
 * @param path - Expected path segments
 */
function issueAt(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
  path: ReadonlyArray<PropertyKey>,
): { path: PropertyKey[]; message: string } | undefined {
  return issues.find(
    (issue) =>
      issue.path.length === path.length &&
      issue.path.every((segment, index) => segment === path[index]),
  );
}

describe('ProjectRegistrySchema', () => {
  it('parses a minimal manifest and applies empty-collection defaults', () => {
    const result = ProjectRegistrySchema.parse({
      schema_version: 1,
    });

    expect(result.features).toEqual([]);
    expect(result.usecases).toEqual([]);
    expect(result.decisions).toEqual([]);
    expect(result.integrations).toEqual([]);
    expect(result.models).toEqual([]);
    expect(result.enums).toEqual([]);
    expect(result.test_contracts).toEqual([]);
    expect(result.symbols).toEqual([]);
    expect(result.debt_items).toEqual([]);
    expect(result.backlog_items).toEqual([]);
    expect(result.iterations).toEqual([]);
  });

  it('rejects unknown keys on the root object', () => {
    const result = ProjectRegistrySchema.safeParse({
      schema_version: 1,
      narrative: 'should not leak into the machine contract',
    });

    expect(result.success).toBe(false);
  });

  it('given UC-002-01 under FEAT-001, validation fails', () => {
    const input = minimalRegistry();
    input.usecases = [
      {
        id: 'UC-002-01',
        title: 'Wrong parent number',
        feature: 'FEAT-001',
        sources: {
          requirements: 'knowledge/to-be/usecases.md#uc-002-01',
        },
        covers: {
          architecture: [],
          integrations: [],
          models: [],
        },
        test_contracts: [],
      },
    ];
    const feature = input.features[0];
    if (feature === undefined) {
      throw new Error('expected FEAT-001 fixture');
    }
    input.features[0] = {
      ...feature,
      usecases: ['UC-002-01'],
    };
    input.test_contracts = [];

    const result = ProjectRegistrySchema.safeParse(input);

    expect(result.success).toBe(false);
    if (result.success) return;

    const issue = issueAt(result.error.issues, ['usecases', 0, 'feature']);
    expect(issue).toBeDefined();
    expect(issue?.message).toContain('UC-002-01');
    expect(issue?.message).toContain('FEAT-001');
  });

  it('given duplicate FEAT ID, validation fails with exact path', () => {
    const input = {
      schema_version: 1 as const,
      features: [
        {
          id: 'FEAT-001',
          title: 'First',
          status: 'planned' as const,
          sources: { to_be: 'knowledge/to-be/usecases.md#feat-001-a' },
        },
        {
          id: 'FEAT-001',
          title: 'Duplicate',
          status: 'planned' as const,
          sources: { to_be: 'knowledge/to-be/usecases.md#feat-001-b' },
        },
      ],
    };

    const result = ProjectRegistrySchema.safeParse(input);

    expect(result.success).toBe(false);
    if (result.success) return;

    const issue = issueAt(result.error.issues, ['features', 1, 'id']);
    expect(issue).toBeDefined();
    expect(issue?.message).toContain('FEAT-001');
  });

  it('given duplicate source anchor, validation fails with exact path', () => {
    const input = {
      schema_version: 1 as const,
      features: [
        {
          id: 'FEAT-001',
          title: 'First',
          status: 'planned' as const,
          sources: { to_be: 'knowledge/to-be/usecases.md#shared' },
        },
        {
          id: 'FEAT-002',
          title: 'Second',
          status: 'planned' as const,
          sources: { to_be: 'knowledge/to-be/usecases.md#shared' },
        },
      ],
    };

    const result = ProjectRegistrySchema.safeParse(input);

    expect(result.success).toBe(false);
    if (result.success) return;

    const issue = issueAt(result.error.issues, [
      'features',
      1,
      'sources',
      'to_be',
    ]);
    expect(issue).toBeDefined();
    expect(issue?.message).toContain('knowledge/to-be/usecases.md#shared');
  });

  it('rejects a broken test_contracts reference with exact path', () => {
    const input = minimalRegistry();
    const usecase = input.usecases[0];
    if (usecase === undefined) {
      throw new Error('expected UC-001-01 fixture');
    }
    input.usecases[0] = {
      ...usecase,
      test_contracts: ['TC-999-01-A'],
    };
    input.test_contracts = [];

    const result = ProjectRegistrySchema.safeParse(input);

    expect(result.success).toBe(false);
    if (result.success) return;

    const issue = issueAt(result.error.issues, [
      'usecases',
      0,
      'test_contracts',
      0,
    ]);
    expect(issue).toBeDefined();
    expect(issue?.message).toContain('TC-999-01-A');
  });

  it('accepts historical DEC and INT id forms without renaming', () => {
    const result = ProjectRegistrySchema.safeParse({
      schema_version: 1,
      decisions: [
        { id: 'DEC-6-1', title: 'Numeric track', source: 'archive/design/a.md#dec-6-1' },
        { id: 'DEC-DM-15', title: 'Data model track', source: 'archive/design/b.md#dec-dm-15' },
        { id: 'DEC-HARD-02', title: 'Iteration track', source: 'specs/iter-hard-hardening/spec.md#dec-hard-02' },
      ],
      integrations: [
        { id: 'INT-01', title: 'Cursor adapter', source: 'knowledge/to-be/integrations.md#int-01' },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('parses a consistent minimal linked manifest', () => {
    const result = ProjectRegistrySchema.parse(minimalRegistry());

    expect(result.features[0]?.usecases).toEqual(['UC-001-01']);
    expect(result.usecases[0]?.test_contracts).toEqual(['TC-001-01-A']);
    expect(result.decisions).toEqual([]);
  });

  it('defaults test_contracts.required to true', () => {
    const result = ProjectRegistrySchema.parse(minimalRegistry());
    expect(result.test_contracts[0]?.required).toBe(true);
  });

  it('accepts a valid SYM id with feature/usecase/model links', () => {
    const base = minimalRegistry();
    const result = ProjectRegistrySchema.safeParse({
      schema_version: 1,
      features: base.features,
      usecases: [
        {
          id: 'UC-001-01',
          title: 'Run discovery milestones',
          feature: 'FEAT-001',
          sources: { requirements: 'knowledge/to-be/usecases.md#uc-001-01' },
          covers: {
            architecture: ['knowledge/to-be/architecture.md#feat-001'],
            integrations: [],
            models: ['MODEL-001'],
          },
          test_contracts: ['TC-001-01-A'],
        },
      ],
      models: [
        {
          id: 'MODEL-001',
          title: 'Core',
          source: 'knowledge/to-be/erd.md#model-001',
          usecases: ['UC-001-01'],
        },
      ],
      test_contracts: base.test_contracts,
      symbols: [
        {
          id: 'SYM-001',
          name: 'StateLoader',
          kind: 'class',
          file: 'packages/state/src/io/state-loader.ts',
          package: '@l1dder/state',
          export_path: '.',
          features: ['FEAT-001'],
          usecases: ['UC-001-01'],
          models: ['MODEL-001'],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid SYM id', () => {
    const result = ProjectRegistrySchema.safeParse({
      schema_version: 1,
      symbols: [
        {
          id: 'SYM-1',
          name: 'Bad',
          kind: 'class',
          file: 'packages/a/src/a.ts',
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('rejects a broken symbol feature reference with exact path', () => {
    const result = ProjectRegistrySchema.safeParse({
      schema_version: 1,
      symbols: [
        {
          id: 'SYM-001',
          name: 'Orphan',
          kind: 'class',
          file: 'packages/a/src/a.ts',
          features: ['FEAT-999'],
        },
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    const issue = issueAt(result.error.issues, ['symbols', 0, 'features', 0]);
    expect(issue).toBeDefined();
    expect(issue?.message).toContain('FEAT-999');
  });

  it('rejects duplicate symbol name+file pairs', () => {
    const result = ProjectRegistrySchema.safeParse({
      schema_version: 1,
      symbols: [
        {
          id: 'SYM-001',
          name: 'Dup',
          kind: 'class',
          file: 'packages/a/src/a.ts',
        },
        {
          id: 'SYM-002',
          name: 'Dup',
          kind: 'interface',
          file: 'packages/a/src/a.ts',
        },
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    const issue = issueAt(result.error.issues, ['symbols', 1, 'name']);
    expect(issue).toBeDefined();
    expect(issue?.message).toMatch(/duplicate symbol name\+file/i);
  });

  it('does not treat symbol file paths as unique source anchors', () => {
    const base = minimalRegistry();
    const result = ProjectRegistrySchema.safeParse({
      schema_version: 1,
      features: base.features,
      usecases: [
        {
          id: 'UC-001-01',
          title: 'Run discovery milestones',
          feature: 'FEAT-001',
          sources: { requirements: 'knowledge/to-be/usecases.md#uc-001-01' },
          covers: {
            architecture: ['knowledge/to-be/architecture.md#feat-001'],
            integrations: [],
            models: ['MODEL-001'],
          },
          test_contracts: ['TC-001-01-A'],
        },
      ],
      models: [
        {
          id: 'MODEL-001',
          title: 'Core',
          source: 'knowledge/to-be/erd.md#model-001',
          usecases: ['UC-001-01'],
        },
      ],
      test_contracts: base.test_contracts,
      symbols: [
        {
          id: 'SYM-001',
          name: 'Loader',
          kind: 'class',
          // Same string as a model source would be illegal for anchors, but
          // symbol.file must not participate in anchor uniqueness.
          file: 'knowledge/to-be/erd.md#model-001',
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('parses a valid iterations rail with nested sessions', () => {
    const input = {
      ...minimalRegistry(),
      iterations: [
        {
          id: 'ITER-001',
          title: 'Hardening',
          status: 'in_progress' as const,
          depends_on: [],
          source_anchor: 'knowledge/roadmap.md#iter-001',
          sessions: [
            {
              id: 'HARD-5',
              title: 'Task rails',
              status: 'pending' as const,
              profile: 'delivery' as const,
              depends_on: [],
              features: ['FEAT-001'],
              usecases: ['UC-001-01'],
              source_anchor: 'knowledge/roadmap.md#hard-5',
            },
          ],
        },
      ],
    };

    const result = ProjectRegistrySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.iterations).toHaveLength(1);
    expect(result.data.iterations[0]?.sessions[0]?.id).toBe('HARD-5');
  });

  it('accepts real rail session ids with letter suffixes', () => {
    const ids = ['HARD-D', 'H-HARD', 'H-PG', 'DF-E1', 'AS-1', 'TD-1', 'AS-001'];
    const input = {
      schema_version: 1 as const,
      iterations: [
        {
          id: 'ITER-001',
          title: 'Rails',
          status: 'in_progress' as const,
          source_anchor: 'knowledge/roadmap.md#iter-001',
          sessions: ids.map((id) => ({
            id,
            title: `Session ${id}`,
            status: 'done' as const,
            profile: 'delivery' as const,
            source_anchor: 'knowledge/roadmap.md#iter-001',
          })),
        },
      ],
    };

    const result = ProjectRegistrySchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects session ids without a hyphenated suffix', () => {
    const input = {
      schema_version: 1 as const,
      iterations: [
        {
          id: 'ITER-001',
          title: 'Rails',
          status: 'pending' as const,
          source_anchor: 'knowledge/roadmap.md#iter-001',
          sessions: [
            {
              id: 'triage',
              title: 'Not a rail session',
              status: 'done' as const,
              profile: 'delivery' as const,
              source_anchor: 'knowledge/roadmap.md#iter-001',
            },
          ],
        },
      ],
    };

    expect(ProjectRegistrySchema.safeParse(input).success).toBe(false);
  });

  it('rejects duplicate session ids across iterations', () => {
    const input = {
      schema_version: 1 as const,
      iterations: [
        {
          id: 'ITER-001',
          title: 'One',
          status: 'pending' as const,
          source_anchor: 'knowledge/roadmap.md#iter-001',
          sessions: [
            {
              id: 'AS-001',
              title: 'First',
              status: 'pending' as const,
              profile: 'delivery' as const,
              source_anchor: 'knowledge/roadmap.md#as-001a',
            },
          ],
        },
        {
          id: 'ITER-002',
          title: 'Two',
          status: 'pending' as const,
          source_anchor: 'knowledge/roadmap.md#iter-002',
          sessions: [
            {
              id: 'AS-001',
              title: 'Dup',
              status: 'pending' as const,
              profile: 'delivery' as const,
              source_anchor: 'knowledge/roadmap.md#as-001b',
            },
          ],
        },
      ],
    };

    const result = ProjectRegistrySchema.safeParse(input);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(
      issueAt(result.error.issues, ['iterations', 1, 'sessions', 0, 'id'])
        ?.message,
    ).toContain('duplicate id AS-001');
  });

  it('allows sessions across iterations to share the same Delivery Plan source_anchor', () => {
    const sharedAnchor = 'knowledge/roadmap.md#delivery-plan';
    const input = {
      schema_version: 1 as const,
      iterations: [
        {
          id: 'ITER-001',
          title: 'One',
          status: 'pending' as const,
          source_anchor: sharedAnchor,
          sessions: [
            {
              id: 'AS-001',
              title: 'First',
              status: 'pending' as const,
              profile: 'delivery' as const,
              source_anchor: sharedAnchor,
            },
            {
              id: 'AS-002',
              title: 'Second',
              status: 'pending' as const,
              profile: 'delivery' as const,
              depends_on: ['AS-001'],
              source_anchor: sharedAnchor,
            },
          ],
        },
        {
          id: 'ITER-002',
          title: 'Two',
          status: 'pending' as const,
          depends_on: ['ITER-001'],
          source_anchor: sharedAnchor,
          sessions: [
            {
              id: 'AS-003',
              title: 'Third',
              status: 'pending' as const,
              profile: 'delivery' as const,
              source_anchor: sharedAnchor,
            },
          ],
        },
      ],
    };

    const result = ProjectRegistrySchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('still rejects duplicate session ids when source_anchors are shared', () => {
    const sharedAnchor = 'knowledge/roadmap.md#delivery-plan';
    const input = {
      schema_version: 1 as const,
      iterations: [
        {
          id: 'ITER-001',
          title: 'One',
          status: 'pending' as const,
          source_anchor: sharedAnchor,
          sessions: [
            {
              id: 'AS-001',
              title: 'First',
              status: 'pending' as const,
              profile: 'delivery' as const,
              source_anchor: sharedAnchor,
            },
          ],
        },
        {
          id: 'ITER-002',
          title: 'Two',
          status: 'pending' as const,
          source_anchor: sharedAnchor,
          sessions: [
            {
              id: 'AS-001',
              title: 'Dup id',
              status: 'pending' as const,
              profile: 'delivery' as const,
              source_anchor: sharedAnchor,
            },
          ],
        },
      ],
    };

    const result = ProjectRegistrySchema.safeParse(input);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(
      issueAt(result.error.issues, ['iterations', 1, 'sessions', 0, 'id'])
        ?.message,
    ).toContain('duplicate id AS-001');
  });

  it('rejects unknown iteration depends_on references', () => {
    const input = {
      schema_version: 1 as const,
      iterations: [
        {
          id: 'ITER-001',
          title: 'One',
          status: 'pending' as const,
          depends_on: ['ITER-099'],
          source_anchor: 'knowledge/roadmap.md#iter-001',
          sessions: [],
        },
      ],
    };

    const result = ProjectRegistrySchema.safeParse(input);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(
      issueAt(result.error.issues, ['iterations', 0, 'depends_on', 0])
        ?.message,
    ).toContain('unknown reference ITER-099');
  });

  it('rejects unknown session depends_on references', () => {
    const input = {
      schema_version: 1 as const,
      iterations: [
        {
          id: 'ITER-001',
          title: 'One',
          status: 'pending' as const,
          source_anchor: 'knowledge/roadmap.md#iter-001',
          sessions: [
            {
              id: 'AS-001',
              title: 'First',
              status: 'pending' as const,
              profile: 'delivery' as const,
              depends_on: ['AS-099'],
              source_anchor: 'knowledge/roadmap.md#as-001',
            },
          ],
        },
      ],
    };

    const result = ProjectRegistrySchema.safeParse(input);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(
      issueAt(result.error.issues, [
        'iterations',
        0,
        'sessions',
        0,
        'depends_on',
        0,
      ])?.message,
    ).toContain('unknown reference AS-099');
  });

  it('rejects a dependency cycle among sessions', () => {
    const input = {
      schema_version: 1 as const,
      iterations: [
        {
          id: 'ITER-001',
          title: 'One',
          status: 'pending' as const,
          source_anchor: 'knowledge/roadmap.md#iter-001',
          sessions: [
            {
              id: 'AS-001',
              title: 'A',
              status: 'pending' as const,
              profile: 'delivery' as const,
              depends_on: ['AS-002'],
              source_anchor: 'knowledge/roadmap.md#as-001',
            },
            {
              id: 'AS-002',
              title: 'B',
              status: 'pending' as const,
              profile: 'delivery' as const,
              depends_on: ['AS-001'],
              source_anchor: 'knowledge/roadmap.md#as-002',
            },
          ],
        },
      ],
    };

    const result = ProjectRegistrySchema.safeParse(input);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(
      result.error.issues.some((issue) =>
        issue.message.includes('dependency cycle among sessions'),
      ),
    ).toBe(true);
  });

  it('rejects a dependency cycle among iterations', () => {
    const input = {
      schema_version: 1 as const,
      iterations: [
        {
          id: 'ITER-001',
          title: 'One',
          status: 'pending' as const,
          depends_on: ['ITER-002'],
          source_anchor: 'knowledge/roadmap.md#iter-001',
          sessions: [],
        },
        {
          id: 'ITER-002',
          title: 'Two',
          status: 'pending' as const,
          depends_on: ['ITER-001'],
          source_anchor: 'knowledge/roadmap.md#iter-002',
          sessions: [],
        },
      ],
    };

    const result = ProjectRegistrySchema.safeParse(input);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(
      result.error.issues.some((issue) =>
        issue.message.includes('dependency cycle among iterations'),
      ),
    ).toBe(true);
  });

  it('rejects unknown feature references on a session', () => {
    const input = {
      ...minimalRegistry(),
      iterations: [
        {
          id: 'ITER-001',
          title: 'One',
          status: 'pending' as const,
          source_anchor: 'knowledge/roadmap.md#iter-001',
          sessions: [
            {
              id: 'HARD-5',
              title: 'Rails',
              status: 'pending' as const,
              profile: 'delivery' as const,
              features: ['FEAT-999'],
              source_anchor: 'knowledge/roadmap.md#hard-5',
            },
          ],
        },
      ],
    };

    const result = ProjectRegistrySchema.safeParse(input);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(
      issueAt(result.error.issues, [
        'iterations',
        0,
        'sessions',
        0,
        'features',
        0,
      ])?.message,
    ).toContain('unknown reference FEAT-999');
  });
});

describe('projectRegistryJsonSchema', () => {
  it('generates JSON Schema without throwing', () => {
    expect(() => projectRegistryJsonSchema()).not.toThrow();

    const schema = projectRegistryJsonSchema();
    expect(schema).toMatchObject({ type: 'object' });
    expect(schema['properties']).toBeTypeOf('object');
  });

  it('is deterministic across calls', () => {
    const first = JSON.stringify(projectRegistryJsonSchema());
    const second = JSON.stringify(projectRegistryJsonSchema());
    expect(first).toBe(second);
  });
});
