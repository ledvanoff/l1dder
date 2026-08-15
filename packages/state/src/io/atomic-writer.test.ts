import { describe, expect, it } from 'vitest';
import { InMemoryFileSystem, NullLogger } from '@l1dder/core/testing';

import { AtomicWriter } from './atomic-writer.js';

function createWriter(fs?: InMemoryFileSystem) {
  const fileSystem = fs ?? new InMemoryFileSystem();
  const writer = new AtomicWriter({ fs: fileSystem, logger: new NullLogger() });
  return { writer, fs: fileSystem };
}

describe('AtomicWriter', () => {
  describe('write', () => {
    it('writes file atomically via .next rename', async () => {
      const { writer, fs } = createWriter();

      const result = await writer.write('/project/.l1dder/state.yml', 'data: 1');

      expect(result.ok).toBe(true);
      const content = await fs.readFile('/project/.l1dder/state.yml');
      expect(content).toBe('data: 1');
      await expect(fs.exists('/project/.l1dder/state.yml.next')).resolves.toBe(
        false,
      );
    });

    it('returns CorruptedStateError when rename fails', async () => {
      const fs = new InMemoryFileSystem();
      const originalRename = fs.rename.bind(fs);
      let callCount = 0;
      fs.rename = (from: string, to: string) => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('rename failed'));
        }
        return originalRename(from, to);
      };

      const writer = new AtomicWriter({ fs, logger: new NullLogger() });
      const result = await writer.write('/state.yml', 'data: 1');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('CORRUPTED_STATE');
        expect(result.error.message).toContain('rename');
      }
    });

    it('cleans up .next file when rename fails', async () => {
      const fs = new InMemoryFileSystem();
      fs.rename = () => {
        return Promise.reject(new Error('rename failed'));
      };

      const writer = new AtomicWriter({ fs, logger: new NullLogger() });
      await writer.write('/state.yml', 'data: 1');

      await expect(fs.exists('/state.yml.next')).resolves.toBe(false);
    });

    it('returns CorruptedStateError when writeFile fails', async () => {
      const fs = new InMemoryFileSystem();
      fs.writeFile = () => {
        return Promise.reject(new Error('disk full'));
      };

      const writer = new AtomicWriter({ fs, logger: new NullLogger() });
      const result = await writer.write('/state.yml', 'data: 1');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('CORRUPTED_STATE');
        expect(result.error.message).toContain('disk full');
      }
    });

    it('serializes concurrent writes so .next rename cannot race itself', async () => {
      const { writer, fs } = createWriter();
      const originalWrite = fs.writeFile.bind(fs);
      let inFlightWrites = 0;
      let maxInFlight = 0;

      fs.writeFile = async (path: string, content: string) => {
        inFlightWrites += 1;
        maxInFlight = Math.max(maxInFlight, inFlightWrites);
        await new Promise((r) => setTimeout(r, 5));
        await originalWrite(path, content);
        inFlightWrites -= 1;
      };

      const results = await Promise.all([
        writer.write('/state.yml', 'data: 1'),
        writer.write('/state.yml', 'data: 2'),
        writer.write('/state.yml', 'data: 3'),
      ]);

      expect(results.every((r) => r.ok)).toBe(true);
      expect(maxInFlight).toBe(1);
      await expect(fs.exists('/state.yml.next')).resolves.toBe(false);
      const content = await fs.readFile('/state.yml');
      expect(content).toBe('data: 3');
    });
  });

  describe('cleanupOrphaned', () => {
    it('detects and cleans orphaned .next files', async () => {
      const { writer, fs } = createWriter();
      await fs.writeFile('/dir/state.yml', 'ok');
      await fs.writeFile('/dir/state.yml.next', 'orphaned');

      const result = await writer.cleanupOrphaned('/dir');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(['state.yml.next']);
      }
      await expect(fs.exists('/dir/state.yml.next')).resolves.toBe(false);
    });

    it('returns empty list when no orphaned files', async () => {
      const { writer, fs } = createWriter();
      await fs.writeFile('/dir/state.yml', 'ok');

      const result = await writer.cleanupOrphaned('/dir');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });

    it('returns CorruptedStateError when readDir fails', async () => {
      const fs = new InMemoryFileSystem();
      fs.readDir = () => {
        return Promise.reject(new Error('permission denied'));
      };

      const writer = new AtomicWriter({ fs, logger: new NullLogger() });
      const result = await writer.cleanupOrphaned('/dir');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('CORRUPTED_STATE');
      }
    });
  });
});
