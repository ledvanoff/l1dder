import type { ShellPort } from '@l1dder/core';
import { ok } from '@l1dder/core';
import type { Result } from '@l1dder/core';
import type { QuickTask } from '@l1dder/schemas';
import type { DriftCheckerPort, DriftReport, DriftCheckError } from '@l1dder/state';

const KNOWLEDGE_PATHS = ['knowledge/', 'standards/'];

/**
 * Git-based implementation of DriftCheckerPort.
 *
 * Detects changes to knowledge/ and standards/ directories
 * by running `git diff HEAD --name-only`.
 */
export class GitDriftChecker implements DriftCheckerPort {
  private readonly shell: ShellPort;
  private readonly projectRoot: string;

  constructor(shell: ShellPort, projectRoot: string) {
    this.shell = shell;
    this.projectRoot = projectRoot;
  }

  async checkDrift(
    _quickTask: QuickTask,
    _toBeKnowledgePath: string,
  ): Promise<Result<DriftReport, DriftCheckError>> {
    try {
      const result = await this.shell.exec('git diff HEAD --name-only', {
        cwd: this.projectRoot,
        timeout: 10_000,
      });

      if (result.exitCode !== 0) {
        return ok({ hasDrift: false, affectedFiles: [], summary: '' });
      }

      const changedFiles = result.stdout
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      const affectedFiles = changedFiles.filter((file) =>
        KNOWLEDGE_PATHS.some((prefix) => file.startsWith(prefix)),
      );

      if (affectedFiles.length === 0) {
        return ok({ hasDrift: false, affectedFiles: [], summary: '' });
      }

      return ok({
        hasDrift: true,
        affectedFiles,
        summary: `${String(affectedFiles.length)} knowledge/standards file(s) modified`,
      });
    } catch {
      return ok({ hasDrift: false, affectedFiles: [], summary: '' });
    }
  }
}
