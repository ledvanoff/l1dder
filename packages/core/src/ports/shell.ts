/**
 * Port for shell command execution.
 *
 * Used by brownfield scan, git operations, etc.
 */
export interface ShellPort {
  /** Execute a shell command and return its result. */
  exec(command: string, options?: ShellExecOptions): Promise<ShellResult>;
}

/** Options for shell command execution. */
export interface ShellExecOptions {
  readonly cwd?: string;
  readonly timeout?: number;
  readonly env?: Readonly<Record<string, string>>;
}

/** Result of a shell command execution. */
export interface ShellResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}
