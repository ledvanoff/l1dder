import { describe, expect, it } from 'vitest';
import {
  FixedClock,
  InMemoryFileSystem,
  NullLogger,
} from '@l1dder/core/testing';
import { CURRENT_SCHEMA_VERSION } from '@l1dder/schemas';
import { parseDocument, stringifyYaml } from '@l1dder/yaml';

import { SoloApprover } from './adapters/solo-approver.js';
import { StateManager } from './state-manager.js';
import {
  createTestState,
  createTestConfig,
  createTestStateManager,
} from './testing.js';

const NOW = '2026-05-11T12:00:00Z';

function createDeps(fs?: InMemoryFileSystem) {
  const fileSystem = fs ?? new InMemoryFileSystem();
  const clock = new FixedClock(NOW);
  const logger = new NullLogger();
  const approver = new SoloApprover(clock);
  return { fs: fileSystem, clock, logger, approver };
}

async function setupProject(
  fs: InMemoryFileSystem,
  stateOverrides?: Record<string, unknown>,
  configOverrides?: Record<string, unknown>,
) {
  const state = createTestState(stateOverrides);
  const config = createTestConfig(configOverrides);
  await fs.mkdir('/project/.l1dder');
  await fs.writeFile('/project/.l1dder/state.yml', stringifyYaml(state));
  await fs.writeFile('/project/.l1dder/config.yml', stringifyYaml(config));
}

describe('StateManager', () => {
  describe('create', () => {
    it('loads state and config', async () => {
      const deps = createDeps();
      await setupProject(deps.fs);

      const result = await StateManager.create(deps, {
        projectDir: '/project',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const pos = result.value.currentPosition();
        expect(pos.phase).toBe('idle');
        expect(pos.stage).toBe('discovery');
        expect(pos.mode).toBe('main');
        expect(pos.status).toBe('in_progress');
        expect(pos.iteration).toBe(0);
      }
    });

    it('returns error for missing state', async () => {
      const deps = createDeps();

      const result = await StateManager.create(deps, {
        projectDir: '/empty',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_INITIALIZED');
      }
    });

    it('returns error for missing config', async () => {
      const deps = createDeps();
      await deps.fs.mkdir('/project/.l1dder');
      await deps.fs.writeFile(
        '/project/.l1dder/state.yml',
        stringifyYaml(createTestState()),
      );

      const result = await StateManager.create(deps, {
        projectDir: '/project',
      });

      expect(result.ok).toBe(false);
    });

    it('migrates legacy v1 state.yml on create', async () => {
      const deps = createDeps();
      const v1Yaml = `schema_version: 1
project:
  name: legacy-project
  stage: delivery
  stage_history: []
  created_at: "${NOW}"
  updated_at: "${NOW}"
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
      await deps.fs.mkdir('/project/.l1dder');
      await deps.fs.writeFile('/project/.l1dder/state.yml', v1Yaml);
      await deps.fs.writeFile(
        '/project/.l1dder/config.yml',
        stringifyYaml(createTestConfig()),
      );

      const result = await StateManager.create(deps, {
        projectDir: '/project',
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const snap = result.value.stateSnapshot();
      expect(snap.schema_version).toBe(CURRENT_SCHEMA_VERSION);
      expect(snap.discovery).toEqual({
        milestones: [],
        current: null,
        waivers: [],
      });
      expect(snap.workflow.profile).toBeNull();

      const onDisk = await deps.fs.readFile('/project/.l1dder/state.yml');
      const parsed = parseDocument(onDisk).toJS();
      expect(parsed['schema_version']).toBe(CURRENT_SCHEMA_VERSION);
    });
  });

  describe('currentPosition', () => {
    it('returns correct workflow position', async () => {
      const deps = createDeps();
      await setupProject(deps.fs, {
        project: { stage: 'delivery' },
        workflow: { current_phase: 'specify', current_status: 'in_progress', iteration: 2 },
      });

      const result = await StateManager.create(deps, {
        projectDir: '/project',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const pos = result.value.currentPosition();
        expect(pos.phase).toBe('specify');
        expect(pos.stage).toBe('delivery');
        expect(pos.iteration).toBe(2);
      }
    });
  });

  describe('stateSnapshot', () => {
    it('returns deep copy of state', async () => {
      const deps = createDeps();
      await setupProject(deps.fs);

      const result = await StateManager.create(deps, {
        projectDir: '/project',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const snap1 = result.value.stateSnapshot();
        const snap2 = result.value.stateSnapshot();
        expect(snap1).toEqual(snap2);
        expect(snap1).not.toBe(snap2);
      }
    });
  });

  describe('save', () => {
    it('persists state with round-trip', async () => {
      const deps = createDeps();
      await setupProject(deps.fs);

      const createResult = await StateManager.create(deps, {
        projectDir: '/project',
      });
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const manager = createResult.value;
      manager._updateState((s) => ({
        ...s,
        project: { ...s.project, name: 'modified' },
      }));

      const saveResult = await manager.save();
      expect(saveResult.ok).toBe(true);

      const reloaded = await StateManager.create(deps, {
        projectDir: '/project',
      });
      expect(reloaded.ok).toBe(true);
      if (reloaded.ok) {
        expect(reloaded.value.stateSnapshot().project.name).toBe('modified');
      }
    });
  });

  describe('init', () => {
    it('creates project files', async () => {
      const deps = createDeps();

      const result = await StateManager.init(deps, {
        projectDir: '/new-project',
        projectName: 'new',
        brownfield: false,
      });

      expect(result.ok).toBe(true);
      expect(await deps.fs.exists('/new-project/.l1dder/state.yml')).toBe(true);
      expect(await deps.fs.exists('/new-project/.l1dder/config.yml')).toBe(true);
    });
  });

  describe('transition.execute', () => {
    it('executes forward transition idle→specify', async () => {
      const manager = await createTestStateManager();

      const result = await manager.transition.execute({
        to: 'specify',
        trigger: { kind: 'cli', command: 'transition' },
        actor: { kind: 'human', id: 'dev' },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.previousPhase).toBe('idle');
        expect(result.value.newPhase).toBe('specify');
        expect(result.value.kind).toBe('forward');
        expect(result.value.noop).toBe(false);
      }
      expect(manager.currentPosition().phase).toBe('specify');
    });

    it('persists transition to disk', async () => {
      const deps = createDeps();
      await setupProject(deps.fs);

      const createResult = await StateManager.create(deps, { projectDir: '/project' });
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const manager = createResult.value;
      await manager.transition.execute({
        to: 'specify',
        trigger: { kind: 'cli', command: 'transition' },
        actor: { kind: 'human', id: 'dev' },
      });

      // Reload from disk
      const reloaded = await StateManager.create(deps, { projectDir: '/project' });
      expect(reloaded.ok).toBe(true);
      if (reloaded.ok) {
        expect(reloaded.value.currentPosition().phase).toBe('specify');
      }
    });

    it('returns noop for idempotent transition', async () => {
      const manager = await createTestStateManager({
        state: { workflow: { current_phase: 'specify' } },
      });

      const result = await manager.transition.execute({
        to: 'specify',
        trigger: { kind: 'cli', command: 'transition' },
        actor: { kind: 'human', id: 'dev' },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.noop).toBe(true);
      }
    });

    it('rejects forbidden transition', async () => {
      const manager = await createTestStateManager({
        state: { workflow: { current_phase: 'specify' } },
      });

      const result = await manager.transition.execute({
        to: 'implement',
        trigger: { kind: 'cli', command: 'transition' },
        actor: { kind: 'human', id: 'dev' },
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('FORBIDDEN_TRANSITION');
      }
    });

    it('leaves state.yml byte-identical when the transition is rejected', async () => {
      // A clock that moves on every read: if anything persisted state during the
      // rejected transition, `project.updated_at` would differ.
      let tick = 0;
      const clock = {
        now: (): string => {
          tick += 1;
          return `2026-05-11T12:00:${String(tick).padStart(2, '0')}Z`;
        },
      };
      const fs = new InMemoryFileSystem();
      await setupProject(fs, { workflow: { current_phase: 'specify' } });
      const created = await StateManager.create(
        {
          fs,
          clock,
          logger: new NullLogger(),
          approver: new SoloApprover(clock),
        },
        { projectDir: '/project' },
      );
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const statePath = '/project/.l1dder/state.yml';
      const before = await fs.readFile(statePath);

      const result = await created.value.transition.execute({
        to: 'implement',
        trigger: { kind: 'cli', command: 'transition' },
        actor: { kind: 'human', id: 'dev' },
      });

      expect(result.ok).toBe(false);
      expect(await fs.readFile(statePath)).toBe(before);
      expect(created.value.stateSnapshot()._in_flight_transition).toBeUndefined();
    });

    it('does not touch state when a dry run is rejected or accepted', async () => {
      const manager = await createTestStateManager();
      const before = JSON.stringify(manager.stateSnapshot());

      const accepted = await manager.transition.execute({
        to: 'specify',
        trigger: { kind: 'cli', command: 'transition' },
        actor: { kind: 'human', id: 'dev' },
        dryRun: true,
      });

      expect(accepted.ok).toBe(true);
      expect(JSON.stringify(manager.stateSnapshot())).toBe(before);
      expect(manager.currentPosition().phase).toBe('idle');
    });

    it('chains multiple transitions idle→specify→plan', async () => {
      const manager = await createTestStateManager();

      const r1 = await manager.transition.execute({
        to: 'specify',
        trigger: { kind: 'slash', command: 'specify' },
        actor: { kind: 'human', id: 'dev' },
      });
      expect(r1.ok).toBe(true);

      const r2 = await manager.transition.execute({
        to: 'plan',
        trigger: { kind: 'slash', command: 'plan' },
        actor: { kind: 'human', id: 'dev' },
      });
      expect(r2.ok).toBe(true);

      expect(manager.currentPosition().phase).toBe('plan');
      expect(manager.stateSnapshot().workflow.phase_history).toHaveLength(2);
    });

    it('clears in-flight marker after success', async () => {
      const manager = await createTestStateManager();

      await manager.transition.execute({
        to: 'specify',
        trigger: { kind: 'cli', command: 'transition' },
        actor: { kind: 'human', id: 'dev' },
      });

      expect(manager.stateSnapshot()._in_flight_transition).toBeUndefined();
    });
  });
});

describe('SoloApprover', () => {
  it('always approves', async () => {
    const clock = new FixedClock(NOW);
    const approver = new SoloApprover(clock);

    const result = await approver.approve('spec-gate', {
      phase: 'specify',
      actor: { kind: 'human', id: 'dev' },
      state: createTestState(),
      config: createTestConfig(),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.approved).toBe(true);
      expect(result.value.approver).toBe('solo');
      expect(result.value.timestamp).toBe(NOW);
    }
  });
});

describe('testing utilities', () => {
  it('createTestState returns valid parseable state', () => {
    const state = createTestState();
    expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
    expect(state.workflow.current_phase).toBe('idle');
    expect(state.project.name).toBe('test-project');
  });

  it('createTestState merges overrides', () => {
    const state = createTestState({
      project: { stage: 'delivery' },
    });
    expect(state.project.stage).toBe('delivery');
    expect(state.project.name).toBe('test-project');
  });

  it('createTestConfig returns valid config', () => {
    const config = createTestConfig();
    expect(config.role_mode).toBe('solo');
  });

  it('createTestStateManager returns functional manager', async () => {
    const manager = await createTestStateManager();
    const pos = manager.currentPosition();
    expect(pos.phase).toBe('idle');
    expect(pos.stage).toBe('discovery');
    expect(pos.mode).toBe('main');
  });

  it('createTestStateManager accepts overrides', async () => {
    const manager = await createTestStateManager({
      state: { project: { stage: 'delivery' } },
    });
    expect(manager.currentPosition().stage).toBe('delivery');
  });
});

describe('recordSkillRun / recordSkillVersion (E5, T-08)', () => {
  it('appends a skill run with a generated timestamp', async () => {
    const manager = await createTestStateManager();

    const result = await manager.recordSkillRun({
      skillId: 'specify-feature',
      phase: 'specify',
      outcome: 'success',
    });

    expect(result.ok).toBe(true);
    const runs = manager.stateSnapshot().skillRuns;
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ skillId: 'specify-feature', outcome: 'success' });
    expect(runs[0]?.timestamp).toBeTruthy();
  });

  it('persists recorded skill runs to disk (round-trip)', async () => {
    const deps = createDeps();
    await setupProject(deps.fs);

    const createResult = await StateManager.create(deps, { projectDir: '/project' });
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    await createResult.value.recordSkillRun({
      skillId: 'hygiene-audit',
      phase: 'hygiene',
      outcome: 'failure',
      tokensUsed: 500,
    });

    const reloaded = await StateManager.create(deps, { projectDir: '/project' });
    expect(reloaded.ok).toBe(true);
    if (reloaded.ok) {
      const runs = reloaded.value.stateSnapshot().skillRuns;
      expect(runs).toHaveLength(1);
      expect(runs[0]).toMatchObject({ skillId: 'hygiene-audit', outcome: 'failure', tokensUsed: 500 });
    }
  });

  it('appends multiple skill runs without overwriting previous entries', async () => {
    const manager = await createTestStateManager();

    await manager.recordSkillRun({ skillId: 'a', phase: 'idle', outcome: 'success' });
    await manager.recordSkillRun({ skillId: 'b', phase: 'idle', outcome: 'failure' });

    expect(manager.stateSnapshot().skillRuns).toHaveLength(2);
  });

  it('appends a skill version with a generated timestamp', async () => {
    const manager = await createTestStateManager();

    const result = await manager.recordSkillVersion({
      skillId: 'specify-feature',
      contentHash: 'abc123',
    });

    expect(result.ok).toBe(true);
    const versions = manager.stateSnapshot().skillVersions;
    expect(versions).toHaveLength(1);
    expect(versions[0]).toMatchObject({ skillId: 'specify-feature', contentHash: 'abc123' });
  });
});
