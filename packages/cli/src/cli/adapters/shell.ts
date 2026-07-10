import { exec } from 'node:child_process';
import type { ShellPort, ShellExecOptions, ShellResult } from '@l1dder/core';

/**
 * Node.js implementation of ShellPort.
 *
 * Executes shell commands via child_process.exec().
 */
export class NodeShell implements ShellPort {
  exec(command: string, options?: ShellExecOptions): Promise<ShellResult> {
    return new Promise<ShellResult>((resolve) => {
      const opts = {
        cwd: options?.cwd,
        timeout: options?.timeout ?? 30_000,
        env: options?.env ? { ...process.env, ...options.env } : undefined,
      };

      exec(command, opts, (error, stdout, stderr) => {
        resolve({
          stdout,
          stderr,
          exitCode: error?.code !== undefined
            ? (typeof error.code === 'number' ? error.code : 1)
            : 0,
        });
      });
    });
  }
}
