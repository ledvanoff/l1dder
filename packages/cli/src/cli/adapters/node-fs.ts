import type { FileSystemPort } from '@l1dder/core';

/**
 * Production `FileSystemPort` implementation backed by `node:fs/promises`.
 *
 * Extracted from `program.ts` (T-13) so the real disk I/O behavior — in
 * particular `removeDir`'s ENOENT/ENOTEMPTY/ENOTDIR swallowing used by
 * `sync --prune`'s empty-parent-dir cleanup (DEC-6-8) — can be exercised
 * directly against a real filesystem in tests, not just via `InMemoryFileSystem`.
 */
export function createNodeFs(): FileSystemPort {
  return {
    readFile: async (path: string): Promise<string> => {
      const fsP = await import('node:fs/promises');
      return fsP.readFile(path, 'utf-8');
    },
    writeFile: async (path: string, content: string): Promise<void> => {
      const fsP = await import('node:fs/promises');
      const nodePath = await import('node:path');
      await fsP.mkdir(nodePath.dirname(path), { recursive: true });
      await fsP.writeFile(path, content, 'utf-8');
    },
    rename: async (from: string, to: string): Promise<void> => {
      const fsP = await import('node:fs/promises');
      await fsP.rename(from, to);
    },
    exists: async (path: string): Promise<boolean> => {
      const fsP = await import('node:fs/promises');
      try {
        await fsP.access(path);
        return true;
      } catch {
        return false;
      }
    },
    stat: async (path: string) => {
      const fsP = await import('node:fs/promises');
      const s = await fsP.stat(path);
      return { size: s.size, mtimeMs: s.mtimeMs, isFile: s.isFile(), isDirectory: s.isDirectory() };
    },
    mkdir: async (path: string): Promise<void> => {
      const fsP = await import('node:fs/promises');
      await fsP.mkdir(path, { recursive: true });
    },
    deleteFile: async (path: string): Promise<void> => {
      const fsP = await import('node:fs/promises');
      await fsP.unlink(path);
    },
    readDir: async (path: string): Promise<readonly string[]> => {
      const fsP = await import('node:fs/promises');
      return fsP.readdir(path);
    },
    removeDir: async (path: string): Promise<void> => {
      const fsP = await import('node:fs/promises');
      try {
        await fsP.rmdir(path);
      } catch (cause: unknown) {
        const code = (cause as NodeJS.ErrnoException).code;
        if (code === 'ENOENT' || code === 'ENOTEMPTY' || code === 'ENOTDIR') return;
        throw cause;
      }
    },
  };
}
