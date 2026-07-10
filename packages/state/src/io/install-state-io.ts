import type { FileSystemPort, LoggerPort, Result } from '@l1dder/core';
import type { CorruptedStateError } from '@l1dder/core';
import { SchemaValidationError, err, ok } from '@l1dder/core';
import type { InstallState } from '@l1dder/schemas';
import { InstallStateSchema } from '@l1dder/schemas';
import { parseDocument, stringifyYaml } from '@l1dder/yaml';

import type { AtomicWriter } from './atomic-writer.js';

/** Default install-state when `.l1dder/install-state.yml` is absent. */
export const DEFAULT_INSTALL_STATE: InstallState = {
  schema_version: 1,
  targets: {},
};

/**
 * Dependencies injected into InstallStateReader.
 */
export interface InstallStateReaderDeps {
  readonly fs: FileSystemPort;
  readonly logger: LoggerPort;
}

/** Union of errors that can occur during install-state reading. */
export type InstallStateReadError = SchemaValidationError;

/**
 * Reads and validates `.l1dder/install-state.yml` from disk.
 *
 * Returns the default empty state when the file is missing.
 */
export class InstallStateReader {
  private readonly fs: FileSystemPort;
  private readonly logger: LoggerPort;

  constructor(deps: InstallStateReaderDeps) {
    this.fs = deps.fs;
    this.logger = deps.logger;
  }

  /**
   * Read and validate install-state.
   *
   * @returns default state when file is missing,
   *          `err(SchemaValidationError)` when YAML or schema validation fails.
   */
  async read(
    filePath: string,
  ): Promise<Result<InstallState, InstallStateReadError>> {
    const exists = await this.fs.exists(filePath);
    if (!exists) {
      this.logger.debug('Install state missing — using default', { filePath });
      return ok(DEFAULT_INSTALL_STATE);
    }

    let raw: string;
    try {
      raw = await this.fs.readFile(filePath);
    } catch (cause: unknown) {
      return err(
        new SchemaValidationError(filePath, [
          {
            code: 'custom',
            message: `Failed to read file: ${cause instanceof Error ? cause.message : String(cause)}`,
            path: [],
          },
        ]),
      );
    }

    let parsed: unknown;
    try {
      parsed = parseDocument(raw).toJS();
    } catch (cause: unknown) {
      return err(
        new SchemaValidationError(filePath, [
          {
            code: 'custom',
            message: `Invalid YAML: ${cause instanceof Error ? cause.message : String(cause)}`,
            path: [],
          },
        ]),
      );
    }

    const validated = InstallStateSchema.safeParse(parsed);
    if (!validated.success) {
      return err(new SchemaValidationError(filePath, validated.error.issues));
    }

    this.logger.debug('Install state loaded and validated', { filePath });
    return ok(validated.data);
  }
}

/**
 * Dependencies injected into InstallStateWriter.
 */
export interface InstallStateWriterDeps {
  readonly atomicWriter: AtomicWriter;
  readonly logger: LoggerPort;
}

/**
 * Writes `.l1dder/install-state.yml` atomically.
 */
export class InstallStateWriter {
  private readonly atomicWriter: AtomicWriter;
  private readonly logger: LoggerPort;

  constructor(deps: InstallStateWriterDeps) {
    this.atomicWriter = deps.atomicWriter;
    this.logger = deps.logger;
  }

  /**
   * Persist install-state to disk.
   */
  async write(
    filePath: string,
    state: InstallState,
  ): Promise<Result<void, CorruptedStateError>> {
    const content = stringifyYaml(state);
    this.logger.debug('Writing install state', { filePath });
    return this.atomicWriter.write(filePath, content);
  }
}
