import type {
  CorruptedStateError,
  FileSystemPort,
  LoggerPort,
  Result,
} from '@l1dder/core';
import {
  NotInitializedError,
  SchemaValidationError,
  err,
  ok,
} from '@l1dder/core';
import type { State } from '@l1dder/schemas';
import { CURRENT_SCHEMA_VERSION, StateSchema } from '@l1dder/schemas';
import type { L1dderDocument } from '@l1dder/yaml';
import { parseDocument } from '@l1dder/yaml';

import type { Migration } from '../migration/migration-runner.js';
import { MigrationRunner } from '../migration/migration-runner.js';
import { ALL_MIGRATIONS } from '../migration/migrations/index.js';
import { AtomicWriter } from './atomic-writer.js';
import { StateWriter } from './state-writer.js';

/**
 * Dependencies injected into StateLoader.
 */
export interface StateLoaderDeps {
  readonly fs: FileSystemPort;
  readonly logger: LoggerPort;
  /** Override the registered migration chain (tests). Defaults to ALL_MIGRATIONS. */
  readonly migrations?: readonly Migration[];
}

/**
 * Successfully loaded (and optionally migrated) state.yml payload.
 */
export interface StateLoadResult {
  readonly state: State;
  readonly document: L1dderDocument;
  readonly migrated: boolean;
  readonly backupPath?: string;
}

/** Union of errors that can occur during production state load. */
export type StateLoadError =
  | NotInitializedError
  | SchemaValidationError
  | CorruptedStateError;

/**
 * Single production load path for `state.yml`.
 *
 * Reads → migrates (when behind `CURRENT_SCHEMA_VERSION`) → validates →
 * persists atomically when a migration ran. Current-version files are never
 * rewritten.
 */
export class StateLoader {
  private readonly fs: FileSystemPort;
  private readonly logger: LoggerPort;
  private readonly migrationRunner: MigrationRunner;
  private readonly stateWriter: StateWriter;

  constructor(deps: StateLoaderDeps) {
    this.fs = deps.fs;
    this.logger = deps.logger;
    const migrations = deps.migrations ?? ALL_MIGRATIONS;
    this.migrationRunner = new MigrationRunner(
      migrations,
      deps.fs,
      deps.logger,
    );
    const atomicWriter = new AtomicWriter({
      fs: deps.fs,
      logger: deps.logger,
    });
    this.stateWriter = new StateWriter({
      atomicWriter,
      logger: deps.logger,
    });
  }

  /**
   * Load `state.yml`, applying migrations when the on-disk version is behind
   * {@link CURRENT_SCHEMA_VERSION}.
   */
  async load(
    statePath: string,
  ): Promise<Result<StateLoadResult, StateLoadError>> {
    const rawResult = await this.readRawFile(statePath);
    if (!rawResult.ok) return rawResult;

    const document = parseDocument(rawResult.value);
    const rawRecord = document.toJS();
    const version = readSchemaVersion(rawRecord);

    if (version > CURRENT_SCHEMA_VERSION) {
      return err(
        new SchemaValidationError(statePath, [
          `State schema_version ${String(version)} is newer than supported version ${String(CURRENT_SCHEMA_VERSION)}`,
        ]),
      );
    }

    if (version === CURRENT_SCHEMA_VERSION) {
      const parsed = StateSchema.safeParse(rawRecord);
      if (!parsed.success) {
        return err(new SchemaValidationError(statePath, parsed.error.issues));
      }
      this.logger.debug('State loaded at current schema version', {
        statePath,
        schema_version: version,
      });
      return ok({
        state: parsed.data,
        document,
        migrated: false,
      });
    }

    const migratedResult = await this.migrationRunner.migrate(
      statePath,
      rawRecord,
      version,
    );
    if (!migratedResult.ok) {
      return err(migratedResult.error);
    }

    const parsed = StateSchema.safeParse(migratedResult.value);
    if (!parsed.success) {
      return err(new SchemaValidationError(statePath, parsed.error.issues));
    }

    // Guards the invariant documented on CURRENT_SCHEMA_VERSION: a bump without
    // a registered migration must fail loudly instead of silently persisting a
    // half-upgraded file.
    if (parsed.data.schema_version !== CURRENT_SCHEMA_VERSION) {
      return err(
        new SchemaValidationError(statePath, [
          `No migration reaches schema_version ${String(CURRENT_SCHEMA_VERSION)}: stopped at v${String(parsed.data.schema_version)}`,
        ]),
      );
    }

    const writeResult = await this.stateWriter.writeState(
      statePath,
      parsed.data,
      document,
    );
    if (!writeResult.ok) {
      return err(writeResult.error);
    }

    const backupPath = `${statePath}.bak`;
    const backupExists = await this.fs.exists(backupPath);
    this.logger.info('State migrated and persisted', {
      statePath,
      from: version,
      to: CURRENT_SCHEMA_VERSION,
      ...(backupExists ? { backupPath } : {}),
    });

    return ok({
      state: parsed.data,
      document,
      migrated: true,
      ...(backupExists ? { backupPath } : {}),
    });
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

/**
 * Read `schema_version` from a raw YAML record.
 * Missing or non-number values are treated as `0` (pre-v1 / unversioned).
 */
function readSchemaVersion(raw: Record<string, unknown>): number {
  const value = raw['schema_version'];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
