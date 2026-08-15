import { describe, expect, it } from 'vitest';
import { DISCOVERY_MILESTONE_ORDER } from '@l1dder/core';
import {
  FixedClock,
  InMemoryFileSystem,
  NullLogger,
} from '@l1dder/core/testing';
import {
  CURRENT_SCHEMA_VERSION,
  StateSchema,
  ConfigSchema,
} from '@l1dder/schemas';
import { parseYaml } from '@l1dder/yaml';

import { AtomicWriter } from './atomic-writer.js';
import { StateWriter } from './state-writer.js';
import { StateInitializer } from './state-initializer.js';

const NOW = '2026-05-11T12:00:00Z';

function createInitializer(fs?: InMemoryFileSystem) {
  const fileSystem = fs ?? new InMemoryFileSystem();
  const logger = new NullLogger();
  const clock = new FixedClock(NOW);
  const atomicWriter = new AtomicWriter({ fs: fileSystem, logger });
  const stateWriter = new StateWriter({ atomicWriter, logger });
  const initializer = new StateInitializer({
    stateWriter,
    clock,
    logger,
    fs: fileSystem,
  });
  return { initializer, fs: fileSystem };
}

describe('StateInitializer', () => {
  it('initializes greenfield project with discovery stage', async () => {
    const { initializer, fs } = createInitializer();

    const result = await initializer.initialize({
      projectDir: '/project',
      projectName: 'test',
      brownfield: false,
    });

    expect(result.ok).toBe(true);
    const raw = await fs.readFile('/project/.l1dder/state.yml');
    const parsed = parseYaml(raw, StateSchema);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.project.stage).toBe('discovery');
      expect(parsed.value.workflow.current_phase).toBe('idle');
      expect(parsed.value.schema_version).toBe(CURRENT_SCHEMA_VERSION);
      expect(parsed.value.project.name).toBe('test');
      expect(parsed.value.project.stage_history).toHaveLength(0);
      expect(parsed.value.discovery.current).toBe('idea');
      expect(parsed.value.discovery.milestones.map((m) => m.id)).toEqual([
        ...DISCOVERY_MILESTONE_ORDER,
      ]);
      expect(
        parsed.value.discovery.milestones.every((m) => m.status === 'pending'),
      ).toBe(true);
    }
  });

  it('written state contains 7 initialized milestones with current idea', async () => {
    const { initializer, fs } = createInitializer();

    await initializer.initialize({
      projectDir: '/project',
      projectName: 'milestones',
      brownfield: false,
    });

    const raw = await fs.readFile('/project/.l1dder/state.yml');
    const parsed = parseYaml(raw, StateSchema);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.discovery.milestones).toHaveLength(7);
    expect(parsed.value.discovery.current).toBe('idea');
    expect(parsed.value.discovery.milestones.map((m) => m.id)).toEqual([
      ...DISCOVERY_MILESTONE_ORDER,
    ]);
  });

  it('initializes brownfield project with delivery stage', async () => {
    const { initializer, fs } = createInitializer();

    const result = await initializer.initialize({
      projectDir: '/project',
      projectName: 'existing',
      brownfield: true,
    });

    expect(result.ok).toBe(true);
    const raw = await fs.readFile('/project/.l1dder/state.yml');
    const parsed = parseYaml(raw, StateSchema);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.project.stage).toBe('delivery');
      expect(parsed.value.workflow.current_phase).toBe('idle');
      expect(parsed.value.project.stage_history).toHaveLength(1);
      expect(parsed.value.project.stage_history[0]?.to).toBe('delivery');
    }
  });

  it('creates config.yml with schema defaults', async () => {
    const { initializer, fs } = createInitializer();

    await initializer.initialize({
      projectDir: '/project',
      projectName: 'test',
      brownfield: false,
    });

    const raw = await fs.readFile('/project/.l1dder/config.yml');
    const parsed = parseYaml(raw, ConfigSchema);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.role_mode).toBe('solo');
      expect(parsed.value.gates.default.enabled).toBe(true);
    }
  });

  it('returns error when already initialized', async () => {
    const { initializer, fs } = createInitializer();
    await fs.mkdir('/project/.l1dder');
    await fs.writeFile('/project/.l1dder/state.yml', 'existing');

    const result = await initializer.initialize({
      projectDir: '/project',
      projectName: 'test',
      brownfield: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('already initialized');
    }
  });

  it('creates .l1dder directory if missing', async () => {
    const { initializer, fs } = createInitializer();

    await initializer.initialize({
      projectDir: '/project',
      projectName: 'test',
      brownfield: false,
    });

    expect(await fs.exists('/project/.l1dder')).toBe(true);
    expect(await fs.exists('/project/.l1dder/state.yml')).toBe(true);
    expect(await fs.exists('/project/.l1dder/config.yml')).toBe(true);
  });

  describe('isInitialized', () => {
    it('returns true when state.yml exists', async () => {
      const { initializer, fs } = createInitializer();
      await fs.mkdir('/project/.l1dder');
      await fs.writeFile('/project/.l1dder/state.yml', 'data');

      expect(await initializer.isInitialized('/project')).toBe(true);
    });

    it('returns false when state.yml does not exist', async () => {
      const { initializer } = createInitializer();

      expect(await initializer.isInitialized('/project')).toBe(false);
    });
  });
});
