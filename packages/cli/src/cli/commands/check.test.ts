import { describe, it, expect } from 'vitest';

import { executeCheck } from './check.js';
import type { CliContext } from '../context.js';
import { ExitCode } from '../output/exit-codes.js';

function createMockCtx(files: Record<string, string>): CliContext {
  const fs = {
    readFile: (path: string): Promise<string> => {
      const normalized = path.replace(/\\/g, '/');
      for (const [key, value] of Object.entries(files)) {
        if (normalized.endsWith(key)) return Promise.resolve(value);
      }
      return Promise.reject(new Error(`File not found: ${path}`));
    },
    writeFile: () => Promise.resolve(),
    rename: () => Promise.resolve(),
    exists: (path: string) => {
      const normalized = path.replace(/\\/g, '/');
      return Promise.resolve(Object.keys(files).some((k) => normalized.endsWith(k)));
    },
    stat: () => Promise.resolve({ size: 0, mtimeMs: 0, isFile: true, isDirectory: false }),
    mkdir: () => Promise.resolve(),
    deleteFile: () => Promise.resolve(),
    readDir: () => Promise.resolve([] as string[]),
    removeDir: () => Promise.resolve(),
  };

  return {
    cwd: '/project',
    fs,
    clock: { now: () => '2026-05-24T12:00:00.000Z' },
    logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    prompt: {
      confirm: () => Promise.resolve(true),
      input: () => Promise.resolve(''),
      select: <T extends string>() => Promise.resolve('' as T),
    },
    globals: {
      cwd: '/project',
      json: false,
      color: false,
      quiet: false,
      verbose: false,
      noPrompt: false,
      noRecover: false,
    },
    output: {
      render: () => {},
      error: () => {},
    },
    colors: {
      success: (t: string) => t,
      warning: (t: string) => t,
      error: (t: string) => t,
      info: (t: string) => t,
      dim: (t: string) => t,
      bold: (t: string) => t,
      glyph: { pass: '[OK]', warn: '[WARN]', fail: '[FAIL]', info: '[i]', arrow: '→' },
    },
    shell: undefined,
    state: () => Promise.reject(new Error('not initialized')),
    knowledge: () => { throw new Error('not initialized'); },
    contextEngine: () => { throw new Error('not initialized'); },
  };
}

const VALID_CONVENTIONS_BASE = `meta:
  format_version: 1
  description: "Test conventions"
language:
  primary: typescript
`;

const VALID_WORKFLOW_BASE = `meta:
  format_version: 1
  description: "Test workflow"
  last_updated: "2026-01-01"
language_policy:
  code: english
`;

const VALID_CONFIG = `schema_version: 1
role_mode: solo
gates: {}
stage: {}
context: {}
presets: {}
`;

describe('executeCheck', () => {
  it('passes with valid standards and config', async () => {
    const ctx = createMockCtx({
      'standards/.base/conventions.base.yml': VALID_CONVENTIONS_BASE,
      'standards/.base/workflow.base.yml': VALID_WORKFLOW_BASE,
      '.l1dder/config.yml': VALID_CONFIG,
    });

    const result = await executeCheck(ctx);

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data?.summary.fail).toBe(0);
    expect(result.data?.summary.pass).toBeGreaterThan(0);
  });

  it('warns on override conflict with machine-enforced', async () => {
    const conventions = `# Conventions

## Overrides
| Key | Value | Reason |
|-----|-------|--------|
| architecture.esm_only | false | Legacy support |
`;

    const ctx = createMockCtx({
      'standards/.base/conventions.base.yml': VALID_CONVENTIONS_BASE,
      'standards/.base/workflow.base.yml': VALID_WORKFLOW_BASE,
      'standards/conventions.md': conventions,
      '.l1dder/config.yml': VALID_CONFIG,
    });

    const result = await executeCheck(ctx);

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.data?.summary.warn).toBeGreaterThan(0);
    const warnCheck = result.data?.checks.find((c) => c.level === 'warn');
    expect(warnCheck?.message).toContain('architecture.esm_only');
  });

  it('exit 7 on invalid config.yml', async () => {
    const ctx = createMockCtx({
      'standards/.base/conventions.base.yml': VALID_CONVENTIONS_BASE,
      'standards/.base/workflow.base.yml': VALID_WORKFLOW_BASE,
      '.l1dder/config.yml': 'invalid: [yaml: {broken',
    });

    const result = await executeCheck(ctx);

    expect(result.exitCode).toBe(ExitCode.SCHEMA_VALIDATION);
  });

  it('outputs CheckOutputSchema-compatible data', async () => {
    const ctx = createMockCtx({
      'standards/.base/conventions.base.yml': VALID_CONVENTIONS_BASE,
      'standards/.base/workflow.base.yml': VALID_WORKFLOW_BASE,
      '.l1dder/config.yml': VALID_CONFIG,
    });

    const result = await executeCheck(ctx);

    expect(result.data).toBeDefined();
    expect(result.data?.summary).toHaveProperty('pass');
    expect(result.data?.summary).toHaveProperty('warn');
    expect(result.data?.summary).toHaveProperty('fail');
    expect(result.data?.checks).toBeInstanceOf(Array);
  });
});
