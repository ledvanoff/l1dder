/**
 * Port for structured logging.
 *
 * Implementations: console logger (production), NullLogger (testing).
 */
export interface LoggerPort {
  /** Debug-level message (hidden in normal output). */
  debug(message: string, context?: Record<string, unknown>): void;

  /** Informational message. */
  info(message: string, context?: Record<string, unknown>): void;

  /** Warning — non-fatal issue. */
  warn(message: string, context?: Record<string, unknown>): void;

  /** Error — operation failed. */
  error(message: string, context?: Record<string, unknown>): void;
}
