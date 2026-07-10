import type { FileSystemPort, LoggerPort } from '@l1dder/core';

/**
 * DoctorCheck — a single diagnostic result from a doctor section.
 *
 * `info` (Iteration 6, `--deep`) is a non-blocking observation and is
 * excluded from the pass/warn/fail summary counts.
 */
export interface DoctorCheck {
  readonly id: string;
  readonly level: 'pass' | 'warn' | 'fail' | 'info';
  readonly message: string;
  readonly hint?: string;
  readonly fixable?: boolean;
}

/** Doctor section with grouped checks. */
export interface DoctorSection {
  readonly id: string;
  readonly label: string;
  readonly checks: DoctorCheck[];
}

/** Fixer function signature — mutates project state to fix an issue. */
export type DoctorFixer = (ctx: DoctorFixerContext) => Promise<boolean>;

/** Context available to fixers. */
export interface DoctorFixerContext {
  readonly fs: FileSystemPort;
  readonly projectRoot: string;
  readonly logger: LoggerPort;
}
