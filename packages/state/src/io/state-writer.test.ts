import { describe, expect, it, vi } from 'vitest';
import { InMemoryFileSystem, NullLogger } from '@l1dder/core/testing';
import type { State, Config } from '@l1dder/schemas';
import { L1dderDocument } from '@l1dder/yaml';

import { AtomicWriter } from './atomic-writer.js';
import { StateWriter } from './state-writer.js';

function createWriter(fs?: InMemoryFileSystem) {
  const fileSystem = fs ?? new InMemoryFileSystem();
  const logger = new NullLogger();
  const atomicWriter = new AtomicWriter({ fs: fileSystem, logger });
  const writer = new StateWriter({ atomicWriter, logger });
  return { writer, fs: fileSystem, atomicWriter };
}

const VALID_STATE: State = {
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
    profile: null,
    session: null,
    session_history: [],
    iteration: 0,
    phase_history: [],
    gate_history: [],
  },
  tasks: { items: [] },
  quick_tasks: [],
  knowledge_updates: [],
  decisions: [],
  discovery: { milestones: [], current: null, waivers: [] },
  skillRuns: [],
  skillVersions: [],
};

const VALID_CONFIG: Config = {
  schema_version: 1,
  role_mode: 'solo',
  adapters: [],
  language: { docs: 'en', chat: 'en' },
  gates: {
    default: { enabled: true, skip_allowed: false, min_approvers: 1, custom_gates: [] },
    overrides: {},
  },
  stage: {
    enforcement: { restrict_phases: 'advisory' },
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
  hooks: { enabled: true, profile: 'standard', disabled: [], session_start_max_chars: 8000 },
  hygiene: { drift_threshold: 3, maintenance_cadence_days: 30 },
};

describe('StateWriter', () => {
  it('writes state with round-trip comment preservation', async () => {
    const { writer, fs } = createWriter();
    const yamlWithComments = `# State file
schema_version: 1
project:
  name: original
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
    const doc = L1dderDocument.fromString(yamlWithComments);
    const modifiedState: State = { ...VALID_STATE, project: { ...VALID_STATE.project, name: 'updated' } };

    const result = await writer.writeState('/state.yml', modifiedState, doc);

    expect(result.ok).toBe(true);
    const content = await fs.readFile('/state.yml');
    expect(content).toContain('# State file');
    expect(content).toContain('updated');
  });

  it('writes state without document (fresh stringify)', async () => {
    const { writer, fs } = createWriter();

    const result = await writer.writeState('/state.yml', VALID_STATE);

    expect(result.ok).toBe(true);
    const content = await fs.readFile('/state.yml');
    expect(content).toContain('schema_version: 1');
    expect(content).toContain('name: test');
  });

  it('delegates to AtomicWriter for atomicity', async () => {
    const { writer, atomicWriter } = createWriter();
    const writeSpy = vi.spyOn(atomicWriter, 'write');

    await writer.writeState('/state.yml', VALID_STATE);

    expect(writeSpy).toHaveBeenCalledWith('/state.yml', expect.any(String));
  });

  it('deletes keys absent from canonical state so cleared markers survive save→read', async () => {
    const { writer, fs } = createWriter();
    const yamlWithMarker = `# State file
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
decisions: []
skillRuns: []
skillVersions: []
_in_flight_transition:
  from: idle
  to: specify
  started_at: "2026-05-11T00:00:00Z"
  actor:
    kind: system
  trigger:
    kind: cli
    command: transition
`;
    const doc = L1dderDocument.fromString(yamlWithMarker);
    const cleared: State = { ...VALID_STATE };

    const result = await writer.writeState('/state.yml', cleared, doc);

    expect(result.ok).toBe(true);
    const content = await fs.readFile('/state.yml');
    expect(content).toContain('# State file');
    expect(content).not.toContain('_in_flight_transition');

    const reparsed = L1dderDocument.fromString(content).toJS();
    expect(reparsed).not.toHaveProperty('_in_flight_transition');
  });

  it('writes config with round-trip preservation', async () => {
    const { writer, fs } = createWriter();
    const yamlWithComments = `# Config file
schema_version: 1
role_mode: solo
gates:
  default:
    enabled: true
    skip_allowed: false
    min_approvers: 1
    custom_gates: []
  overrides: {}
stage:
  enforcement:
    restrict_phases: advisory
  delivery_criteria:
    require_idea_not_skeleton: true
    require_roadmap: true
    require_architecture_not_skeleton: true
    require_erd_not_skeleton: true
    require_usecases_not_skeleton: true
    min_design_files: 1
    check_skeleton_markers: true
context:
  token_budget: 120000
  reserved_tokens: 30000
  chars_per_token: 3
  overrides: {}
  extra_files: []
presets:
  active: default
  custom: {}
`;
    const doc = L1dderDocument.fromString(yamlWithComments);

    const result = await writer.writeConfig('/config.yml', VALID_CONFIG, doc);

    expect(result.ok).toBe(true);
    const content = await fs.readFile('/config.yml');
    expect(content).toContain('# Config file');
  });
});
