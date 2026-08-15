import {
  mapErrorToExitCode,
  errorToCode,
  errorToHint,
} from '../../output/exit-codes.js';
import type { DiscoveryResult } from './discovery.js';

/**
 * Map a domain/load error into a {@link DiscoveryResult} rejection.
 */
export function discoveryErrorResult(error: unknown): DiscoveryResult {
  const hint = errorToHint(error);
  return {
    exitCode: mapErrorToExitCode(error),
    error: {
      code: errorToCode(error),
      message: error instanceof Error ? error.message : 'Unknown error',
      ...(hint !== undefined ? { hint } : {}),
    },
  };
}

/**
 * Map a Result err value that is already an Error into a DiscoveryResult.
 */
export function discoveryDomainError(error: Error): DiscoveryResult {
  const hint = errorToHint(error);
  return {
    exitCode: mapErrorToExitCode(error),
    error: {
      code: errorToCode(error),
      message: error.message,
      ...(hint !== undefined ? { hint } : {}),
    },
  };
}
