import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConsoleLogger } from './console-logger.js';

/**
 * Guards the `--json` contract: in json mode nothing may reach stdout via the
 * logger (only the JSON envelope, written by the formatter, belongs there).
 * Regression test for progress logs (e.g. adapter `transformForInstall()`
 * during `doctor --deep`) corrupting `--json` output.
 */
describe('ConsoleLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes info to stdout in human mode', () => {
    const out = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const err = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    new ConsoleLogger({ quiet: false, verbose: false }).info('progress');

    expect(out).toHaveBeenCalledWith('progress\n');
    expect(err).not.toHaveBeenCalled();
  });

  it('routes info to stderr (never stdout) in json mode', () => {
    const out = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const err = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    new ConsoleLogger({ quiet: false, verbose: false, json: true }).info('progress');

    expect(out).not.toHaveBeenCalled();
    expect(err).toHaveBeenCalledWith('progress\n');
  });

  it('routes verbose debug to stderr (never stdout) in json mode', () => {
    const out = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const err = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    new ConsoleLogger({ quiet: false, verbose: true, json: true }).debug('trace');

    expect(out).not.toHaveBeenCalled();
    expect(err).toHaveBeenCalled();
  });

  it('always routes warn/error to stderr', () => {
    const out = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const err = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    const logger = new ConsoleLogger({ quiet: false, verbose: false });
    logger.warn('careful');
    logger.error('boom');

    expect(out).not.toHaveBeenCalled();
    expect(err).toHaveBeenCalledTimes(2);
  });
});
