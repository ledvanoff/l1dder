import { describe, expect, it, vi, beforeEach } from 'vitest';

import { createColorPalette } from './colors.js';
import { HumanFormatter, JsonFormatter, createFormatter } from './formatter.js';
import type { CommandResult, CommandError } from './formatter.js';

describe('HumanFormatter', () => {
  const palette = createColorPalette(false);
  let stdoutData: string;
  let stderrData: string;

  beforeEach(() => {
    stdoutData = '';
    stderrData = '';
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      stdoutData += String(chunk);
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      stderrData += String(chunk);
      return true;
    });
  });

  it('renders humanText when present', () => {
    const result: CommandResult = {
      command: 'status',
      data: { foo: 1 },
      humanText: 'Project: test\nStage: discovery',
    };
    new HumanFormatter(palette).render(result);
    expect(stdoutData).toContain('Project: test');
    expect(stdoutData).toContain('Stage: discovery');
  });

  it('renders JSON fallback when no humanText', () => {
    const result: CommandResult = {
      command: 'status',
      data: { stage: 'discovery' },
    };
    new HumanFormatter(palette).render(result);
    expect(JSON.parse(stdoutData)).toEqual({ stage: 'discovery' });
  });

  it('renders error to stderr with glyph', () => {
    const err: CommandError = {
      command: 'init',
      exitCode: 1,
      code: 'GENERIC_ERROR',
      message: 'Something failed',
      hint: 'Try again',
    };
    new HumanFormatter(palette).error(err);
    expect(stderrData).toContain('Something failed');
    expect(stderrData).toContain('Try again');
  });
});

describe('JsonFormatter', () => {
  let stdoutData: string;
  let stderrData: string;

  beforeEach(() => {
    stdoutData = '';
    stderrData = '';
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      stdoutData += String(chunk);
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      stderrData += String(chunk);
      return true;
    });
  });

  it('renders valid JSON to stdout', () => {
    const result: CommandResult = {
      command: 'status',
      data: { stage: 'delivery' },
    };
    new JsonFormatter().render(result);
    const parsed = JSON.parse(stdoutData) as { ok: boolean; command: string; data: { stage: string } };
    expect(parsed.ok).toBe(true);
    expect(parsed.command).toBe('status');
    expect(parsed.data.stage).toBe('delivery');
  });

  it('renders error JSON to stderr', () => {
    const err: CommandError = {
      command: 'init',
      exitCode: 8,
      code: 'NOT_INITIALIZED',
      message: 'Not initialized',
      hint: "Run 'l1dder init'",
    };
    new JsonFormatter().error(err);
    const parsed = JSON.parse(stderrData) as { ok: boolean; exit_code: number; error: { code: string; hint: string } };
    expect(parsed.ok).toBe(false);
    expect(parsed.exit_code).toBe(8);
    expect(parsed.error.code).toBe('NOT_INITIALIZED');
    expect(parsed.error.hint).toContain('l1dder init');
  });

  it('omits hint and details when absent', () => {
    const err: CommandError = {
      command: 'status',
      exitCode: 1,
      code: 'GENERIC_ERROR',
      message: 'Failed',
    };
    new JsonFormatter().error(err);
    const parsed = JSON.parse(stderrData) as { error: { hint?: string; details?: unknown } };
    expect(parsed.error.hint).toBeUndefined();
    expect(parsed.error.details).toBeUndefined();
  });
});

describe('createFormatter', () => {
  it('creates HumanFormatter for human mode', () => {
    const formatter = createFormatter('human', createColorPalette(false));
    expect(formatter).toBeInstanceOf(HumanFormatter);
  });

  it('creates JsonFormatter for json mode', () => {
    const formatter = createFormatter('json', createColorPalette(false));
    expect(formatter).toBeInstanceOf(JsonFormatter);
  });
});
