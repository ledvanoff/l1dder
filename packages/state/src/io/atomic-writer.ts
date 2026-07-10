import type { FileSystemPort, LoggerPort, Result } from '@l1dder/core';
import { CorruptedStateError, err, ok } from '@l1dder/core';

/**
 * Dependencies injected into AtomicWriter.
 */
export interface AtomicWriterDeps {
  readonly fs: FileSystemPort;
  readonly logger: LoggerPort;
}

/**
 * Atomic file writer using write-ahead pattern (PM8, SM5).
 *
 * Writes content to a temporary `.next` file first, then renames it
 * to the target path. This guarantees that readers never see a partial
 * write — the file is either the old version or the new one.
 *
 * If the rename fails, the `.next` file is cleaned up (best-effort).
 */
export class AtomicWriter {
  private readonly fs: FileSystemPort;
  private readonly logger: LoggerPort;

  constructor(deps: AtomicWriterDeps) {
    this.fs = deps.fs;
    this.logger = deps.logger;
  }

  /**
   * Write content atomically: write to `filePath.next`, then rename to `filePath`.
   *
   * @returns `ok(void)` on success, `err(CorruptedStateError)` on failure.
   */
  async write(
    filePath: string,
    content: string,
  ): Promise<Result<void, CorruptedStateError>> {
    const tempPath = `${filePath}.next`;

    try {
      await this.fs.writeFile(tempPath, content);
    } catch (cause: unknown) {
      return err(
        new CorruptedStateError(
          filePath,
          `Failed to write temporary file: ${cause instanceof Error ? cause.message : String(cause)}`,
        ),
      );
    }

    try {
      await this.fs.rename(tempPath, filePath);
    } catch (cause: unknown) {
      await this.bestEffortDelete(tempPath);
      return err(
        new CorruptedStateError(
          filePath,
          `Failed to rename temporary file: ${cause instanceof Error ? cause.message : String(cause)}`,
        ),
      );
    }

    this.logger.debug('Atomic write completed', { filePath });
    return ok(undefined);
  }

  /**
   * Find and remove orphaned `.next` files in a directory.
   *
   * Orphaned files indicate a previous crash during an atomic write.
   *
   * @returns list of cleaned file names, or error if directory listing fails.
   */
  async cleanupOrphaned(
    dirPath: string,
  ): Promise<Result<string[], CorruptedStateError>> {
    let entries: readonly string[];
    try {
      entries = await this.fs.readDir(dirPath);
    } catch (cause: unknown) {
      return err(
        new CorruptedStateError(
          dirPath,
          `Failed to list directory: ${cause instanceof Error ? cause.message : String(cause)}`,
        ),
      );
    }

    const orphaned = entries.filter((e) => e.endsWith('.next'));
    const cleaned: string[] = [];

    for (const name of orphaned) {
      const fullPath = `${dirPath}/${name}`;
      try {
        await this.fs.deleteFile(fullPath);
        cleaned.push(name);
        this.logger.info('Cleaned orphaned file', { path: fullPath });
      } catch {
        this.logger.warn('Failed to clean orphaned file', { path: fullPath });
      }
    }

    return ok(cleaned);
  }

  private async bestEffortDelete(path: string): Promise<void> {
    try {
      await this.fs.deleteFile(path);
    } catch {
      this.logger.warn('Failed to clean up temporary file', { path });
    }
  }
}
