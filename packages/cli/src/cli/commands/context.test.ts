import { describe, expect, it, vi } from 'vitest';

import { InMemoryFileSystem, FixedClock, NullLogger } from '@l1dder/core/testing';
import { NotInitializedError } from '@l1dder/core';
import type { WorkflowPosition } from '@l1dder/core';
import type { StateManager } from '@l1dder/state';

import { executeContext } from './context.js';
import { ExitCode } from '../output/exit-codes.js';
import { createColorPalette } from '../output/colors.js';
import { createFormatter } from '../output/formatter.js';
import { parseGlobals } from '../globals.js';
import { buildContext } from '../context.js';
import { NonInteractiveAdapter } from '../prompt/non-interactive-adapter.js';
import type { CliContext } from '../context.js';

const NOW = '2026-01-15T10:00:00Z';

const MOCK_BRIEF = {
  content: '# Project Brief\n\nThis is a test project brief.',
  tokenEstimate: 5000,
  sections: [
    { title: 'Summary', content: 'Summary content' },
    { title: 'Architecture', content: 'Architecture content' },
  ],
};

const MOCK_RENDERED = {
  content: '# Full Context\n\nRendered context content.',
  staticHash: 'abc123',
  dynamicOffset: 100,
  metadata: {
    phase: 'implement',
    role: 'developer',
    stage: 'delivery',
    tier: 'comfortable' as const,
    totalTokens: 15000,
    generatedAt: NOW,
  },
};

function mockPosition(overrides?: Partial<WorkflowPosition>): WorkflowPosition {
  return {
    phase: 'implement',
    status: 'in_progress',
    mode: 'main',
    stage: 'delivery',
    iteration: 1,
    ...overrides,
  };
}

function createMockStateManager(
  position: WorkflowPosition,
  chatLanguage: 'en' | 'ru' = 'en',
): Pick<StateManager, 'currentPosition' | 'configSnapshot'> {
  return {
    currentPosition: () => position,
    configSnapshot: () =>
      ({ language: { docs: chatLanguage, chat: chatLanguage } }) as ReturnType<
        StateManager['configSnapshot']
      >,
  };
}

function createTestCtx(overrides?: { throwOnState?: boolean }) {
  const fs = new InMemoryFileSystem();
  const clock = new FixedClock(NOW);
  const logger = new NullLogger();
  const prompt = new NonInteractiveAdapter();
  const colors = createColorPalette(false);
  const output = createFormatter('human', colors);
  const globals = parseGlobals({ cwd: '/test-project' });

  const ctx = buildContext(globals, {
    fs,
    clock,
    logger,
    prompt,
    output,
    colors,
  });

  const mockEngine = {
    brief: vi.fn().mockResolvedValue(MOCK_BRIEF),
    render: vi.fn().mockResolvedValue(MOCK_RENDERED),
    resolve: vi.fn(),
    inspect: vi.fn(),
    allocate: vi.fn(),
    computeBudget: vi.fn(),
    getTokenCounter: vi.fn(),
    getFileSystem: vi.fn(),
    getClock: vi.fn(),
    getConfig: vi.fn(),
    detectHandoff: vi.fn(),
  };

  const patchedCtx: CliContext = {
    ...ctx,
    contextEngine: () =>
      Promise.resolve(mockEngine) as unknown as ReturnType<typeof ctx.contextEngine>,
    state: overrides?.throwOnState
      ? () => Promise.reject(new NotInitializedError('/test-project'))
      : () => ctx.state(),
  };

  return { ctx: patchedCtx, mockEngine, fs };
}

function patchState(
  ctx: CliContext,
  position: WorkflowPosition,
  chatLanguage: 'en' | 'ru' = 'en',
): CliContext {
  return {
    ...ctx,
    state: () =>
      Promise.resolve(createMockStateManager(position, chatLanguage) as unknown as StateManager),
  };
}

describe('executeContext', () => {
  it('default prints brief to stdout', async () => {
    const { ctx } = createTestCtx();

    const result = await executeContext(ctx, {});

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.humanText).toContain('Project Brief');
    expect(result.humanText).toContain('# Project Brief');
    expect(result.humanText).toContain('Token estimate: ~5,000 | Sections: 2');
    expect(result.data).toMatchObject({
      content: MOCK_BRIEF.content,
      token_estimate: 5000,
      char_count: MOCK_BRIEF.content.length,
      sections: ['Summary', 'Architecture'],
    });
  });

  it('--file saves brief to default path', async () => {
    const { ctx, fs } = createTestCtx();

    const result = await executeContext(ctx, { file: true });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.humanText).toContain('Brief saved to');
    const written = await fs.readFile('/test-project/.l1dder/context-brief.md');
    expect(written).toBe(MOCK_BRIEF.content);
  });

  it('--file with custom path saves to specified path', async () => {
    const { ctx, fs } = createTestCtx();

    const result = await executeContext(ctx, { file: '/custom/output.md' });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.humanText).toContain('/custom/output.md');
    const written = await fs.readFile('/custom/output.md');
    expect(written).toBe(MOCK_BRIEF.content);
  });

  it('--copy + --file without --full rejects with exit 2', async () => {
    const { ctx } = createTestCtx();

    const result = await executeContext(ctx, { copy: true, file: true });

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
    expect(result.error?.code).toBe('USAGE_ERROR');
    expect(result.error?.message).toContain('Cannot use --copy and --file together');
  });

  it('--json outputs ContextBriefOutputSchema shape', async () => {
    const { ctx } = createTestCtx();

    const result = await executeContext(ctx, {});

    expect(result.data).toHaveProperty('content');
    expect(result.data).toHaveProperty('token_estimate');
    expect(result.data).toHaveProperty('char_count');
    expect(result.data).toHaveProperty('sections');
    const data = result.data as { sections: string[] };
    expect(Array.isArray(data.sections)).toBe(true);
    expect(data.sections.every((s) => typeof s === 'string')).toBe(true);
  });

  it('returns exit 8 when not initialized (full mode)', async () => {
    const { ctx } = createTestCtx({ throwOnState: true });

    const result = await executeContext(ctx, { full: true });

    expect(result.exitCode).toBe(ExitCode.NOT_INITIALIZED);
    expect(result.error?.code).toBe('NOT_INITIALIZED');
    expect(result.error?.hint).toContain('l1dder init');
  });

  it('--full renders full context to stdout', async () => {
    const { ctx, mockEngine } = createTestCtx();
    const patchedCtx = patchState(ctx, mockPosition());

    const result = await executeContext(patchedCtx, { full: true });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.humanText).toBe(MOCK_RENDERED.content);
    expect(mockEngine.render).toHaveBeenCalled();
    expect(result.data).toMatchObject({
      content: MOCK_RENDERED.content,
      token_estimate: 15000,
      char_count: MOCK_RENDERED.content.length,
    });
  });

  it('--full --file saves full context to file', async () => {
    const { ctx, fs } = createTestCtx();
    const patchedCtx = patchState(ctx, mockPosition());

    const result = await executeContext(patchedCtx, { full: true, file: true });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.humanText).toContain('Full context saved to');
    const written = await fs.readFile('/test-project/.l1dder/context-brief.md');
    expect(written).toBe(MOCK_RENDERED.content);
  });

  it('--full --role passes role to engine.render', async () => {
    const { ctx, mockEngine } = createTestCtx();
    const patchedCtx = patchState(ctx, mockPosition({ phase: 'idle', stage: 'discovery', iteration: 0 }));

    await executeContext(patchedCtx, { full: true, role: 'architect' });

    expect(mockEngine.render).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'idle' }),
      'architect',
      'en',
    );
  });

  it('--full --phase overrides position phase', async () => {
    const { ctx, mockEngine } = createTestCtx();
    const patchedCtx = patchState(ctx, mockPosition({ phase: 'idle' }));

    await executeContext(patchedCtx, { full: true, phase: 'specify' });

    expect(mockEngine.render).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'specify' }),
      undefined,
      'en',
    );
  });

  it('--full passes config chat language to engine.render', async () => {
    const { ctx, mockEngine } = createTestCtx();
    const patchedCtx = patchState(ctx, mockPosition(), 'ru');

    await executeContext(patchedCtx, { full: true });

    expect(mockEngine.render).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'implement' }),
      undefined,
      'ru',
    );
  });
});

describe('buildContext contextEngine wiring', () => {
  it('reads knowledge relative to globals.cwd, not the process working directory', async () => {
    const fs = new InMemoryFileSystem();
    const clock = new FixedClock(NOW);
    const logger = new NullLogger();
    const prompt = new NonInteractiveAdapter();
    const colors = createColorPalette(false);
    const output = createFormatter('human', colors);
    const globals = parseGlobals({ cwd: '/sandbox-project' });

    await fs.writeFile(
      '/sandbox-project/knowledge/idea.md',
      '# Idea\n\n## Summary\n\nSandbox-scoped idea content.\n',
    );

    const ctx = buildContext(globals, { fs, clock, logger, prompt, output, colors });
    const engine = await ctx.contextEngine();
    const brief = await engine.brief();

    expect(brief.content).toContain('Sandbox-scoped idea content.');
  });

  it('uses the context: section from config.yml instead of hardcoded defaults', async () => {
    const fs = new InMemoryFileSystem();
    const clock = new FixedClock(NOW);
    const logger = new NullLogger();
    const prompt = new NonInteractiveAdapter();
    const colors = createColorPalette(false);
    const output = createFormatter('human', colors);
    const globals = parseGlobals({ cwd: '/sandbox-project' });

    await fs.mkdir('/sandbox-project/.l1dder');
    await fs.writeFile(
      '/sandbox-project/.l1dder/config.yml',
      'schema_version: 1\nrole_mode: solo\ncontext:\n  token_budget: 50000\n  reserved_tokens: 5000\n',
    );

    const ctx = buildContext(globals, { fs, clock, logger, prompt, output, colors });
    const engine = await ctx.contextEngine();

    expect(engine.computeBudget()).toEqual({ total: 50_000, reserved: 5_000, effective: 45_000 });
  });

  it('falls back to schema defaults when config.yml is missing', async () => {
    const fs = new InMemoryFileSystem();
    const clock = new FixedClock(NOW);
    const logger = new NullLogger();
    const prompt = new NonInteractiveAdapter();
    const colors = createColorPalette(false);
    const output = createFormatter('human', colors);
    const globals = parseGlobals({ cwd: '/uninitialized-project' });

    const ctx = buildContext(globals, { fs, clock, logger, prompt, output, colors });
    const engine = await ctx.contextEngine();

    expect(engine.computeBudget()).toEqual({ total: 120_000, reserved: 30_000, effective: 90_000 });
  });
});
