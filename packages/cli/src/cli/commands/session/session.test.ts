import { describe, it, expect } from 'vitest';
import { InMemoryFileSystem, FixedClock, NullLogger } from '@l1dder/core/testing';

import { executeSession } from './session.js';
import { ExitCode } from '../../output/exit-codes.js';
import { createColorPalette } from '../../output/colors.js';
import { createFormatter } from '../../output/formatter.js';
import { parseGlobals } from '../../globals.js';
import { buildContext } from '../../context.js';
import { NonInteractiveAdapter } from '../../prompt/non-interactive-adapter.js';
import type { CliContext } from '../../context.js';

const NOW = '2026-08-10T19:00:00Z';
const CWD = '/test-project';

function makeStateYml(): string {
  return `schema_version: 4
project:
  name: "session-cli-test"
  stage: delivery
  stage_history: []
  created_at: "${NOW}"
  updated_at: "${NOW}"
workflow:
  current_phase: idle
  current_status: in_progress
  mode: main
  profile: null
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

const REGISTRY_WITH_RAILS = `schema_version: 1
iterations:
  - id: ITER-001
    title: Hardening
    status: in_progress
    depends_on: []
    source_anchor: knowledge/roadmap.md#iter-001
    sessions:
      - id: HARD-5
        title: Task rails
        status: pending
        profile: delivery
        depends_on: []
        features: []
        usecases: []
        source_anchor: knowledge/roadmap.md#hard-5
      - id: HARD-6
        title: Next
        status: pending
        profile: delivery
        depends_on: [HARD-5]
        features: []
        usecases: []
        source_anchor: knowledge/roadmap.md#hard-6
`;

async function createTestCtx(opts?: {
  withRails?: boolean;
}): Promise<CliContext & { fs: InMemoryFileSystem }> {
  const fs = new InMemoryFileSystem();
  const clock = new FixedClock(NOW);
  const logger = new NullLogger();
  const prompt = new NonInteractiveAdapter();
  const colors = createColorPalette(false);
  const output = createFormatter('human', colors);
  const globals = parseGlobals({ cwd: CWD });

  await fs.mkdir(`${CWD}/.l1dder`);
  await fs.mkdir(`${CWD}/knowledge`);
  await fs.writeFile(`${CWD}/.l1dder/state.yml`, makeStateYml());
  await fs.writeFile(`${CWD}/.l1dder/config.yml`, CONFIG_YML);
  if (opts?.withRails) {
    await fs.writeFile(
      `${CWD}/knowledge/project-registry.yml`,
      REGISTRY_WITH_RAILS,
    );
  }

  const ctx = buildContext(globals, { fs, clock, logger, prompt, output, colors });
  return Object.assign(ctx, { fs });
}

describe('l1dder session', () => {
  it('status reports that delivery rails are unknown when registry has no iterations', async () => {
    const ctx = await createTestCtx();
    const result = await executeSession(ctx, 'status', undefined, {});

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.humanText).toContain('Delivery Plan rails are not in the registry yet');
    expect((result.data as { delivery_rails_unknown: boolean }).delivery_rails_unknown).toBe(
      true,
    );
  });

  it('status says rails could not be loaded when project-registry.yml is present but broken', async () => {
    const ctx = await createTestCtx();
    await ctx.fs.writeFile(
      `${CWD}/knowledge/project-registry.yml`,
      'schema_version: [\n  - broken',
    );

    const result = await executeSession(ctx, 'status', undefined, {});
    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.humanText).toContain(
      'Delivery Plan rails could not be loaded from knowledge/project-registry.yml',
    );
    expect(result.humanText).toContain('l1dder registry check');
    expect(result.humanText).not.toContain(
      'Delivery Plan rails are not in the registry yet',
    );
    expect(
      (result.data as { delivery_rails_load: string }).delivery_rails_load,
    ).toBe('manifest_unloadable');
  });

  it('start without --profile fails when rails are unknown', async () => {
    const ctx = await createTestCtx();
    const result = await executeSession(ctx, 'start', 'HARD-5', {});
    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
    expect(result.error?.message).toContain('--profile is required');
    expect(result.error?.message).toContain('not in the registry yet');
  });

  it('start without --profile names unloadable manifest and points at registry check', async () => {
    const ctx = await createTestCtx();
    await ctx.fs.writeFile(
      `${CWD}/knowledge/project-registry.yml`,
      'schema_version: [\n  - broken',
    );

    const result = await executeSession(ctx, 'start', 'HARD-5', {});
    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
    expect(result.error?.message).toContain('could not be loaded');
    expect(result.error?.hint).toContain('l1dder registry check');
  });

  it('start with --profile records null iteration when rails are unknown', async () => {
    const ctx = await createTestCtx();
    const result = await executeSession(ctx, 'start', 'HARD-5', {
      profile: 'delivery',
    });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toMatchObject({
      session: { id: 'HARD-5', iteration: null, profile: 'delivery' },
    });
  });

  it('start on-rail session uses rail profile and shows next eligible in status', async () => {
    const ctx = await createTestCtx({ withRails: true });
    const started = await executeSession(ctx, 'start', 'HARD-5', {});
    expect(started.exitCode).toBe(ExitCode.SUCCESS);
    expect(started.data).toMatchObject({
      session: { id: 'HARD-5', iteration: 'ITER-001', profile: 'delivery' },
    });

    const status = await executeSession(ctx, 'status', undefined, {});
    expect(status.exitCode).toBe(ExitCode.SUCCESS);
    expect(status.data).toMatchObject({
      session: { id: 'HARD-5', force_started: false },
      next_eligible: { session: 'HARD-5', iteration: 'ITER-001' },
      delivery_rails_unknown: false,
    });
  });

  it('rejects off-road start with SESSION_ERROR and leaves state.yml unchanged', async () => {
    const ctx = await createTestCtx({ withRails: true });
    const before = await ctx.fs.readFile(`${CWD}/.l1dder/state.yml`);

    const result = await executeSession(ctx, 'start', 'HARD-9', {});
    expect(result.exitCode).toBe(ExitCode.SESSION_ERROR);
    expect(result.error?.code).toBe('SESSION_OFF_ROAD');
    expect(result.error?.hint).toContain('HARD-5');

    const after = await ctx.fs.readFile(`${CWD}/.l1dder/state.yml`);
    expect(after).toBe(before);
  });

  it('--force without --reason exits FORCE_REASON_REQUIRED', async () => {
    const ctx = await createTestCtx({ withRails: true });
    const result = await executeSession(ctx, 'start', 'HARD-9', {
      force: true,
      profile: 'delivery',
    });
    expect(result.exitCode).toBe(ExitCode.FORCE_REASON_REQUIRED);
    expect(result.error?.code).toBe('SESSION_FORCE_REASON_REQUIRED');
  });

  it('--force --reason records a waiver for an off-road session', async () => {
    const ctx = await createTestCtx({ withRails: true });
    const result = await executeSession(ctx, 'start', 'HARD-9', {
      force: true,
      reason: 'hotfix spike',
      profile: 'hygiene',
    });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toMatchObject({
      session: {
        id: 'HARD-9',
        iteration: null,
        profile: 'hygiene',
        waiver: { reason: 'hotfix spike' },
      },
    });
  });

  it('end without --outcome exits USAGE_ERROR', async () => {
    const ctx = await createTestCtx({ withRails: true });
    await executeSession(ctx, 'start', 'HARD-5', {});

    const result = await executeSession(ctx, 'end', undefined, {});
    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
    expect(result.error?.message).toContain('--outcome is required');
  });

  it('end with invalid --outcome exits USAGE_ERROR', async () => {
    const ctx = await createTestCtx({ withRails: true });
    const result = await executeSession(ctx, 'end', undefined, {
      outcome: 'done',
    });
    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
    expect(result.error?.message).toContain('Invalid outcome');
  });

  it('end without active session exits SESSION_ERROR', async () => {
    const ctx = await createTestCtx({ withRails: true });
    const result = await executeSession(ctx, 'end', undefined, {
      outcome: 'interrupted',
    });
    expect(result.exitCode).toBe(ExitCode.SESSION_ERROR);
    expect(result.error?.code).toBe('SESSION_NOT_ACTIVE');
  });

  it('end completed requires evidence and clears the rail', async () => {
    const ctx = await createTestCtx({ withRails: true });
    await executeSession(ctx, 'start', 'HARD-5', {});

    const missing = await executeSession(ctx, 'end', undefined, {
      outcome: 'completed',
    });
    expect(missing.exitCode).toBe(ExitCode.SESSION_ERROR);
    expect(missing.error?.code).toBe('SESSION_END_EVIDENCE_REQUIRED');

    const ended = await executeSession(ctx, 'end', undefined, {
      outcome: 'completed',
      evidence: ['shipped T-15 session end'],
      next: 'l1dder session status',
    });
    expect(ended.exitCode).toBe(ExitCode.SUCCESS);
    expect(ended.data).toMatchObject({
      action: 'end',
      record: {
        session: 'HARD-5',
        outcome: 'completed',
        evidence: ['shipped T-15 session end'],
        next_action: 'l1dder session status',
      },
    });
    expect(ended.humanText).toContain('Done / Next');
    expect(ended.humanText).toContain('l1dder session status');
    expect(await ctx.fs.exists(`${CWD}/.l1dder/handoff.md`)).toBe(false);

    const status = await executeSession(ctx, 'status', undefined, {});
    expect(
      (status.data as { session: unknown }).session,
    ).toBeNull();
  });

  it('end interrupted writes handoff.md', async () => {
    const ctx = await createTestCtx({ withRails: true });
    await executeSession(ctx, 'start', 'HARD-5', {});

    const result = await executeSession(ctx, 'end', undefined, {
      outcome: 'interrupted',
      next: 'resume HARD-5',
    });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toMatchObject({
      action: 'end',
      handoff: '.l1dder/handoff.md',
      record: { outcome: 'interrupted', session: 'HARD-5' },
    });
    expect(await ctx.fs.exists(`${CWD}/.l1dder/handoff.md`)).toBe(true);
    const handoff = await ctx.fs.readFile(`${CWD}/.l1dder/handoff.md`);
    expect(handoff).toContain('## Контекст сессии');
    expect(handoff).toContain('## Следующие шаги');
  });
});
