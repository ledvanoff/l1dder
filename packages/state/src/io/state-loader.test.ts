import { describe, expect, it } from 'vitest';
import { InMemoryFileSystem, NullLogger } from '@l1dder/core/testing';
import { CURRENT_SCHEMA_VERSION } from '@l1dder/schemas';
import { parseDocument } from '@l1dder/yaml';

import type { Migration } from '../migration/migration-runner.js';
import { v1Migration } from '../migration/migrations/v1.js';
import { StateLoader } from './state-loader.js';

const V1_STATE_YML = `schema_version: 1
project:
  name: legacy
  stage: delivery
  stage_history: []
  created_at: "2026-05-11T00:00:00Z"
  updated_at: "2026-05-11T00:00:00Z"
workflow:
  current_phase: idle
  current_status: in_progress
  mode: main
  iteration: 0
  phase_history: []
  gate_history: []
tasks:
  items: []
quick_tasks: []
knowledge_updates: []
`;

function createLoader(
  fs?: InMemoryFileSystem,
  migrations?: readonly Migration[],
) {
  const fileSystem = fs ?? new InMemoryFileSystem();
  const loader = new StateLoader({
    fs: fileSystem,
    logger: new NullLogger(),
    ...(migrations ? { migrations } : {}),
  });
  return { loader, fs: fileSystem };
}

describe('StateLoader', () => {
  it('migrates v1 state.yml, backs up original bytes, and persists current fields', async () => {
    const { loader, fs } = createLoader();
    await fs.writeFile('/state.yml', V1_STATE_YML);

    const result = await loader.load('/state.yml');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.migrated).toBe(true);
    expect(result.value.backupPath).toBe('/state.yml.bak');
    expect(result.value.state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.value.state.discovery).toEqual({
      milestones: [],
      current: null,
      waivers: [],
    });
    expect(result.value.state.workflow.profile).toBeNull();
    expect(result.value.state.workflow.session).toBeNull();
    expect(result.value.state.workflow.session_history).toEqual([]);

    const backup = await fs.readFile('/state.yml.bak');
    expect(backup).toBe(V1_STATE_YML);

    const onDisk = await fs.readFile('/state.yml');
    const parsed = parseDocument(onDisk).toJS();
    expect(parsed['schema_version']).toBe(CURRENT_SCHEMA_VERSION);
    expect(parsed['discovery']).toEqual({
      milestones: [],
      current: null,
      waivers: [],
    });
    expect(parsed['workflow']).toMatchObject({
      profile: null,
      session: null,
      session_history: [],
    });
  });

  it('migrates v3 state.yml to v4, validates, and persists session_history without data loss', async () => {
    const { loader, fs } = createLoader();
    const v3State = `schema_version: 3
project:
  name: hard-6
  stage: delivery
  stage_history: []
  created_at: "2026-08-10T00:00:00Z"
  updated_at: "2026-08-10T00:00:00Z"
workflow:
  current_phase: implement
  current_status: in_progress
  mode: main
  profile: delivery
  session:
    iteration: ITER-001
    session: HARD-6
    profile: delivery
    started_at: "2026-08-10T12:00:00Z"
    waiver: null
  iteration: 1
  phase_history: []
  gate_history: []
tasks:
  items: []
quick_tasks: []
knowledge_updates: []
discovery:
  milestones: []
  current: null
  waivers: []
decisions: []
`;
    await fs.writeFile('/state.yml', v3State);

    const result = await loader.load('/state.yml');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.migrated).toBe(true);
    expect(result.value.state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.value.state.workflow.session_history).toEqual([]);
    expect(result.value.state.workflow.session).toEqual({
      iteration: 'ITER-001',
      session: 'HARD-6',
      profile: 'delivery',
      started_at: '2026-08-10T12:00:00Z',
      waiver: null,
    });
    expect(result.value.state.workflow.profile).toBe('delivery');
    expect(result.value.state.project.name).toBe('hard-6');

    const onDisk = await fs.readFile('/state.yml');
    const parsed = parseDocument(onDisk).toJS();
    expect(parsed['schema_version']).toBe(CURRENT_SCHEMA_VERSION);
    expect(parsed['workflow']).toMatchObject({
      profile: 'delivery',
      session: {
        iteration: 'ITER-001',
        session: 'HARD-6',
        profile: 'delivery',
      },
      session_history: [],
    });
  });

  it('preserves YAML comments when migrating', async () => {
    const { loader, fs } = createLoader();
    const withComments = `# keep-me
${V1_STATE_YML}`;
    await fs.writeFile('/state.yml', withComments);

    const result = await loader.load('/state.yml');

    expect(result.ok).toBe(true);
    const onDisk = await fs.readFile('/state.yml');
    expect(onDisk).toContain('# keep-me');
  });

  it('leaves a current-version file byte-identical and creates no backup', async () => {
    const { loader, fs } = createLoader();
    const current = `# sentinel-no-touch
schema_version: ${String(CURRENT_SCHEMA_VERSION)}
project:
  name: current
  stage: delivery
  stage_history: []
  created_at: "2026-05-11T00:00:00Z"
  updated_at: "2026-05-11T00:00:00Z"
workflow:
  current_phase: idle
  current_status: in_progress
  mode: main
  profile: null
  iteration: 0
  phase_history: []
  gate_history: []
tasks:
  items: []
quick_tasks: []
knowledge_updates: []
discovery:
  milestones: []
  current: null
  waivers: []
`;
    await fs.writeFile('/state.yml', current);

    const result = await loader.load('/state.yml');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.migrated).toBe(false);
      expect(result.value.backupPath).toBeUndefined();
    }
    expect(await fs.exists('/state.yml.bak')).toBe(false);
    expect(await fs.readFile('/state.yml')).toBe(current);
  });

  it('returns err and keeps original bytes when migrated output fails validation', async () => {
    const { loader, fs } = createLoader(undefined, [
      v1Migration,
      {
        fromVersion: 1,
        toVersion: 2,
        migrate(state) {
          return {
            ...state,
            schema_version: 2,
            // Invalid: project.stage must be an enum value
            project: { name: 'x', stage: 'not-a-stage' },
          };
        },
      },
    ]);
    await fs.writeFile('/state.yml', V1_STATE_YML);

    const result = await loader.load('/state.yml');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('SCHEMA_VALIDATION');
    }
    expect(await fs.readFile('/state.yml')).toBe(V1_STATE_YML);
    expect(await fs.exists('/state.yml.bak')).toBe(true);
    expect(await fs.readFile('/state.yml.bak')).toBe(V1_STATE_YML);
  });

  it('refuses to persist when no migration reaches the current version', async () => {
    const { loader, fs } = createLoader(undefined, [v1Migration]);
    await fs.writeFile('/state.yml', V1_STATE_YML);

    const result = await loader.load('/state.yml');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain(String(CURRENT_SCHEMA_VERSION));
    }
    expect(await fs.readFile('/state.yml')).toBe(V1_STATE_YML);
  });

  it('rejects future schema_version without backup or rewrite', async () => {
    const { loader, fs } = createLoader();
    const future = V1_STATE_YML.replace(
      'schema_version: 1',
      'schema_version: 99',
    );
    await fs.writeFile('/state.yml', future);

    const result = await loader.load('/state.yml');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('SCHEMA_VALIDATION');
      expect(result.error.message).toContain('99');
      expect(result.error.message).toContain(String(CURRENT_SCHEMA_VERSION));
    }
    expect(await fs.exists('/state.yml.bak')).toBe(false);
    expect(await fs.readFile('/state.yml')).toBe(future);
  });

  it('returns NotInitializedError when the file is missing', async () => {
    const { loader } = createLoader();

    const result = await loader.load('/missing.yml');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_INITIALIZED');
    }
  });
});
