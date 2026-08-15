import { describe, expect, it } from 'vitest';
import {
  FixedClock,
  InMemoryFileSystem,
  NullLogger,
} from '@l1dder/core/testing';
import { stringifyYaml } from '@l1dder/yaml';
import { StateSchema } from '@l1dder/schemas';

import { SoloApprover } from '../../adapters/solo-approver.js';
import { StateManager } from '../../state-manager.js';
import { createTestConfig, createTestState } from '../../testing.js';

const NOW = '2026-05-11T12:00:00Z';

/**
 * HARD-1 / DF-001/007/008 — recovery clears markers atomically and is idempotent
 * across repeated resolve+save cycles, including fault injection around rename.
 */
describe('recovery idempotency integration (HARD-1)', () => {
  async function setupWithMarker(): Promise<{
    fs: InMemoryFileSystem;
    manager: StateManager;
  }> {
    const fs = new InMemoryFileSystem();
    const logger = new NullLogger();
    const clock = new FixedClock(NOW);
    const state = createTestState({
      _in_flight_transition: {
        from: 'idle',
        to: 'specify',
        started_at: '2026-05-11T11:00:00Z',
        actor: { kind: 'human', id: 'dev' },
        trigger: { kind: 'cli', command: 'transition' },
      },
    });

    await fs.mkdir('/project/.l1dder');
    await fs.writeFile('/project/.l1dder/state.yml', stringifyYaml(state));
    await fs.writeFile(
      '/project/.l1dder/config.yml',
      stringifyYaml(createTestConfig()),
    );

    const result = await StateManager.create(
      { fs, clock, logger, approver: new SoloApprover(clock) },
      { projectDir: '/project' },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('setup failed');
    return { fs, manager: result.value };
  }

  it('recovery clears marker on disk and second recovery is a no-op', async () => {
    const { fs, manager } = await setupWithMarker();
    const clock = new FixedClock(NOW);

    const first = manager.recovery.resolve(
      manager.stateSnapshot(),
      'resume',
      clock,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const save1 = await manager.applyAndSave(() => first.value);
    expect(save1.ok).toBe(true);

    const onDisk1 = await fs.readFile('/project/.l1dder/state.yml');
    expect(onDisk1).not.toContain('_in_flight_transition');
    const parsed1 = StateSchema.parse(
      (await import('@l1dder/yaml')).parseDocument(onDisk1).toJS(),
    );
    expect(parsed1._in_flight_transition).toBeUndefined();
    expect(parsed1.workflow.phase_history.filter((e) => e.trigger.kind === 'recovery')).toHaveLength(1);

    // Reload and attempt recovery again — no marker ⇒ detect is null / no-op path.
    const reloaded = await StateManager.create(
      {
        fs,
        clock,
        logger: new NullLogger(),
        approver: new SoloApprover(clock),
      },
      { projectDir: '/project' },
    );
    expect(reloaded.ok).toBe(true);
    if (!reloaded.ok) return;

    expect(reloaded.value.recovery.detect(reloaded.value.stateSnapshot())).toBeNull();
    expect(
      reloaded.value.stateSnapshot().workflow.phase_history.filter(
        (e) => e.trigger.kind === 'recovery',
      ),
    ).toHaveLength(1);
  });

  it('converges when rename fails before commit then succeeds on retry', async () => {
    const fs = new InMemoryFileSystem();
    const logger = new NullLogger();
    const clock = new FixedClock(NOW);
    const state = createTestState({
      _in_flight_transition: {
        from: 'idle',
        to: 'specify',
        started_at: '2026-05-11T11:00:00Z',
        actor: { kind: 'human', id: 'dev' },
        trigger: { kind: 'cli', command: 'transition' },
      },
    });

    await fs.mkdir('/project/.l1dder');
    await fs.writeFile('/project/.l1dder/state.yml', stringifyYaml(state));
    await fs.writeFile(
      '/project/.l1dder/config.yml',
      stringifyYaml(createTestConfig()),
    );

    const createResult = await StateManager.create(
      { fs, clock, logger, approver: new SoloApprover(clock) },
      { projectDir: '/project' },
    );
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;
    const manager = createResult.value;

    const originalRename = fs.rename.bind(fs);
    let renameCalls = 0;
    fs.rename = async (from: string, to: string) => {
      renameCalls += 1;
      if (renameCalls === 1) {
        throw new Error('simulated crash before final rename');
      }
      return originalRename(from, to);
    };

    const resolved = manager.recovery.resolve(
      manager.stateSnapshot(),
      'resume',
      clock,
    );
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    const failedSave = await manager.applyAndSave(() => resolved.value);
    expect(failedSave.ok).toBe(false);

    // Disk still has the original marker (rename never committed).
    const afterFail = await fs.readFile('/project/.l1dder/state.yml');
    expect(afterFail).toContain('_in_flight_transition');

    // Next start: recovery again — succeeds without ENOENT / duplicate history.
    fs.rename = originalRename;
    const retryMgr = await StateManager.create(
      { fs, clock, logger, approver: new SoloApprover(clock) },
      { projectDir: '/project' },
    );
    expect(retryMgr.ok).toBe(true);
    if (!retryMgr.ok) return;

    const retryResolve = retryMgr.value.recovery.resolve(
      retryMgr.value.stateSnapshot(),
      'resume',
      clock,
    );
    expect(retryResolve.ok).toBe(true);
    if (!retryResolve.ok) return;

    const saved = await retryMgr.value.applyAndSave(() => retryResolve.value);
    expect(saved.ok).toBe(true);

    const finalYaml = await fs.readFile('/project/.l1dder/state.yml');
    expect(finalYaml).not.toContain('_in_flight_transition');
    await expect(fs.exists('/project/.l1dder/state.yml.next')).resolves.toBe(false);

    const finalState = StateSchema.parse(
      (await import('@l1dder/yaml')).parseDocument(finalYaml).toJS(),
    );
    expect(
      finalState.workflow.phase_history.filter((e) => e.trigger.kind === 'recovery'),
    ).toHaveLength(1);
  });
});
