import { describe, expect, it, vi } from 'vitest';
import { parse } from 'yaml';

import { DISCOVERY_MILESTONE_ORDER } from '@l1dder/core';
import { InMemoryFileSystem, FixedClock, NullLogger } from '@l1dder/core/testing';
import { StateSchema } from '@l1dder/schemas';
import { createInitialState } from '@l1dder/state';

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
  /** When false, forces interactive prompting even on non-TTY. Default: true. */
  noPrompt?: boolean;
  json?: boolean;
}) {
  const fs = new InMemoryFileSystem();
  const clock = new FixedClock(NOW);
  const logger = new NullLogger();
  const noPrompt = overrides?.noPrompt ?? true;
  const prompt = overrides?.promptResponses
    ? new ScriptedAdapter(overrides.promptResponses)
    : new NonInteractiveAdapter();
  const colors = createColorPalette(false);
  const output = createFormatter(overrides?.json ? 'json' : 'human', colors);
  const cwd = overrides?.cwd ?? '/test-project';
  const baseGlobals = parseGlobals({
    cwd,
    noPrompt,
    ...(overrides?.json ? { json: true } : {}),
  });
  // parseGlobals ORs noPrompt with !isTTY; force the test-controlled value.
  const globals = { ...baseGlobals, noPrompt };

  return buildContext(globals, {
    fs, clock, logger, prompt, output, colors,
  });
}

describe('executeInit', () => {
  // @tc TC-008-01-A
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
    const parsed = StateSchema.parse(parse(stateContent));
    const expected = createInitialState({
      projectName: 'my-saas',
      brownfield: false,
      now: NOW,
    });
    expect(parsed).toEqual(expected);
    expect(parsed.project.stage).toBe('discovery');
    expect(parsed.discovery.current).toBe('idea');
    expect(parsed.discovery.milestones.map((m) => m.id)).toEqual([
      ...DISCOVERY_MILESTONE_ORDER,
    ]);
    expect(
      parsed.discovery.milestones.every((m) => m.status === 'pending'),
    ).toBe(true);
    expect(parsed.discovery.milestones).toHaveLength(7);

    const filesCreated = (result.data as { files_created: string[] }).files_created;
    expect(filesCreated).toContain('knowledge/roadmap.md');

    const nextSteps = (
      result.data as {
        next_steps: Array<{ label: string; command: string | null }>;
      }
    ).next_steps;
    expect(nextSteps[0]).toEqual({
      label: 'Start the IDEA milestone brainstorm',
      command: 'l1dder discovery start idea',
      blocking: false,
    });
  });

  // @tc TC-008-02-A
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
    const parsed = StateSchema.parse(parse(stateContent));
    expect(parsed.project.stage).toBe('delivery');
    expect(parsed.project.stage_history).toHaveLength(1);
    expect(parsed.project.stage_history[0]?.reason).toBe(
      'Brownfield initialization',
    );
    expect(parsed.discovery.current).toBe('idea');
    expect(parsed.discovery.milestones).toHaveLength(7);
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
      noPrompt: false,
      promptResponses: {
        brownfield: true,
        Documentation: 'en',
        'AI IDE': 'cursor',
      },
    });
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await ctx.fs.mkdir('/test-project');
    await ctx.fs.writeFile('/test-project/src/main.ts', 'code');

    const result = await executeInit(ctx, { name: 'detected' });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toMatchObject({ mode: 'brownfield' });
  });

  it('init --json outputs correct data structure', async () => {
    const ctx = createTestCtx({ json: true });
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const result = await executeInit(ctx, { name: 'p' });

    expect(result.data).toHaveProperty('project');
    expect(result.data).toHaveProperty('mode');
    expect(result.data).toHaveProperty('files_created');
    expect(result.data).toHaveProperty('next_steps');
    expect(result.data).toMatchObject({
      lang: 'en',
      ai: ['cursor'],
      defaults_applied: { lang: true, ai: true },
    });
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

  it('non-interactive init without --ai defaults to cursor and syncs adapter', async () => {
    const ctx = createTestCtx({ noPrompt: true });
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const result = await executeInit(ctx, { name: 'plain' });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toMatchObject({
      lang: 'en',
      ai: ['cursor'],
      defaults_applied: { lang: true, ai: true },
    });
    expect(result.humanText).toContain('Non-interactive defaults');
    expect(result.humanText).toContain('--lang en');
    expect(result.humanText).toContain('--ai cursor');
    expect(result.humanText).toContain('Override with:');

    const configContent = await ctx.fs.readFile('/test-project/.l1dder/config.yml');
    expect(configContent).toContain('- cursor');
    expect(await ctx.fs.exists('/test-project/.cursor/rules/l1dder.mdc')).toBe(true);
    expect(await ctx.fs.exists('/test-project/AGENTS.md')).toBe(true);

    const agentsMd = await ctx.fs.readFile('/test-project/AGENTS.md');
    expect(agentsMd).toContain('## Position Model');
    expect(agentsMd).not.toContain('Phase Machine workflow: SPECIFY → PLAN → TASKS');
  });

  it('non-interactive --json reports defaults in payload without human defaults notice', async () => {
    const ctx = createTestCtx({ noPrompt: true, json: true });
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const result = await executeInit(ctx, { name: 'json-defaults' });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toMatchObject({
      lang: 'en',
      ai: ['cursor'],
      defaults_applied: { lang: true, ai: true },
    });
    expect(result.humanText).not.toContain('Non-interactive defaults');
  });

  it('interactive init asks for AI IDE, persists choice, and generates adapter files', async () => {
    const ctx = createTestCtx({
      noPrompt: false,
      promptResponses: {
        Documentation: 'ru',
        'AI IDE': 'cursor',
      },
    });
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const result = await executeInit(ctx, { name: 'interactive' });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toMatchObject({
      lang: 'ru',
      ai: ['cursor'],
      defaults_applied: { lang: false, ai: false },
    });
    expect(result.data).toHaveProperty('adapters');

    const configContent = await ctx.fs.readFile('/test-project/.l1dder/config.yml');
    expect(configContent).toContain('docs: ru');
    expect(configContent).toContain('- cursor');
    expect(await ctx.fs.exists('/test-project/.cursor/rules/l1dder.mdc')).toBe(true);
    expect(await ctx.fs.exists('/test-project/.cursor/hooks.json')).toBe(true);

    const agentsMd = await ctx.fs.readFile('/test-project/AGENTS.md');
    expect(agentsMd).toContain('L1DDER:MANAGED hash:');
    expect(agentsMd).toContain('Primary Entrypoint');
  });

  it('interactive init with none skips adapter and writes static AGENTS.md', async () => {
    const ctx = createTestCtx({
      noPrompt: false,
      promptResponses: {
        Documentation: 'en',
        'AI IDE': 'none',
      },
    });
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const result = await executeInit(ctx, { name: 'no-ai' });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toMatchObject({
      ai: [],
      defaults_applied: { lang: false, ai: false },
    });
    expect(result.data).not.toHaveProperty('adapters');

    const configContent = await ctx.fs.readFile('/test-project/.l1dder/config.yml');
    expect(configContent).not.toContain('adapters:');
    expect(await ctx.fs.exists('/test-project/.cursor/rules/l1dder.mdc')).toBe(false);

    const agentsMd = await ctx.fs.readFile('/test-project/AGENTS.md');
    expect(agentsMd).toContain('AI Agent Guide');
  });

  it('does not ask for AI IDE when --ai is passed explicitly', async () => {
    const ctx = createTestCtx({
      noPrompt: false,
      promptResponses: {
        Documentation: 'en',
        // Intentionally no 'AI IDE' response — ScriptedAdapter would throw if asked.
      },
    });
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const result = await executeInit(ctx, { name: 'explicit-ai', ai: ['claude'] });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toMatchObject({
      ai: ['claude'],
      defaults_applied: { lang: false, ai: false },
    });

    const configContent = await ctx.fs.readFile('/test-project/.l1dder/config.yml');
    expect(configContent).toContain('- claude');
  });

  it('non-interactive --ai none skips the adapter like the prompt choice does', async () => {
    const ctx = createTestCtx();

    const result = await executeInit(ctx, { name: 'no-ai-flag', ai: ['none'] });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toMatchObject({ ai: [] });

    const configContent = await ctx.fs.readFile('/test-project/.l1dder/config.yml');
    expect(configContent).not.toContain('adapters:');
    expect(await ctx.fs.exists('/test-project/.cursor/rules/l1dder.mdc')).toBe(
      false,
    );
  });

  it('rejects --ai none combined with a real adapter', async () => {
    const ctx = createTestCtx();

    const result = await executeInit(ctx, {
      name: 'mixed-ai',
      ai: ['none', 'cursor'],
    });

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
    expect(result.error?.code).toBe('INVALID_ADAPTER');
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
    expect(result.data).toMatchObject({
      lang: 'ru',
      defaults_applied: { lang: false, ai: true },
    });
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
