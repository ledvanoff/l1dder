import { describe, it, expect } from 'vitest';
import { InMemoryFileSystem, FixedClock, NullLogger } from '@l1dder/core/testing';

import { executeProfile } from './profile.js';
import { ExitCode } from '../../output/exit-codes.js';
import { createColorPalette } from '../../output/colors.js';
import { createFormatter } from '../../output/formatter.js';
import { parseGlobals } from '../../globals.js';
import { buildContext } from '../../context.js';
import { NonInteractiveAdapter } from '../../prompt/non-interactive-adapter.js';
import type { CliContext } from '../../context.js';

const NOW = '2026-08-11T00:00:00Z';
const CWD = '/test-project';

function makeStateYml(profile: string | null = null): string {
  const profileYaml = profile === null ? 'null' : profile;
  return `schema_version: 4
project:
  name: "profile-cli-test"
  stage: discovery
  stage_history: []
  created_at: "${NOW}"
  updated_at: "${NOW}"
workflow:
  current_phase: idle
  current_status: in_progress
  mode: main
  profile: ${profileYaml}
  session: null
  session_history: []
  iteration: 0
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
}

const CONFIG_YML = `schema_version: 1
role_mode: solo
`;

async function createTestCtx(opts?: {
  profile?: string | null;
}): Promise<CliContext & { fs: InMemoryFileSystem }> {
  const fs = new InMemoryFileSystem();
  const clock = new FixedClock(NOW);
  const logger = new NullLogger();
  const prompt = new NonInteractiveAdapter();
  const colors = createColorPalette(false);
  const output = createFormatter('human', colors);
  const globals = parseGlobals({ cwd: CWD });

  await fs.mkdir(`${CWD}/.l1dder`);
  await fs.writeFile(
    `${CWD}/.l1dder/state.yml`,
    makeStateYml(opts?.profile ?? null),
  );
  await fs.writeFile(`${CWD}/.l1dder/config.yml`, CONFIG_YML);

  const ctx = buildContext(globals, { fs, clock, logger, prompt, output, colors });
  return Object.assign(ctx, { fs });
}

describe('l1dder profile', () => {
  it('status reports the recommended profile when none is selected', async () => {
    const ctx = await createTestCtx();
    const result = await executeProfile(ctx, 'status', undefined);

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toMatchObject({
      selected: null,
      recommended: 'product_discovery',
      enforced: false,
    });
    expect(result.humanText).toContain('Recommended: product_discovery');
    expect(result.humanText).toContain('Enforcement: off');
  });

  it('select persists the profile and status shows it afterwards', async () => {
    const ctx = await createTestCtx();

    const selected = await executeProfile(ctx, 'select', 'product_discovery');
    expect(selected.exitCode).toBe(ExitCode.SUCCESS);
    expect(selected.data).toMatchObject({
      selected: 'product_discovery',
      enforced: true,
    });
    expect(selected.humanText).toContain('Profile selected: product_discovery');

    const status = await executeProfile(ctx, 'status', undefined);
    expect(status.exitCode).toBe(ExitCode.SUCCESS);
    expect(status.data).toMatchObject({
      selected: 'product_discovery',
      recommended: 'product_discovery',
      enforced: true,
    });

    const sm = await ctx.state();
    expect(sm.stateSnapshot().workflow.profile).toBe('product_discovery');
  });

  it('returns exit 2 when the profile id is invalid', async () => {
    const ctx = await createTestCtx();
    const result = await executeProfile(ctx, 'select', 'not_a_profile');

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
    expect(result.error?.code).toBe('USAGE_ERROR');
    expect(result.error?.message).toContain('not_a_profile');
    expect(result.error?.hint).toContain('product_discovery');
  });

  it('returns exit 2 when select is called without a profile id', async () => {
    const ctx = await createTestCtx();
    const result = await executeProfile(ctx, 'select', undefined);

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
    expect(result.error?.hint).toContain('l1dder profile select');
  });

  it('clear turns enforcement off', async () => {
    const ctx = await createTestCtx({ profile: 'delivery' });

    const cleared = await executeProfile(ctx, 'clear', undefined);
    expect(cleared.exitCode).toBe(ExitCode.SUCCESS);
    expect(cleared.data).toMatchObject({
      previous: 'delivery',
      selected: null,
      enforced: false,
    });
    expect(cleared.humanText).toContain('Enforcement is now off');

    const status = await executeProfile(ctx, undefined, undefined);
    expect(status.data).toMatchObject({
      selected: null,
      enforced: false,
    });
  });

  it('unknown subcommand exits with USAGE_ERROR', async () => {
    const ctx = await createTestCtx();
    const result = await executeProfile(ctx, 'bogus', undefined);

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
    expect(result.error?.hint).toContain('status');
  });
});
