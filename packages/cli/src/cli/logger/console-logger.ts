import type { LoggerPort } from '@l1dder/core';

/**
 * Console logger adapter for CLI.
 *
 * Respects `quiet` (only errors) and `verbose` (debug + stack traces).
 *
 * In `json` mode all diagnostic output is routed to stderr so that stdout
 * carries only the machine-readable JSON envelope. Without this, progress
 * logs emitted deep in the pipeline (e.g. adapter `transformForInstall()`
 * during `doctor --deep`/`sync`/`init`) would corrupt `--json` output.
 */
export class ConsoleLogger implements LoggerPort {
  private readonly isQuiet: boolean;
  private readonly isVerbose: boolean;
  private readonly isJson: boolean;

  constructor(opts: { quiet: boolean; verbose: boolean; json?: boolean }) {
    this.isQuiet = opts.quiet;
    this.isVerbose = opts.verbose;
    this.isJson = opts.json ?? false;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (!this.isVerbose) return;
    this.write('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.isQuiet) return;
    this.write('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.write('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.write('error', message, context);
  }

  private write(
    level: string,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    const stream =
      this.isJson || level === 'error' || level === 'warn'
        ? process.stderr
        : process.stdout;
    const prefix = level === 'debug' ? '[debug] ' : '';
    const suffix = context && this.isVerbose ? ` ${JSON.stringify(context)}` : '';
    stream.write(`${prefix}${message}${suffix}\n`);
  }
}
