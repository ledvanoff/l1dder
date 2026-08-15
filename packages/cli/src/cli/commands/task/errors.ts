import {
  mapErrorToExitCode,
  errorToCode,
  errorToHint,
} from '../../output/exit-codes.js';
import type { TaskResult } from './task.js';

/**
 * Map a domain/load error into a {@link TaskResult} rejection.
 */
export function taskErrorResult(error: unknown): TaskResult {
  const hint = errorToHint(error);
  return {
    exitCode: mapErrorToExitCode(error),
    error: {
      code: errorToCode(error),
      message: messageOf(error),
      ...(hint !== undefined ? { hint } : {}),
    },
  };
}

/** Best-effort message extraction from Error or `{ message }` objects. */
function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Unknown error';
}
