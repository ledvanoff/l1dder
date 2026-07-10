import { describe, expect, it } from 'vitest';
import { InMemoryFileSystem, NullLogger } from '@l1dder/core/testing';
import { stringifyYaml } from '@l1dder/yaml';

import { StateReader } from './state-reader.js';

function createReader(fs?: InMemoryFileSystem) {
  const fileSystem = fs ?? new InMemoryFileSystem();
  const reader = new StateReader({ fs: fileSystem, logger: new NullLogger() });
  return { reader, fs: fileSystem };
}

const VALID_STATE = {
  schema_version: 1,
  project: {
    name: 'test',
    stage: 'discovery',
    stage_history: [],
    created_at: '2026-05-11T00:00:00Z',
    updated_at: '2026-05-11T00:00:00Z',
  },
  workflow: {
    current_phase: 'idle',
    current_status: 'in_progress',
    mode: 'main',
    iteration: 0,
    phase_history: [],
    gate_history: [],
  },
  tasks: { items: [] },
  quick_tasks: [],
  knowledge_updates: [],
};

const VALID_CONFIG = {
  schema_version: 1,
  role_mode: 'solo',
  gates: {
    default: { enabled: true, skip_allowed: false, min_approvers: 1, custom_gates: [] },
    overrides: {},
  },
  stage: {
    enforcement: { restrict_phases: 'advisory', require_criteria: 'advisory' },
    delivery_criteria: {
      require_idea_not_skeleton: true,
      require_roadmap: true,
      require_architecture_not_skeleton: true,
      require_erd_not_skeleton: true,
      require_usecases_not_skeleton: true,
      min_design_files: 1,
      check_skeleton_markers: true,
    },
  },
  context: {
    token_budget: 120_000,
    reserved_tokens: 30_000,
    chars_per_token: 3.0,
    overrides: {},
    extra_files: [],
  },
  presets: { active: 'default', custom: {} },
};

describe('StateReader', () => {
  describe('readState', () => {
    it('reads and validates valid state.yml', async () => {
      const { reader, fs } = createReader();
      await fs.writeFile('/state.yml', stringifyYaml(VALID_STATE));

      const result = await reader.readState('/state.yml');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.state.project.name).toBe('test');
        expect(result.value.state.workflow.current_phase).toBe('idle');
        expect(result.value.document).toBeDefined();
      }
    });

    it('returns SchemaValidationError for invalid state', async () => {
      const { reader, fs } = createReader();
      await fs.writeFile(
        '/state.yml',
        stringifyYaml({ ...VALID_STATE, workflow: { ...VALID_STATE.workflow, current_phase: 'invalid_phase' } }),
      );

      const result = await reader.readState('/state.yml');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_VALIDATION');
      }
    });

    it('returns NotInitializedError for missing file', async () => {
      const { reader } = createReader();

      const result = await reader.readState('/nonexistent.yml');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_INITIALIZED');
      }
    });

    it('preserves L1dderDocument for round-trip', async () => {
      const { reader, fs } = createReader();
      const yamlWithComments = `# Project state
schema_version: 1
project:
  name: test
  stage: discovery
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
      await fs.writeFile('/state.yml', yamlWithComments);

      const result = await reader.readState('/state.yml');

      expect(result.ok).toBe(true);
      if (result.ok) {
        const roundTripped = result.value.document.toString();
        expect(roundTripped).toContain('# Project state');
      }
    });
  });

  describe('readConfig', () => {
    it('reads and validates valid config.yml', async () => {
      const { reader, fs } = createReader();
      await fs.writeFile('/config.yml', stringifyYaml(VALID_CONFIG));

      const result = await reader.readConfig('/config.yml');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.config.role_mode).toBe('solo');
        expect(result.value.document).toBeDefined();
      }
    });

    it('returns NotInitializedError for missing config', async () => {
      const { reader } = createReader();

      const result = await reader.readConfig('/missing.yml');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_INITIALIZED');
      }
    });
  });

  describe('exists', () => {
    it('returns true when file exists', async () => {
      const { reader, fs } = createReader();
      await fs.writeFile('/state.yml', 'data: 1');

      expect(await reader.exists('/state.yml')).toBe(true);
    });

    it('returns false when file does not exist', async () => {
      const { reader } = createReader();

      expect(await reader.exists('/nope.yml')).toBe(false);
    });
  });
});
