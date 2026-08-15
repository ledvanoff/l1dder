import { describe, expect, it } from 'vitest';
import { InMemoryFileSystem, FixedClock, NullLogger } from '@l1dder/core/testing';
import {
  REGISTRY_HASH_MARKER_PREFIX,
  REGISTRY_MANIFEST_PATH,
  REGISTRY_VIEW_PATH,
  renderRegistry,
} from '@l1dder/knowledge';
import { ProjectRegistrySchema, RegistryOutputSchema } from '@l1dder/schemas';

import { executeRegistry } from './registry.js';
import { ExitCode } from '../../output/exit-codes.js';
import { createColorPalette } from '../../output/colors.js';
import { createFormatter } from '../../output/formatter.js';
import { parseGlobals } from '../../globals.js';
import { buildContext } from '../../context.js';
import { NonInteractiveAdapter } from '../../prompt/non-interactive-adapter.js';
import type { CliContext } from '../../context.js';

const NOW = '2026-08-09T10:00:00Z';
const CWD = '/registry-project';

/** Minimal valid manifest with a real source file for path checks. */
const CLEAN_MANIFEST = `
schema_version: 1
features:
  - id: FEAT-001
    title: Demo Feature
    status: planned
    usecases: [UC-001-01]
    sources:
      to_be: knowledge/to-be/usecases.md#feat-001
usecases:
  - id: UC-001-01
    title: Demo usecase
    feature: FEAT-001
    sources:
      requirements: knowledge/to-be/usecases.md#uc-001-01
    covers:
      architecture: []
      integrations: []
      models: []
    test_contracts: [TC-001-01-A]
test_contracts:
  - id: TC-001-01-A
    title: given clean registry, sync is idempotent
    feature: FEAT-001
    usecase: UC-001-01
    required: false
`.trimStart();

const SOURCE_MD = `# Features

## FEAT-001

demo

## UC-001-01

demo
`;

async function createRegistryCtx(
  files: Record<string, string> = {},
): Promise<CliContext & { fs: InMemoryFileSystem }> {
  const fs = new InMemoryFileSystem();
  const clock = new FixedClock(NOW);
  const logger = new NullLogger();
  const prompt = new NonInteractiveAdapter();
  const colors = createColorPalette(false);
  const output = createFormatter('human', colors);
  const globals = parseGlobals({ cwd: CWD });

  await fs.mkdir(`${CWD}/knowledge/to-be`);
  for (const [rel, content] of Object.entries(files)) {
    const full = rel.startsWith('/') ? rel : `${CWD}/${rel}`;
    await fs.writeFile(full, content);
  }

  const ctx = buildContext(globals, { fs, clock, logger, prompt, output, colors });
  return Object.assign(ctx, { fs });
}

describe('l1dder registry', () => {
  it('given missing manifest, check returns a clear REGISTRY_MANIFEST_MISSING error', async () => {
    const ctx = await createRegistryCtx();
    const result = await executeRegistry(ctx, 'check', {});

    expect(result.exitCode).toBe(ExitCode.NOT_INITIALIZED);
    expect(result.error?.code).toBe('REGISTRY_MANIFEST_MISSING');
    expect(result.error?.message).toContain(REGISTRY_MANIFEST_PATH);
  });

  it('given stale view, check fails and sync repairs it', async () => {
    const ctx = await createRegistryCtx({
      [REGISTRY_MANIFEST_PATH]: CLEAN_MANIFEST,
      'knowledge/to-be/usecases.md': SOURCE_MD,
      [REGISTRY_VIEW_PATH]: `${REGISTRY_HASH_MARKER_PREFIX}deadbeef0000 -->\n# stale\n`,
    });

    const checkBefore = await executeRegistry(ctx, 'check', {});
    expect(checkBefore.exitCode).toBe(ExitCode.GENERIC_ERROR);
    expect(checkBefore.data?.view_stale).toBe(true);
    expect(
      checkBefore.data?.issues?.some((i) => i.code === 'REGISTRY_VIEW_STALE'),
    ).toBe(true);

    const sync = await executeRegistry(ctx, 'sync', {});
    expect(sync.exitCode).toBe(ExitCode.SUCCESS);
    expect(sync.data?.wrote).toBe(true);

    const checkAfter = await executeRegistry(ctx, 'check', {});
    expect(checkAfter.exitCode).toBe(ExitCode.SUCCESS);
    expect(checkAfter.data?.view_stale).toBe(false);
    expect(RegistryOutputSchema.safeParse(checkAfter.data).success).toBe(true);
  });

  it('given generated view with appended text (marker intact), check fails', async () => {
    const ctx = await createRegistryCtx({
      [REGISTRY_MANIFEST_PATH]: CLEAN_MANIFEST,
      'knowledge/to-be/usecases.md': SOURCE_MD,
    });
    const sync = await executeRegistry(ctx, 'sync', {});
    expect(sync.exitCode).toBe(ExitCode.SUCCESS);

    const viewPath = `${CWD}/${REGISTRY_VIEW_PATH}`;
    const fresh = await ctx.fs.readFile(viewPath);
    await ctx.fs.writeFile(viewPath, `${fresh}garbage\n`);

    const check = await executeRegistry(ctx, 'check', {});
    expect(check.exitCode).toBe(ExitCode.GENERIC_ERROR);
    expect(check.data?.view_stale).toBe(true);
    expect(
      check.data?.issues?.some(
        (i) =>
          i.code === 'REGISTRY_VIEW_STALE' &&
          i.message.includes('edited manually'),
      ),
    ).toBe(true);

    const repair = await executeRegistry(ctx, 'sync', {});
    expect(repair.exitCode).toBe(ExitCode.SUCCESS);
    const after = await executeRegistry(ctx, 'check', {});
    expect(after.exitCode).toBe(ExitCode.SUCCESS);
    expect(after.data?.view_stale).toBe(false);
  });

  it('given clean registry, two syncs produce byte-identical output', async () => {
    const ctx = await createRegistryCtx({
      [REGISTRY_MANIFEST_PATH]: CLEAN_MANIFEST,
      'knowledge/to-be/usecases.md': SOURCE_MD,
    });

    const first = await executeRegistry(ctx, 'sync', {});
    expect(first.exitCode).toBe(ExitCode.SUCCESS);
    expect(first.data?.wrote).toBe(true);
    const view1 = await ctx.fs.readFile(`${CWD}/${REGISTRY_VIEW_PATH}`);

    const second = await executeRegistry(ctx, 'sync', {});
    expect(second.exitCode).toBe(ExitCode.SUCCESS);
    expect(second.data?.unchanged).toBe(true);
    expect(second.data?.wrote).toBe(false);
    const view2 = await ctx.fs.readFile(`${CWD}/${REGISTRY_VIEW_PATH}`);

    expect(view2).toBe(view1);
  });

  it('given error-level issues, sync does not write the view', async () => {
    const broken = CLEAN_MANIFEST.replace(
      'knowledge/to-be/usecases.md#feat-001',
      'knowledge/missing.md#feat-001',
    );
    const ctx = await createRegistryCtx({
      [REGISTRY_MANIFEST_PATH]: broken,
      'knowledge/to-be/usecases.md': SOURCE_MD,
    });

    const sync = await executeRegistry(ctx, 'sync', {});
    expect(sync.exitCode).not.toBe(ExitCode.SUCCESS);
    expect(sync.error?.code).toBe('REGISTRY_VALIDATION_FAILED');
    expect(await ctx.fs.exists(`${CWD}/${REGISTRY_VIEW_PATH}`)).toBe(false);
  });

  it('given only warning-severity issues, check returns success', async () => {
    // Empty clean registry with missing view is an error; use a fresh view and
    // inject a warning-only code path via required:false TC with no evidence —
    // still warning, check stays green.
    const ctx = await createRegistryCtx({
      [REGISTRY_MANIFEST_PATH]: CLEAN_MANIFEST,
      'knowledge/to-be/usecases.md': SOURCE_MD,
    });
    const sync = await executeRegistry(ctx, 'sync', {});
    expect(sync.exitCode).toBe(ExitCode.SUCCESS);

    const check = await executeRegistry(ctx, 'check', {});
    expect(check.exitCode).toBe(ExitCode.SUCCESS);
    // Warnings (e.g. missing optional TC evidence) must not fail check.
    expect((check.data?.issue_summary?.error ?? 0)).toBe(0);
  });

  it('sync --init creates a draft manifest and refuses overwrite', async () => {
    const ctx = await createRegistryCtx();
    const init = await executeRegistry(ctx, 'sync', { init: true });
    expect(init.exitCode).toBe(ExitCode.SUCCESS);
    expect(init.data?.action).toBe('init');
    expect(await ctx.fs.exists(`${CWD}/${REGISTRY_MANIFEST_PATH}`)).toBe(true);

    const again = await executeRegistry(ctx, 'sync', { init: true });
    expect(again.exitCode).not.toBe(ExitCode.SUCCESS);
    expect(again.error?.code).toBe('REGISTRY_MANIFEST_EXISTS');
  });

  it('sync --init leaves check green by also writing the generated view', async () => {
    const ctx = await createRegistryCtx();
    const init = await executeRegistry(ctx, 'sync', { init: true });
    expect(init.exitCode).toBe(ExitCode.SUCCESS);
    expect(await ctx.fs.exists(`${CWD}/${REGISTRY_VIEW_PATH}`)).toBe(true);

    const check = await executeRegistry(ctx, 'check', {});
    expect(check.exitCode).toBe(ExitCode.SUCCESS);
    expect(check.data?.issue_summary?.error ?? 0).toBe(0);
  });

  it('show returns counts, lookup instruction, and optional filter matches', async () => {
    const registry = ProjectRegistrySchema.parse({
      schema_version: 1,
      features: [
        {
          id: 'FEAT-001',
          title: 'Demo Feature',
          status: 'planned',
          usecases: ['UC-001-01'],
          sources: { to_be: 'knowledge/to-be/usecases.md#feat-001' },
        },
      ],
      usecases: [
        {
          id: 'UC-001-01',
          title: 'Demo usecase',
          feature: 'FEAT-001',
          sources: { requirements: 'knowledge/to-be/usecases.md#uc-001-01' },
          test_contracts: ['TC-001-01-A'],
        },
      ],
      test_contracts: [
        {
          id: 'TC-001-01-A',
          title: 'given clean registry, sync is idempotent',
          feature: 'FEAT-001',
          usecase: 'UC-001-01',
          required: false,
        },
      ],
    });
    const view = renderRegistry(registry);

    const ctx = await createRegistryCtx({
      [REGISTRY_MANIFEST_PATH]: CLEAN_MANIFEST,
      'knowledge/to-be/usecases.md': SOURCE_MD,
      [REGISTRY_VIEW_PATH]: view,
    });

    const show = await executeRegistry(ctx, 'show', { filter: 'FEAT-001' });
    expect(show.exitCode).toBe(ExitCode.SUCCESS);
    expect(show.data?.lookup_instruction).toContain('Registry-first lookup');
    expect(show.data?.counts?.features).toBe(1);
    expect(show.data?.matches?.some((m) => m.id === 'FEAT-001')).toBe(true);
    expect(RegistryOutputSchema.safeParse(show.data).success).toBe(true);
  });
});
