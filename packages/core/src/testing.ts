/**
 * @l1dder/core/testing — test utilities and port mocks.
 *
 * Import as `import { FixedClock, InMemoryFileSystem, NullLogger } from '@l1dder/core/testing'`.
 *
 * @packageDocumentation
 */

import type { ClockPort } from './ports/clock.js';
import type { FileSystemPort, FileStat } from './ports/file-system.js';
import type { LoggerPort } from './ports/logger.js';

/**
 * Clock that always returns the same timestamp.
 *
 * Useful for deterministic tests where time must be predictable.
 */
export class FixedClock implements ClockPort {
  constructor(private readonly timestamp: string) {}

  now(): string {
    return this.timestamp;
  }
}

/** Internal representation of a file in InMemoryFileSystem. */
interface InMemoryFile {
  content: string;
  mtimeMs: number;
}

/**
 * In-memory file system for testing without touching real disk.
 *
 * Stores files in a Map. Supports nested paths via string keys.
 */
export class InMemoryFileSystem implements FileSystemPort {
  private readonly files = new Map<string, InMemoryFile>();
  private readonly dirs = new Set<string>();

  readFile(path: string): Promise<string> {
    const file = this.files.get(path);
    if (!file) {
      return Promise.reject(new Error(`ENOENT: no such file: ${path}`));
    }
    return Promise.resolve(file.content);
  }

  writeFile(path: string, content: string): Promise<void> {
    const segments = path.split('/');
    for (let i = 1; i < segments.length; i++) {
      this.dirs.add(segments.slice(0, i).join('/'));
    }
    this.files.set(path, { content, mtimeMs: Date.now() });
    return Promise.resolve();
  }

  rename(from: string, to: string): Promise<void> {
    const file = this.files.get(from);
    if (!file) {
      return Promise.reject(new Error(`ENOENT: no such file: ${from}`));
    }
    this.files.set(to, file);
    this.files.delete(from);
    return Promise.resolve();
  }

  exists(path: string): Promise<boolean> {
    return Promise.resolve(this.files.has(path) || this.dirs.has(path));
  }

  stat(path: string): Promise<FileStat> {
    const file = this.files.get(path);
    if (file) {
      return Promise.resolve({
        size: file.content.length,
        mtimeMs: file.mtimeMs,
        isFile: true,
        isDirectory: false,
      });
    }
    if (this.dirs.has(path)) {
      return Promise.resolve({ size: 0, mtimeMs: 0, isFile: false, isDirectory: true });
    }
    return Promise.reject(new Error(`ENOENT: no such file or directory: ${path}`));
  }

  mkdir(path: string): Promise<void> {
    this.dirs.add(path);
    return Promise.resolve();
  }

  deleteFile(path: string): Promise<void> {
    if (!this.files.has(path)) {
      return Promise.reject(new Error(`ENOENT: no such file: ${path}`));
    }
    this.files.delete(path);
    return Promise.resolve();
  }

  readDir(path: string): Promise<readonly string[]> {
    const prefix = path.endsWith('/') ? path : `${path}/`;
    const entries = new Set<string>();
    for (const key of this.files.keys()) {
      if (key.startsWith(prefix)) {
        const rest = key.slice(prefix.length);
        const firstSegment = rest.split('/')[0];
        if (firstSegment) {
          entries.add(firstSegment);
        }
      }
    }
    for (const dir of this.dirs) {
      if (dir.startsWith(prefix)) {
        const rest = dir.slice(prefix.length);
        const firstSegment = rest.split('/')[0];
        if (firstSegment) {
          entries.add(firstSegment);
        }
      }
    }
    return Promise.resolve([...entries].sort());
  }

  removeDir(path: string): Promise<void> {
    if (this.hasDescendants(path)) {
      return Promise.resolve();
    }
    this.dirs.delete(path);
    return Promise.resolve();
  }

  /** True when `path` has any file or subdirectory nested underneath it. */
  private hasDescendants(path: string): boolean {
    const prefix = path.endsWith('/') ? path : `${path}/`;
    for (const key of this.files.keys()) {
      if (key.startsWith(prefix)) return true;
    }
    for (const dir of this.dirs) {
      if (dir !== path && dir.startsWith(prefix)) return true;
    }
    return false;
  }
}

/**
 * Logger that silently discards all messages.
 *
 * Useful for tests where log output is irrelevant.
 */
export class NullLogger implements LoggerPort {
  debug(_message: string, _context?: Record<string, unknown>): void {
    /* no-op */
  }

  info(_message: string, _context?: Record<string, unknown>): void {
    /* no-op */
  }

  warn(_message: string, _context?: Record<string, unknown>): void {
    /* no-op */
  }

  error(_message: string, _context?: Record<string, unknown>): void {
    /* no-op */
  }
}
