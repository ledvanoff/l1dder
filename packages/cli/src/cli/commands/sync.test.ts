import { describe, expect, it, vi } from 'vitest';

import { InMemoryFileSystem, FixedClock, NullLogger } from '@l1dder/core/testing';

import { executeSync } from './sync.js';
import { ExitCode } from '../output/exit-codes.js';
import { createColorPalette } from '../output/colors.js';
import { createFormatter } from '../output/formatter.js';
import { parseGlobals } from '../globals.js';
import { buildContext } from '../context.js';
import { NonInteractiveAdapter } from '../prompt/non-interactive-adapter.js';

const NOW = '2026-01-15T10:00:00Z';
const STATE_YML = `schema_version: 1
project:
  name: test
  stage: delivery
  stage_history: []
  created_at: "${NOW}"
  updated_at: "${NOW}"
workflow:
  current_phase: idle
  current_status: in_progress
  mode: main
  iteration: 0
  phase_history: []
  gate_history: []
tasks:
  items: []
quick_tasks: []
knowledge_updates: []
`;

function createTestCtx(opts?: { cwd?: string }) {
  const fs = new InMemoryFileSystem();
  const clock = new FixedClock(NOW);
  const logger = new NullLogger();
  const prompt = new NonInteractiveAdapter();
  const colors = createColorPalette(false);
  const output = createFormatter('human', colors);
  const cwd = opts?.cwd ?? '/test-project';
  const globals = parseGlobals({ cwd });

  return buildContext(globals, {
    fs, clock, logger, prompt, output, colors,
  });
}

describe('executeSync', () => {
  it('rejects when project not initialized', async () => {
    const ctx = createTestCtx();

    const result = await executeSync(ctx, { ai: ['cursor'] });

    expect(result.exitCode).toBe(ExitCode.NOT_INITIALIZED);
    expect(result.error?.code).toBe('NOT_INITIALIZED');
  });

  it('defaults to cursor when no adapter specified and none configured', async () => {
    const ctx = createTestCtx();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await ctx.fs.mkdir('/test-project/.l1dder');
    await ctx.fs.writeFile('/test-project/.l1dder/state.yml', STATE_YML);
    await ctx.fs.writeFile('/test-project/.l1dder/config.yml', 'role_mode: solo\n');
    await ctx.fs.mkdir('/test-project/standards/.base');
    await ctx.fs.writeFile('/test-project/standards/.base/conventions.base.yml', 'meta:\n  format_version: 1\n  description: test\n  last_updated: "2026-01-01"\n');
    await ctx.fs.writeFile('/test-project/standards/.base/workflow.base.yml', 'meta:\n  format_version: 1\n  description: test\n  last_updated: "2026-01-01"\n');

    const result = await executeSync(ctx, { dryRun: true });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toHaveProperty('adapter', 'cursor');
  });

  it('rejects invalid adapter id', async () => {
    const ctx = createTestCtx();
    await ctx.fs.mkdir('/test-project/.l1dder');
    await ctx.fs.writeFile('/test-project/.l1dder/state.yml', STATE_YML);
    await ctx.fs.writeFile('/test-project/.l1dder/config.yml', 'role_mode: solo\n');

    const result = await executeSync(ctx, { ai: ['vscode'] });

    expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
    expect(result.error?.code).toBe('INVALID_ADAPTER');
  });

  it('uses adapter from config when --ai is omitted', async () => {
    const ctx = createTestCtx();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await ctx.fs.mkdir('/test-project/.l1dder');
    await ctx.fs.writeFile('/test-project/.l1dder/state.yml', STATE_YML);
    await ctx.fs.writeFile('/test-project/.l1dder/config.yml', 'schema_version: 1\nrole_mode: solo\nadapter: cursor\n');

    const result = await executeSync(ctx, { dryRun: true });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toHaveProperty('adapter', 'cursor');
  });

  // @tc TC-014-01-A
  it('generates IDE files when adapter specified', async () => {
    const ctx = createTestCtx();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await ctx.fs.mkdir('/test-project/.l1dder');
    await ctx.fs.writeFile('/test-project/.l1dder/state.yml', STATE_YML);
    await ctx.fs.writeFile('/test-project/.l1dder/config.yml', 'role_mode: solo\n');

    // Create minimal standards
    await ctx.fs.mkdir('/test-project/standards/.base');
    await ctx.fs.writeFile('/test-project/standards/.base/conventions.base.yml', 'meta:\n  format_version: 1\n  description: test\n  last_updated: "2026-01-01"\n');
    await ctx.fs.writeFile('/test-project/standards/.base/workflow.base.yml', 'meta:\n  format_version: 1\n  description: test\n  last_updated: "2026-01-01"\n');

    const result = await executeSync(ctx, { ai: ['cursor'] });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data).toHaveProperty('adapter', 'cursor');
    // Even without skills/commands, the rule + AGENTS.md are generated
    expect(result.data).toHaveProperty('created');
  });

  it('--dry-run reports without writing', async () => {
    const ctx = createTestCtx();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await ctx.fs.mkdir('/test-project/.l1dder');
    await ctx.fs.writeFile('/test-project/.l1dder/state.yml', STATE_YML);
    await ctx.fs.writeFile('/test-project/.l1dder/config.yml', 'role_mode: solo\n');
    await ctx.fs.mkdir('/test-project/standards/.base');
    await ctx.fs.writeFile('/test-project/standards/.base/conventions.base.yml', 'meta:\n  format_version: 1\n  description: test\n  last_updated: "2026-01-01"\n');
    await ctx.fs.writeFile('/test-project/standards/.base/workflow.base.yml', 'meta:\n  format_version: 1\n  description: test\n  last_updated: "2026-01-01"\n');

    const result = await executeSync(ctx, { ai: ['cursor'], dryRun: true });

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    // In dry-run, files are reported as created but not actually written
    const ruleExists = await ctx.fs.exists('/test-project/.cursor/rules/l1dder.mdc');
    expect(ruleExists).toBe(false);
  });
});
