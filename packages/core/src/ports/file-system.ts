/**
 * Port for file system operations.
 *
 * All paths are relative to the project root unless absolute.
 * Implementations: real FS (production), InMemoryFileSystem (testing).
 */
export interface FileSystemPort {
  /** Read file contents as UTF-8 string. */
  readFile(path: string): Promise<string>;

  /** Write UTF-8 string to file, creating parent directories if needed. */
  writeFile(path: string, content: string): Promise<void>;

  /** Atomically rename a file (used for write-ahead pattern). */
  rename(from: string, to: string): Promise<void>;

  /** Check whether a file or directory exists. */
  exists(path: string): Promise<boolean>;

  /** Return file metadata (size, mtime). */
  stat(path: string): Promise<FileStat>;

  /** Create directory and all parents (like `mkdir -p`). */
  mkdir(path: string): Promise<void>;

  /** Delete a file. Throws if the file does not exist. */
  deleteFile(path: string): Promise<void>;

  /** List entries in a directory. */
  readDir(path: string): Promise<readonly string[]>;

  /**
   * Delete an empty directory.
   *
   * Safe by design: never throws — a missing directory or a directory that
   * still contains entries is treated as a no-op rather than an error. This
   * lets callers (e.g. `sync --prune` empty-dir cleanup) walk up a parent
   * chain and call `removeDir` unconditionally without pre-checking
   * existence, while non-empty directories are never accidentally deleted.
   */
  removeDir(path: string): Promise<void>;
}

/** Minimal file metadata returned by `stat()`. */
export interface FileStat {
  readonly size: number;
  readonly mtimeMs: number;
  readonly isFile: boolean;
  readonly isDirectory: boolean;
}
