import { describe, expect, it } from 'vitest';

import { parseGlobals, UsageError } from './globals.js';

describe('parseGlobals', () => {
  it('throws on --quiet + --verbose conflict', () => {
    expect(() => parseGlobals({ quiet: true, verbose: true })).toThrow(UsageError);
  });

  it('synthesizes noPrompt when json=true', () => {
    const result = parseGlobals({ json: true });
    expect(result.noPrompt).toBe(true);
  });

  it('synthesizes color=false when json=true', () => {
    const result = parseGlobals({ json: true });
    expect(result.color).toBe(false);
  });

  it('synthesizes color=false when noColor=true', () => {
    const result = parseGlobals({ noColor: true });
    expect(result.color).toBe(false);
  });

  it('uses provided cwd', () => {
    const result = parseGlobals({ cwd: '/my/project' });
    expect(result.cwd).toBe('/my/project');
  });

  it('defaults cwd to process.cwd()', () => {
    const result = parseGlobals({});
    expect(result.cwd).toBe(process.cwd());
  });

  it('passes through noRecover flag', () => {
    const result = parseGlobals({ noRecover: true });
    expect(result.noRecover).toBe(true);
  });

  it('defaults all flags to false', () => {
    const result = parseGlobals({});
    expect(result.json).toBe(false);
    expect(result.quiet).toBe(false);
    expect(result.verbose).toBe(false);
    expect(result.noRecover).toBe(false);
  });
});
