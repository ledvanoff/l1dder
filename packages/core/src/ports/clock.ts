/**
 * Port for time operations.
 *
 * Returns ISO 8601 datetime strings for deterministic testing.
 * Implementations: system clock (production), FixedClock (testing).
 */
export interface ClockPort {
  /** Return current time as ISO 8601 datetime string. */
  now(): string;
}
