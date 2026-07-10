import { join, dirname } from 'node:path';
import type { FileSystemPort } from '@l1dder/core';
import { parseMarker } from '../domain/marker.js';

/** A single file write request. */
export interface WriteRequest {
  readonly relativePath: string;
  readonly content: string;
  readonly hash: string;
}

/** Options controlling write behavior. */
export interface WriteOptions {
  readonly projectRoot: string;
  readonly force: boolean;
  readonly dryRun: boolean;
}

/** Report of all write operations performed. */
export interface WriteReport {
  readonly created: string[];
  readonly updated: string[];
  readonly skipped: string[];
  readonly errors: { path: string; error: string }[];
}

/**
 * Atomic file writer with idempotency support.
 */
export class AtomicWriter {
  constructor(private readonly fs: FileSystemPort) {}

  async writeAll(
    requests: readonly WriteRequest[],
    options: WriteOptions,
  ): Promise<WriteReport> {
    const report: WriteReport = {
      created: [],
      updated: [],
      skipped: [],
      errors: [],
    };

    for (const req of requests) {
      try {
        await this.processRequest(req, options, report);
      } catch (err) {
        report.errors.push({
          path: req.relativePath,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return report;
  }

  private async processRequest(
    req: WriteRequest,
    options: WriteOptions,
    report: WriteReport,
  ): Promise<void> {
    const absPath = join(options.projectRoot, req.relativePath);
    const exists = await this.fs.exists(absPath);

    if (!exists) {
      if (options.dryRun) {
        report.created.push(req.relativePath);
        return;
      }
      await this.atomicWrite(absPath, req.content);
      report.created.push(req.relativePath);
      return;
    }

    const existingContent = await this.fs.readFile(absPath);
    const marker = parseMarker(existingContent);

    if (!marker && !options.force) {
      report.skipped.push(req.relativePath);
      return;
    }

    if (marker && marker.hash === req.hash && !options.force) {
      report.skipped.push(req.relativePath);
      return;
    }

    if (options.dryRun) {
      report.updated.push(req.relativePath);
      return;
    }

    await this.atomicWrite(absPath, req.content);
    report.updated.push(req.relativePath);
  }

  private async atomicWrite(absPath: string, content: string): Promise<void> {
    const tmpPath = `${absPath}.l1dder.tmp`;
    const dir = dirname(absPath);

    await this.fs.mkdir(dir);
    await this.fs.writeFile(tmpPath, content);

    try {
      await this.fs.rename(tmpPath, absPath);
    } catch (err) {
      try {
        await this.fs.deleteFile(tmpPath);
      } catch {
        // cleanup best-effort
      }
      throw err;
    }
  }
}
