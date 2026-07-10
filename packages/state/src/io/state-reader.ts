import type { FileSystemPort, LoggerPort, Result } from '@l1dder/core';
import {
  NotInitializedError,
  SchemaValidationError,
  err,
  ok,
} from '@l1dder/core';
import type { Config, State } from '@l1dder/schemas';
import { ConfigSchema, StateSchema } from '@l1dder/schemas';
import type { L1dderDocument } from '@l1dder/yaml';
import { parseDocument } from '@l1dder/yaml';

/**
 * Dependencies injected into StateReader.
 */
export interface StateReaderDeps {
  readonly fs: FileSystemPort;
  readonly logger: LoggerPort;
}

/**
 * Parsed and validated state with its round-trip document.
 */
export interface StateReadResult {
  readonly state: State;
  readonly document: L1dderDocument;
}

/**
 * Parsed and validated config with its round-trip document.
 */
export interface ConfigReadResult {
  readonly config: Config;
  readonly document: L1dderDocument;
}

/** Union of errors that can occur during state/config reading. */
export type ReadError = NotInitializedError | SchemaValidationError;

/**
 * Reads and validates `state.yml` and `config.yml` from disk.
 *
 * Uses `@l1dder/yaml` for round-trip YAML parsing (preserving comments)
 * and `@l1dder/schemas` Zod schemas for type-safe validation.
 * Returns the parsed data alongside the L1dderDocument for round-trip writes.
 */
export class StateReader {
  private readonly fs: FileSystemPort;
  private readonly logger: LoggerPort;

  constructor(deps: StateReaderDeps) {
    this.fs = deps.fs;
    this.logger = deps.logger;
  }

  /**
   * Read and validate `state.yml`.
   *
   * @returns `ok(StateReadResult)` with typed State + L1dderDocument,
   *          `err(NotInitializedError)` if file is missing,
   *          `err(SchemaValidationError)` if validation fails.
   */
  async readState(
    filePath: string,
  ): Promise<Result<StateReadResult, ReadError>> {
    const raw = await this.readRawFile(filePath);
    if (!raw.ok) return raw;

    const document = parseDocument(raw.value);
    const parsed = StateSchema.safeParse(document.toJS());

    if (!parsed.success) {
      return err(
        new SchemaValidationError(filePath, parsed.error.issues),
      );
    }

    this.logger.debug('State loaded and validated', { filePath });
    return ok({ state: parsed.data, document });
  }

  /**
   * Read and validate `config.yml`.
   *
   * @returns `ok(ConfigReadResult)` with typed Config + L1dderDocument,
   *          `err(NotInitializedError)` if file is missing,
   *          `err(SchemaValidationError)` if validation fails.
   */
  async readConfig(
    filePath: string,
  ): Promise<Result<ConfigReadResult, ReadError>> {
    const raw = await this.readRawFile(filePath);
    if (!raw.ok) return raw;

    const document = parseDocument(raw.value);
    const parsed = ConfigSchema.safeParse(document.toJS());

    if (!parsed.success) {
      return err(
        new SchemaValidationError(filePath, parsed.error.issues),
      );
    }

    this.logger.debug('Config loaded and validated', { filePath });
    return ok({ config: parsed.data, document });
  }

  /**
   * Check whether a file exists at the given path.
   */
  async exists(filePath: string): Promise<boolean> {
    return this.fs.exists(filePath);
  }

  private async readRawFile(
    filePath: string,
  ): Promise<Result<string, NotInitializedError>> {
    try {
      const content = await this.fs.readFile(filePath);
      return ok(content);
    } catch {
      return err(new NotInitializedError(filePath));
    }
  }
}
