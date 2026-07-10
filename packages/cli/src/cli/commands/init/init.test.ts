import { describe, expect, it, vi } from 'vitest';

import { InMemoryFileSystem, FixedClock, NullLogger } from '@l1dder/core/testing';

import { executeInit } from './init.js';
import { ExitCode } from '../../output/exit-codes.js';
import { createColorPalette } from '../../output/colors.js';
import { createFormatter } from '../../output/formatter.js';
import { parseGlobals } from '../../globals.js';
import { buildContext } from '../../context.js';
import { ScriptedAdapter } from '../../prompt/scripted-adapter.js';
import { NonInteractiveAdapter } from '../../prompt/non-interactive-adapter.js';

const NOW = '2026-01-15T10:00:00Z';

function createTestCtx(overrides?: {
  promptResponses?: Record<string, unknown>;
  cwd?: string;
}) {
  const fs = new InMemoryFileSystem();
  const clock = new FixedClock(NOW);
  const logger = new NullLogger();
  const prompt = overrides?.promptResponses
    ? new ScriptedAdapter(overrides.promptResponses)
    : new NonInteractiveAdapter();
  const colors = createColorPalette(false);
  const output = createFormatter('human', colors);
  const cwd = overrides?.cwd ?? '/test-project';
  const globals = parseGlobals({ cwd });

  return buildContext(globals, {
    fs, clock, logger, prompt, output, colors,
  });
}

describe('executeInit', () => {
  it('greenfield creates full project structure', async () => {
    const ctx = createTestCtx();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const result = await executeInit(ctx, { name: 'my-saas' });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toMatchObject({
      project: { name: 'my-saas', stage: 'discovery' },
      mode: 'greenfield',
    });

    expect(await ctx.fs.exists('/test-project/.l1dder/state.yml')).toBe(true);
    expect(await ctx.fs.exists('/test-project/.l1dder/config.yml')).toBe(true);
    expect(await ctx.fs.exists('/test-project/knowledge/idea.md')).toBe(true);
    expect(await ctx.fs.exists('/test-project/knowledge/roadmap.md')).toBe(true);
    expect(await ctx.fs.exists('/test-project/knowledge/as-is/architecture.md')).toBe(true);
    expect(await ctx.fs.exists('/test-project/knowledge/to-be/architecture.md')).toBe(true);
    expect(await ctx.fs.exists('/test-project/standards/conventions.md')).toBe(true);
    expect(await ctx.fs.exists('/test-project/AGENTS.md')).toBe(true);

    const stateContent = await ctx.fs.readFile('/test-project/.l1dder/state.yml');
    expect(stateContent).toContain('stage: discovery');
    expect(stateContent).toContain('name: "my-saas"');
  });

  it('brownfield sets delivery stage', async () => {
    const ctx = createTestCtx();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const result = await executeInit(ctx, { name: 'backend-api', existing: true });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toMatchObject({
      project: { name: 'backend-api', stage: 'delivery' },
      mode: 'brownfield',
    });

    const stateContent = await ctx.fs.readFile('/test-project/.l1dder/state.yml');
    expect(stateContent).toContain('stage: delivery');
    expect(result.humanText).toContain('brownfield-scan');
  });

  it('rejects when already initialized without --force', async () => {
    const ctx = createTestCtx();

    await ctx.fs.mkdir('/test-project/.l1dder');
    await ctx.fs.writeFile('/test-project/.l1dder/state.yml', 'existing');

    const result = await executeInit(ctx, { name: 'p' });

    expect(result.exitCode).toBe(ExitCode.GENERIC_ERROR);
    expect(result.error?.code).toBe('ALREADY_INITIALIZED');
  });

  it('--force overwrites existing', async () => {
    const ctx = createTestCtx();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await ctx.fs.mkdir('/test-project/.l1dder');
    await ctx.fs.writeFile('/test-project/.l1dder/state.yml', 'old');

    const result = await executeInit(ctx, { name: 'new-project', force: true });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toMatchObject({ project: { name: 'new-project' } });
  });

  it('validates project name', async () => {
    const ctx = createTestCtx();

    const result = await executeInit(ctx, { name: '123invalid' });

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
    expect(result.error?.code).toBe('INVALID_PROJECT_NAME');
  });

  it('uses dirname as default project name', async () => {
    const ctx = createTestCtx({ cwd: '/path/to/my-app' });
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const result = await executeInit(ctx, {});

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toMatchObject({ project: { name: 'my-app' } });
  });

  it('auto-detects non-empty directory and prompts for brownfield', async () => {
    const ctx = createTestCtx({
      promptResponses: { 'brownfield': true, 'Documentation': 'en' },
    });
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await ctx.fs.mkdir('/test-project');
    await ctx.fs.writeFile('/test-project/src/main.ts', 'code');

    const result = await executeInit(ctx, { name: 'detected' });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toMatchObject({ mode: 'brownfield' });
  });

  it('init --json outputs correct data structure', async () => {
    const ctx = createTestCtx();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const result = await executeInit(ctx, { name: 'p' });

    expect(result.data).toHaveProperty('project');
    expect(result.data).toHaveProperty('mode');
    expect(result.data).toHaveProperty('files_created');
    expect(result.data).toHaveProperty('next_steps');
  });

  it('init --ai cursor generates IDE files after base init', async () => {
    const ctx = createTestCtx();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const result = await executeInit(ctx, { name: 'my-saas', ai: ['cursor'] });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toHaveProperty('adapters');
    expect((result.data as Record<string, unknown>).adapters).toEqual([
      expect.objectContaining({ id: 'cursor' }),
    ]);

    const configContent = await ctx.fs.readFile('/test-project/.l1dder/config.yml');
    expect(configContent).toContain('adapters:');
    expect(configContent).toContain('- cursor');
  });

  it('init --ai cursor --ai claude persists both adapters and generates both targets', async () => {
    const ctx = createTestCtx();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const result = await executeInit(ctx, { name: 'dual', ai: ['cursor', 'claude'] });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect((result.data as Record<string, unknown>).adapters).toHaveLength(2);

    const configContent = await ctx.fs.readFile('/test-project/.l1dder/config.yml');
    expect(configContent).toContain('- cursor');
    expect(configContent).toContain('- claude');
    expect(await ctx.fs.exists('/test-project/AGENTS.md')).toBe(true);
  });

  it('init --ai cursor,claude is equivalent to repeated flags', async () => {
    const ctx = createTestCtx();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const result = await executeInit(ctx, { name: 'comma', ai: ['cursor,claude'] });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    const configContent = await ctx.fs.readFile('/test-project/.l1dder/config.yml');
    expect(configContent).toContain('- cursor');
    expect(configContent).toContain('- claude');
  });

  it('init without --ai skips adapter', async () => {
    const ctx = createTestCtx();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const result = await executeInit(ctx, { name: 'plain' });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).not.toHaveProperty('adapter');
  });

  it('init --ai invalid rejects with exit 2', async () => {
    const ctx = createTestCtx();

    const result = await executeInit(ctx, { name: 'test', ai: ['vscode'] });

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
    expect(result.error?.code).toBe('INVALID_ADAPTER');
  });

  it('defaults to en language (non-interactive) with English placeholders', async () => {
    const ctx = createTestCtx();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const result = await executeInit(ctx, { name: 'plain' });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    const config = await ctx.fs.readFile('/test-project/.l1dder/config.yml');
    expect(config).toContain('docs: en');
    expect(config).toContain('chat: en');
    const idea = await ctx.fs.readFile('/test-project/knowledge/idea.md');
    expect(idea).toContain('Product Idea');
    expect(idea).toContain('Describe the product');
  });

  it('init --lang ru writes ru config and Russian placeholders', async () => {
    const ctx = createTestCtx();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const result = await executeInit(ctx, { name: 'ru-proj', lang: 'ru' });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    const config = await ctx.fs.readFile('/test-project/.l1dder/config.yml');
    expect(config).toContain('docs: ru');
    expect(config).toContain('chat: ru');
    const idea = await ctx.fs.readFile('/test-project/knowledge/idea.md');
    expect(idea).toContain('Продуктовая идея');
  });

  it('init --lang invalid rejects with exit 2', async () => {
    const ctx = createTestCtx();

    const result = await executeInit(ctx, { name: 'test', lang: 'fr' });

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
    expect(result.error?.code).toBe('INVALID_LANGUAGE');
  });

  it('init --profile unknown rejects with a usage error', async () => {
    const ctx = createTestCtx();

    const result = await executeInit(ctx, { name: 'test', profile: 'bogus' });

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
    expect(result.error?.code).toBe('INVALID_PROFILE');
  });

  it('init --profile engineering reports the profile in result data', async () => {
    const ctx = createTestCtx();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const result = await executeInit(ctx, { name: 'eng', profile: 'engineering' });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toMatchObject({ profile: 'engineering' });
  });
});
