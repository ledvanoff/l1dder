/**
 * Result monad for domain operations — no exceptions in business logic.
 *
 * @example
 * ```ts
 * function divide(a: number, b: number): Result<number, string> {
 *   return b === 0 ? err("division by zero") : ok(a / b);
 * }
 * ```
 */

/** Success branch of Result. */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

/** Error branch of Result. */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/** Discriminated union: either Ok or Err. */
export type Result<T, E> = Ok<T> | Err<E>;

/** Wrap a value in a success Result. */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/** Wrap an error in a failure Result. */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/** Type guard for success Result. */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

/** Type guard for failure Result. */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}
