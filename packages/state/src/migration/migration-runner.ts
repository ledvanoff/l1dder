import type { FileSystemPort, LoggerPort, Result } from '@l1dder/core';
import { SchemaValidationError, err, ok } from '@l1dder/core';

/**
 * A single schema migration step.
 */
export interface Migration {
  readonly fromVersion: number;
  readonly toVersion: number;
  migrate(state: Record<string, unknown>): Record<string, unknown>;
}

/**
 * Sequential schema version migration with backup.
 *
 * Checks `schema_version` on load, applies migrations in order,
 * creates `.bak` backup before any changes.
 */
export class MigrationRunner {
  private readonly migrations: readonly Migration[];
  private readonly fs: FileSystemPort;
  private readonly logger: LoggerPort;
  private readonly latestVersion: number;

  constructor(
    migrations: readonly Migration[],
    fs: FileSystemPort,
    logger: LoggerPort,
  ) {
    this.migrations = [...migrations].sort(
      (a, b) => a.fromVersion - b.fromVersion,
    );
    this.fs = fs;
    this.logger = logger;
    this.latestVersion =
      migrations.length > 0
        ? Math.max(...migrations.map((m) => m.toVersion))
        : 0;
  }

  /**
   * Check whether a migration is needed.
   */
  needsMigration(currentVersion: number): boolean {
    return currentVersion < this.latestVersion;
  }

  /**
   * Apply migrations sequentially from currentVersion to latest.
   * Creates a `.bak` backup of the original file before any migration.
   */
  async migrate(
    statePath: string,
    rawState: Record<string, unknown>,
    currentVersion: number,
  ): Promise<Result<Record<string, unknown>, SchemaValidationError>> {
    if (!this.needsMigration(currentVersion)) {
      return ok(rawState);
    }

    // Create backup before migrating
    try {
      const originalContent = await this.fs.readFile(statePath);
      await this.fs.writeFile(`${statePath}.bak`, originalContent);
      this.logger.info('Created backup before migration', {
        backup: `${statePath}.bak`,
      });
    } catch {
      this.logger.warn('Could not create backup file', { statePath });
    }

    let state = { ...rawState };
    let version = currentVersion;

    for (const migration of this.migrations) {
      if (migration.fromVersion === version) {
        try {
          state = migration.migrate(state);
          version = migration.toVersion;
          this.logger.info('Applied migration', {
            from: migration.fromVersion,
            to: migration.toVersion,
          });
        } catch (error) {
          return err(
            new SchemaValidationError(statePath, [
              `Migration v${String(migration.fromVersion)}→v${String(migration.toVersion)} failed: ${String(error)}`,
            ]),
          );
        }
      }
    }

    if (version < this.latestVersion) {
      return err(
        new SchemaValidationError(statePath, [
          `Migration chain incomplete: reached v${String(version)}, expected v${String(this.latestVersion)}`,
        ]),
      );
    }

    return ok(state);
  }
}
