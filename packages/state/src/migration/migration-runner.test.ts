import { describe, expect, it } from 'vitest';
import { InMemoryFileSystem, NullLogger } from '@l1dder/core/testing';

import { MigrationRunner, type Migration } from './migration-runner.js';
import { v1Migration } from './migrations/v1.js';

function createRunner(
  migrations: Migration[] = [v1Migration],
  fs?: InMemoryFileSystem,
) {
  return new MigrationRunner(
    migrations,
    fs ?? new InMemoryFileSystem(),
    new NullLogger(),
  );
}

describe('MigrationRunner', () => {
  describe('needsMigration', () => {
    it('returns false when at latest version', () => {
      const runner = createRunner();
      expect(runner.needsMigration(1)).toBe(false);
    });

    it('returns true when behind latest version', () => {
      const runner = createRunner();
      expect(runner.needsMigration(0)).toBe(true);
    });

    it('returns false when no migrations registered', () => {
      const runner = createRunner([]);
      expect(runner.needsMigration(0)).toBe(false);
    });
  });

  describe('migrate', () => {
    it('creates backup before applying migration', async () => {
      const fs = new InMemoryFileSystem();
      const originalContent = 'original: true';
      await fs.writeFile('/state.yml', originalContent);

      const runner = createRunner([v1Migration], fs);

      await runner.migrate('/state.yml', {}, 0);

      const backup = await fs.readFile('/state.yml.bak');
      expect(backup).toBe(originalContent);
    });

    it('applies v1 identity migration', async () => {
      const fs = new InMemoryFileSystem();
      await fs.writeFile('/state.yml', 'test');

      const runner = createRunner([v1Migration], fs);
      const rawState = { project: { name: 'test' } };

      const result = await runner.migrate('/state.yml', rawState, 0);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.schema_version).toBe(1);
        expect(result.value.project).toEqual({ name: 'test' });
      }
    });

    it('skips when already at latest version', async () => {
      const fs = new InMemoryFileSystem();
      const runner = createRunner([v1Migration], fs);
      const rawState = { schema_version: 1 };

      const result = await runner.migrate('/state.yml', rawState, 1);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(rawState);
      }
      expect(await fs.exists('/state.yml.bak')).toBe(false);
    });

    it('applies sequential migrations v0→v1→v2', async () => {
      const fs = new InMemoryFileSystem();
      await fs.writeFile('/state.yml', 'test');

      const v2Migration: Migration = {
        fromVersion: 1,
        toVersion: 2,
        migrate(state) {
          return { ...state, schema_version: 2, new_field: 'added' };
        },
      };

      const runner = createRunner([v1Migration, v2Migration], fs);

      const result = await runner.migrate('/state.yml', {}, 0);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.schema_version).toBe(2);
        expect(result.value.new_field).toBe('added');
      }
    });

    it('returns error when migration throws', async () => {
      const fs = new InMemoryFileSystem();
      await fs.writeFile('/state.yml', 'test');

      const failingMigration: Migration = {
        fromVersion: 0,
        toVersion: 1,
        migrate() {
          throw new Error('Migration failed');
        },
      };

      const runner = createRunner([failingMigration], fs);

      const result = await runner.migrate('/state.yml', {}, 0);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_VALIDATION');
      }
    });

    it('returns error when migration chain is incomplete', async () => {
      const fs = new InMemoryFileSystem();
      await fs.writeFile('/state.yml', 'test');

      const gapMigration: Migration = {
        fromVersion: 2,
        toVersion: 3,
        migrate(state) {
          return { ...state, schema_version: 3 };
        },
      };

      const runner = createRunner([v1Migration, gapMigration], fs);

      const result = await runner.migrate('/state.yml', {}, 0);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_VALIDATION');
        expect(result.error.issues).toHaveLength(1);
        expect(String(result.error.issues[0])).toContain('incomplete');
      }
    });
  });
});
