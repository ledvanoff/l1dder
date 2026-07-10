import type { HookPayload, HookResult } from '@l1dder/schemas';
import type { ShellPort, FileSystemPort } from '@l1dder/core';

/**
 * Dependencies available to hook handlers.
 *
 * Infrastructure ports are injected here so handlers remain testable
 * via fake implementations.
 */
export interface HookHandlerDeps {
  /** Project root directory (cwd). */
  readonly projectRoot: string;
  /** Shell command executor (for git/lint/format operations). */
  readonly shell: ShellPort;
  /** File system port (for reading/writing state files). */
  readonly fs: FileSystemPort;
  /**
   * Maximum characters for session-start bounded context (E3).
   *
   * Resolved from `L1DDER_SESSION_START_MAX_CHARS` env (priority) or
   * `config.yml hooks.session_start_max_chars`. Defaults to 8000.
   */
  readonly sessionStartMaxChars?: number;
}

/**
 * A hook handler function.
 *
 * Each built-in hook has a corresponding handler that receives the IDE payload
 * and dependencies, and returns a HookResult.
 */
export type HookHandler = (
  payload: HookPayload,
  deps: HookHandlerDeps,
) => Promise<HookResult>;
