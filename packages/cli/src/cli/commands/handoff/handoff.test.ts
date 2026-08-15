import { describe, it, expect } from 'vitest';
import { InMemoryFileSystem, FixedClock, NullLogger } from '@l1dder/core/testing';
import { validateHandoff } from '@l1dder/context';

import { executeHandoff } from './handoff.js';
import { ExitCode } from '../../output/exit-codes.js';
import { createColorPalette } from '../../output/colors.js';
import { createFormatter } from '../../output/formatter.js';
import { parseGlobals } from '../../globals.js';
import { buildContext } from '../../context.js';
import { NonInteractiveAdapter } from '../../prompt/non-interactive-adapter.js';
import type { CliContext } from '../../context.js';

const NOW = '2026-08-10T19:00:00Z';
const CWD = '/test-project';

const STATE_YML = `schema_version: 4
project:
  name: "handoff-cli-test"
  stage: delivery
  stage_history: []
  created_at: "${NOW}"
  updated_at: "${NOW}"
workflow:
  current_phase: implement
  current_status: in_progress
  mode: main
  profile: delivery
  session: null
  session_history: []
  iteration: 1
  phase_history: []
  gate_history: []
discovery:
  milestones: []
  current: null
  waivers: []
tasks:
  items: []
quick_tasks: []
knowledge_updates: []
decisions: []
`;

const CONFIG_YML = `schema_version: 1
role_mode: solo
`;

async function createTestCtx(opts?: {
  noPrompt?: boolean;
}): Promise<CliContext & { fs: InMemoryFileSystem }> {
  const fs = new InMemoryFileSystem();
  const clock = new FixedClock(NOW);
  const logger = new NullLogger();
  const prompt = new NonInteractiveAdapter();
  const colors = createColorPalette(false);
  const output = createFormatter('human', colors);
  const globals = parseGlobals({
    cwd: CWD,
    ...(opts?.noPrompt === true ? { noPrompt: true } : {}),
  });

  await fs.mkdir(`${CWD}/.l1dder`);
  await fs.writeFile(`${CWD}/.l1dder/state.yml`, STATE_YML);
  await fs.writeFile(`${CWD}/.l1dder/config.yml`, CONFIG_YML);

  const ctx = buildContext(globals, { fs, clock, logger, prompt, output, colors });
  return Object.assign(ctx, { fs });
}

describe('l1dder handoff', () => {
  it('writes a valid handoff.md when none exists', async () => {
    const ctx = await createTestCtx();
    const result = await executeHandoff(ctx, {});

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toMatchObject({
      action: 'handoff',
      path: '.l1dder/handoff.md',
      overwritten: false,
    });
    expect(result.humanText).toContain('.l1dder/handoff.md');
    expect(result.humanText).toContain('open a new chat');

    const content = await ctx.fs.readFile(`${CWD}/.l1dder/handoff.md`);
    expect(validateHandoff(content).valid).toBe(true);
  });

  it('refuses to overwrite without --force in non-interactive mode', async () => {
    const ctx = await createTestCtx({ noPrompt: true });
    await ctx.fs.writeFile(
      `${CWD}/.l1dder/handoff.md`,
      '## Session Context\n\n## Current State\n\n## Next Steps\n',
    );

    const result = await executeHandoff(ctx, {});
    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
    expect(result.error?.code).toBe('HANDOFF_EXISTS');
    expect(result.error?.hint).toContain('--force');
  });

  it('--force overwrites an existing handoff', async () => {
    const ctx = await createTestCtx({ noPrompt: true });
    await ctx.fs.writeFile(`${CWD}/.l1dder/handoff.md`, 'stale');

    const result = await executeHandoff(ctx, { force: true });
    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toMatchObject({ overwritten: true });

    const content = await ctx.fs.readFile(`${CWD}/.l1dder/handoff.md`);
    expect(content).not.toBe('stale');
    expect(validateHandoff(content).valid).toBe(true);
  });
});
