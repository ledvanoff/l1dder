import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { createNodeFs } from './node-fs.js';

/**
 * Real-disk coverage for the production `FileSystemPort` (T-13). Unit tests
 * elsewhere (`install-runner.test.ts`) already cover `sync --prune`'s
 * empty-parent-dir cleanup logic thoroughly against `InMemoryFileSystem`;
 * this suite validates that the actual `node:fs/promises`-backed
 * implementation behaves the same way against real directories/files.
 */
describe('createNodeFs — production FileSystemPort (real disk)', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'l1dder-node-fs-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  describe('removeDir', () => {
    it('removes an existing empty directory', async () => {
      const fs = createNodeFs();
      const dir = join(root, 'empty-dir');
      mkdirSync(dir);

      await fs.removeDir(dir);

      expect(existsSync(dir)).toBe(false);
    });

    it('silently no-ops when the directory does not exist (ENOENT)', async () => {
      const fs = createNodeFs();
      const dir = join(root, 'never-existed');

      await expect(fs.removeDir(dir)).resolves.toBeUndefined();
    });

    it('silently no-ops when the directory still has entries (ENOTEMPTY)', async () => {
      const fs = createNodeFs();
      const dir = join(root, 'non-empty-dir');
      mkdirSync(dir);
      writeFileSync(join(dir, 'keep.txt'), 'still here');

      await expect(fs.removeDir(dir)).resolves.toBeUndefined();
      expect(existsSync(dir)).toBe(true);
      expect(existsSync(join(dir, 'keep.txt'))).toBe(true);
    });

    it('silently no-ops when the path is a file, not a directory (ENOTDIR)', async () => {
      const fs = createNodeFs();
      const filePath = join(root, 'a-file.txt');
      writeFileSync(filePath, 'not a dir');

      await expect(fs.removeDir(filePath)).resolves.toBeUndefined();
      expect(existsSync(filePath)).toBe(true);
    });

    it('supports the sync --prune walk-up-and-remove pattern against nested real directories', async () => {
      const fs = createNodeFs();
      const skillDir = join(root, 'skills-l1dder', 'orphan-skill');
      mkdirSync(skillDir, { recursive: true });
      const filePath = join(skillDir, 'SKILL.md');
      writeFileSync(filePath, '# stale');

      // Mirrors `removeEmptyParentDirs` in install-runner.ts: delete the file,
      // then climb removing now-empty ancestors, stopping at a non-empty one.
      const fsP = await import('node:fs/promises');
      await fsP.unlink(filePath);
      await fs.removeDir(skillDir);
      await fs.removeDir(join(root, 'skills-l1dder'));

      expect(existsSync(skillDir)).toBe(false);
      expect(existsSync(join(root, 'skills-l1dder'))).toBe(false);
      expect(existsSync(root)).toBe(true);
    });
  });

  describe('other FileSystemPort operations (sanity, real disk)', () => {
    it('writeFile creates missing parent directories, readFile round-trips content', async () => {
      const fs = createNodeFs();
      const filePath = join(root, 'nested', 'dir', 'file.txt');

      await fs.writeFile(filePath, 'hello world');

      expect(await fs.readFile(filePath)).toBe('hello world');
    });

    it('exists reflects real filesystem state', async () => {
      const fs = createNodeFs();
      const filePath = join(root, 'present.txt');
      writeFileSync(filePath, 'x');

      expect(await fs.exists(filePath)).toBe(true);
      expect(await fs.exists(join(root, 'absent.txt'))).toBe(false);
    });

    it('readDir lists real directory entries', async () => {
      const fs = createNodeFs();
      writeFileSync(join(root, 'a.txt'), 'a');
      writeFileSync(join(root, 'b.txt'), 'b');

      const entries = await fs.readDir(root);

      expect([...entries].sort()).toEqual(['a.txt', 'b.txt']);
    });
  });
});
