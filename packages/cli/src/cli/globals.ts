/** Parsed global CLI flags (CL2). */
export interface Globals {
  readonly cwd: string;
  readonly json: boolean;
  readonly color: boolean;
  readonly quiet: boolean;
  readonly verbose: boolean;
  readonly noPrompt: boolean;
  readonly noRecover: boolean;
}

/**
 * Parse and validate global options from Commander.
 *
 * Detects conflicts (`--quiet` + `--verbose`) and synthesizes
 * derived flags (`--json` implies `noPrompt`; non-TTY implies `noPrompt` + `color: false`).
 */
export function parseGlobals(opts: Record<string, unknown>): Globals {
  const quiet = Boolean(opts['quiet']);
  const verbose = Boolean(opts['verbose']);
  const json = Boolean(opts['json']);
  const noPrompt = Boolean(opts['noPrompt']);
  const noRecover = Boolean(opts['noRecover']);
  const noColor = Boolean(opts['noColor']);
  const cwd = typeof opts['cwd'] === 'string' ? opts['cwd'] : process.cwd();

  if (quiet && verbose) {
    throw new UsageError('Conflicting flags: --quiet and --verbose cannot be used together');
  }

  return {
    cwd,
    json,
    color: noColor ? false : (json ? false : process.stdout.isTTY),
    quiet,
    verbose,
    noPrompt: noPrompt || json || !process.stdout.isTTY,
    noRecover,
  };
}

/** Usage error thrown for flag conflicts (maps to exit code 2). */
export class UsageError extends Error {
  readonly code = 'USAGE_ERROR' as const;

  constructor(message: string) {
    super(message);
    this.name = 'UsageError';
  }
}
