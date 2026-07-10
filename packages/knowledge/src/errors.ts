import { L1dderError } from '@l1dder/core';

/** Raised when a knowledge or skill file cannot be read from disk. */
export class ReadError extends L1dderError {
  readonly code = 'READ_ERROR' as const;

  constructor(
    readonly path: string,
    cause?: unknown,
  ) {
    super(`Failed to read file: ${path}`);
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}

/** Raised when a skill file cannot be parsed (front-matter or Zod validation). */
export class ParseError extends L1dderError {
  readonly code = 'PARSE_ERROR' as const;

  constructor(
    readonly path: string,
    readonly details: string,
    cause?: unknown,
  ) {
    super(`Failed to parse skill: ${path} — ${details}`);
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}

/** Raised when a standards base file cannot be loaded or validated. */
export class LoadError extends L1dderError {
  readonly code = 'LOAD_ERROR' as const;

  constructor(
    readonly path: string,
    readonly details: string,
    cause?: unknown,
  ) {
    super(`Failed to load: ${path} — ${details}`);
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}
