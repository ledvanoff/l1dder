/**
 * Shared filesystem walk helpers for package TypeScript indexers.
 *
 * Used by the symbol indexer (non-test sources) and the test-contract evidence
 * indexer (test/spec files only) so directory traversal is not duplicated.
 */

import type { FileSystemPort } from '@l1dder/core';
import { join } from 'node:path';

/** Which `.ts` files to collect while walking a package `src` tree. */
export type PackageTsWalkMode = 'source' | 'test';

/**
 * List immediate child directories of `packages/`.
 *
 * @param fs - Filesystem port
 * @param packagesRoot - Absolute `packages` directory
 * @returns Absolute package directory paths (sorted)
 */
export async function listPackageDirs(
  fs: FileSystemPort,
  packagesRoot: string,
): Promise<string[]> {
  if (!(await fs.exists(packagesRoot))) {
    return [];
  }
  let entries: readonly string[];
  try {
    entries = await fs.readDir(packagesRoot);
  } catch {
    return [];
  }

  const dirs: string[] = [];
  for (const entry of entries) {
    const full = join(packagesRoot, entry);
    try {
      const st = await fs.stat(full);
      if (st.isDirectory) {
        dirs.push(full);
      }
    } catch {
      // skip unreadable entries
    }
  }
  dirs.sort();
  return dirs;
}

/**
 * Recursively collect TypeScript files under `dir`.
 *
 * @param fs - Filesystem port
 * @param dir - Absolute directory to walk
 * @param mode - `source` skips tests/specs; `test` keeps only tests/specs
 * @returns Absolute file paths (sorted)
 */
export async function collectPackageTsFiles(
  fs: FileSystemPort,
  dir: string,
  mode: PackageTsWalkMode,
): Promise<string[]> {
  const out: string[] = [];
  let entries: readonly string[];
  try {
    entries = await fs.readDir(dir);
  } catch {
    return out;
  }

  for (const entry of [...entries].sort()) {
    const full = join(dir, entry);
    let st;
    try {
      st = await fs.stat(full);
    } catch {
      continue;
    }
    if (st.isDirectory) {
      const nested = await collectPackageTsFiles(fs, full, mode);
      out.push(...nested);
      continue;
    }
    if (!st.isFile) continue;
    if (!entry.endsWith('.ts')) continue;
    if (entry.endsWith('.d.ts')) continue;

    const isTest =
      entry.endsWith('.test.ts') || entry.endsWith('.spec.ts');
    if (mode === 'source' && isTest) continue;
    if (mode === 'test' && !isTest) continue;

    out.push(full);
  }

  out.sort();
  return out;
}

/**
 * Convert an absolute filesystem path to a repo-relative POSIX path.
 *
 * @param projectRoot - Absolute project root
 * @param absolutePath - Absolute file path
 * @returns Repo-relative POSIX path
 */
export function toPosixRelative(
  projectRoot: string,
  absolutePath: string,
): string {
  const root = projectRoot.replace(/\\/gu, '/').replace(/\/+$/u, '');
  const full = absolutePath.replace(/\\/gu, '/');
  if (full === root) return '';
  if (full.startsWith(`${root}/`)) {
    return full.slice(root.length + 1);
  }
  return full.replace(/^\//u, '');
}
