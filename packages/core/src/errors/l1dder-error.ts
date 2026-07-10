/**
 * Abstract base class for all L1DDER domain errors.
 *
 * Every L1DDER error has a unique string `code` for programmatic matching
 * and a human-readable `message`. Subclasses add contextual fields.
 */
export abstract class L1dderError extends Error {
  /** Machine-readable error code (e.g. "FORBIDDEN_TRANSITION"). */
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
