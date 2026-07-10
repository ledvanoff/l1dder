import { describe, expect, it, vi } from 'vitest';

import {
  InMemoryFileSystem,
  FixedClock,
  NullLogger,
} from '@l1dder/core/testing';
import { stringifyYaml } from '@l1dder/yaml';
import { createTestState } from '@l1dder/state/testing';

import { checkCrashRecovery } from './crash-recovery.js';
import type { CliContext } from '../context.js';
import { ScriptedAdapter } from '../prompt/scripted-adapter.js';
import { createColorPalette } from '../output/colors.js';
import { createFormatter } from '../output/formatter.js';
import { parseGlobals } from '../globals.js';
import { buildContext } from '../context.js';
const NOW = '2026-01-15T10:00:00Z';

async function createCtxWithState(
  stateOverrides: Record<string, unknown>,
  globalOverrides?: Record<string, unknown>,
): Promise<CliContext> {
  const fs = new InMemoryFileSystem();
  const clock = new FixedClock(NOW);
  const logger = new NullLogger();
  const prompt = new ScriptedAdapter({ 'Resume': true });
  const colors = createColorPalette(false);
  const output = createFormatter('human', colors);
  const globals = parseGlobals({ ...globalOverrides });

  const state = createTestState(stateOverrides);
  const config = {};
  const projectDir = globals.cwd;

  await fs.mkdir(`${projectDir}/.l1dder`);
  await fs.writeFile(`${projectDir}/.l1dder/state.yml`, stringifyYaml(state));
  await fs.writeFile(`${projectDir}/.l1dder/config.yml`, stringifyYaml(config));

  return buildContext(globals, {
    fs, clock, logger, prompt, output, colors,
  });
}

describe('checkCrashRecovery', () => {
  it('does nothing when no in-flight marker', async () => {
    const ctx = await createCtxWithState({});
    await expect(checkCrashRecovery(ctx)).resolves.toBeUndefined();
  });

  it('does nothing when state is not initialized', async () => {
    const fs = new InMemoryFileSystem();
    const clock = new FixedClock(NOW);
    const logger = new NullLogger();
    const prompt = new ScriptedAdapter({});
    const colors = createColorPalette(false);
    const output = createFormatter('human', colors);
    const globals = parseGlobals({});

    const ctx = buildContext(globals, {
      fs, clock, logger, prompt, output, colors,
    });

    await expect(checkCrashRecovery(ctx)).resolves.toBeUndefined();
  });

  it('warns in json mode without prompting', async () => {
    const ctx = await createCtxWithState(
      {
        _in_flight_transition: {
          from: 'idle',
          to: 'specify',
          started_at: NOW,
          actor: { kind: 'human', id: 'test' },
          trigger: { kind: 'cli', command: 'transition' },
        },
      },
      { json: true },
    );

    const warnSpy = vi.spyOn(ctx.logger, 'warn');
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await checkCrashRecovery(ctx);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('In-flight transition detected'),
    );
  });
});
