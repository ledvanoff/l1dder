import type { ColorPalette } from './colors.js';

/**
 * Successful command result — carries data and optional human text.
 *
 * `humanText` is rendered by HumanFormatter; `data` is serialized by JsonFormatter.
 */
export interface CommandResult {
  readonly command: string;
  readonly data: unknown;
  readonly humanText?: string | undefined;
}

/**
 * Failed command result — carries error details for rendering.
 */
export interface CommandError {
  readonly command: string;
  readonly exitCode: number;
  readonly code: string;
  readonly message: string;
  readonly hint?: string | undefined;
  readonly details?: Record<string, unknown> | undefined;
}

/** Two-mode output formatter (CL4). */
export interface OutputFormatter {
  render(result: CommandResult): void;
  error(err: CommandError): void;
}

/**
 * Human-friendly formatter — colorized text to stdout, errors to stderr.
 */
export class HumanFormatter implements OutputFormatter {
  constructor(private readonly colors: ColorPalette) {}

  render(result: CommandResult): void {
    if (result.humanText) {
      process.stdout.write(result.humanText + '\n');
    } else {
      process.stdout.write(JSON.stringify(result.data, null, 2) + '\n');
    }
  }

  error(err: CommandError): void {
    const prefix = this.colors.glyph.fail;
    process.stderr.write(`${prefix} ${this.colors.error(err.message)}\n`);
    if (err.hint) {
      process.stderr.write(`  ${this.colors.glyph.arrow} ${err.hint}\n`);
    }
  }
}

/**
 * JSON formatter — structured JSON to stdout, error JSON to stderr.
 */
export class JsonFormatter implements OutputFormatter {
  render(result: CommandResult): void {
    const envelope = {
      ok: true,
      command: result.command,
      data: result.data,
    };
    process.stdout.write(JSON.stringify(envelope) + '\n');
  }

  error(err: CommandError): void {
    const envelope = {
      ok: false,
      exit_code: err.exitCode,
      error: {
        code: err.code,
        message: err.message,
        ...(err.hint ? { hint: err.hint } : {}),
        ...(err.details ? { details: err.details } : {}),
      },
    };
    process.stderr.write(JSON.stringify(envelope) + '\n');
  }
}

/** Create the appropriate formatter based on output mode. */
export function createFormatter(
  mode: 'human' | 'json',
  colors: ColorPalette,
): OutputFormatter {
  return mode === 'json' ? new JsonFormatter() : new HumanFormatter(colors);
}
