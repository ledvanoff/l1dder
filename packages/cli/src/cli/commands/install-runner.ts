import { dirname, join } from 'node:path';

import type {
  AIIdeAdapter,
  AdapterContext,
  ClockPort,
  FileSystemPort,
  InstallPlan,
  LoggerPort,
  TransformedInstallFile,
} from '@l1dder/core';
import { planInstall } from '@l1dder/core';
import { AtomicWriter } from '@l1dder/adapter-cursor';
import type { InstallState, InstallStateEntry } from '@l1dder/schemas';
import {
  AtomicWriter as StateAtomicWriter,
  InstallStateReader,
  InstallStateWriter,
} from '@l1dder/state';

/** Options for a single-target install run. */
export interface RunInstallOptions {
  readonly projectRoot: string;
  readonly targetId: string;
  readonly adapter: AIIdeAdapter;
  readonly adapterCtx: AdapterContext;
  readonly force: boolean;
  readonly dryRun: boolean;
  readonly prune: boolean;
  readonly profile?: string | null;
}

/** Per-target install outcome returned to sync/init. */
export interface TargetInstallResult {
  readonly targetId: string;
  readonly plan: InstallPlan;
  readonly created: readonly string[];
  readonly updated: readonly string[];
  readonly skipped: readonly string[];
  readonly pruned: readonly string[];
  readonly orphaned: readonly string[];
  readonly errors: readonly { path: string; message: string }[];
}

/** Dependencies for install I/O helpers. */
export interface InstallIoDeps {
  readonly fs: FileSystemPort;
  readonly logger: LoggerPort;
  readonly clock: ClockPort;
}

/**
 * Run transform → plan → apply for one adapter target.
 *
 * Updates `.l1dder/install-state.yml` on apply (non-dry-run).
 */
export async function runTargetInstall(
  deps: InstallIoDeps,
  options: RunInstallOptions,
): Promise<TargetInstallResult> {
  const { fs, logger, clock } = deps;
  const {
    projectRoot,
    targetId,
    adapter,
    adapterCtx,
    force,
    dryRun,
    prune,
    profile = null,
  } = options;

  const installStatePath = join(projectRoot, '.l1dder', 'install-state.yml');
  const stateAtomicWriter = new StateAtomicWriter({ fs, logger });
  const installReader = new InstallStateReader({ fs, logger });
  const installWriter = new InstallStateWriter({ atomicWriter: stateAtomicWriter, logger });

  const prevStateResult = await installReader.read(installStatePath);
  if (!prevStateResult.ok) {
    throw new Error(`Failed to read install-state: ${prevStateResult.error.message}`);
  }

  const transformed = await adapter.transformForInstall(adapterCtx);
  const plan = planInstall(transformed, prevStateResult.value, targetId);
  const transformedByPath = new Map(transformed.map((file) => [file.path, file]));
  const prevEntries = prevStateResult.value.targets[targetId] ?? [];
  const prevByPath = new Map(prevEntries.map((entry) => [entry.path, entry]));

  const created: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];
  const pruned: string[] = [];
  const orphaned: string[] = [];
  const errors: Array<{ path: string; message: string }> = [];
  const nextEntries: InstallStateEntry[] = [];

  const writer = new AtomicWriter(fs);

  for (const item of plan.items) {
    if (item.action === 'orphan') {
      orphaned.push(item.path);
      if (prune && !dryRun) {
        const absPath = join(projectRoot, item.path);
        try {
          if (await fs.exists(absPath)) {
            await fs.deleteFile(absPath);
            await removeEmptyParentDirs(fs, absPath, projectRoot);
          }
          pruned.push(item.path);
        } catch (cause: unknown) {
          errors.push({
            path: item.path,
            message: cause instanceof Error ? cause.message : String(cause),
          });
          const prev = prevByPath.get(item.path);
          if (prev) nextEntries.push(prev);
        }
      } else {
        const prev = prevByPath.get(item.path);
        if (prev) nextEntries.push(prev);
      }
      continue;
    }

    if (item.action === 'skip') {
      skipped.push(item.path);
      const prev = prevByPath.get(item.path);
      if (prev && !dryRun) nextEntries.push(prev);
      continue;
    }

    const file = transformedByPath.get(item.path);
    if (!file) continue;

    if (dryRun) {
      if (item.action === 'create') created.push(item.path);
      else updated.push(item.path);
      continue;
    }

    const writeReport = await writer.writeAll(
      [{ relativePath: file.path, content: file.content, hash: file.hash }],
      { projectRoot, force, dryRun: false },
    );

    created.push(...writeReport.created);
    updated.push(...writeReport.updated);
    skipped.push(...writeReport.skipped);
    errors.push(...writeReport.errors.map((e) => ({ path: e.path, message: e.error })));

    const managed =
      writeReport.created.includes(item.path) ||
      writeReport.updated.includes(item.path) ||
      (writeReport.skipped.includes(item.path) && prevByPath.has(item.path));

    if (managed) {
      nextEntries.push(buildInstallEntry(file, profile, clock.now()));
    } else if (writeReport.skipped.includes(item.path)) {
      const prev = prevByPath.get(item.path);
      if (prev) nextEntries.push(prev);
    }
  }

  if (!dryRun) {
    await fs.mkdir(join(projectRoot, '.l1dder'));
    const nextState: InstallState = {
      schema_version: 1,
      targets: {
        ...prevStateResult.value.targets,
        [targetId]: nextEntries,
      },
    };
    const writeResult = await installWriter.write(installStatePath, nextState);
    if (!writeResult.ok) {
      throw new Error(`Failed to write install-state: ${writeResult.error.message}`);
    }
  }

  return {
    targetId,
    plan,
    created,
    updated,
    skipped,
    pruned,
    orphaned,
    errors,
  };
}

/**
 * Walk up from a just-deleted file's parent directory, removing each
 * directory that is now empty (DEC-6-8, tech-debt from Iteration XH).
 *
 * Stops at the first non-empty directory or at `projectRoot` — never
 * deletes the project root itself or anything above it. Managed adapter
 * output roots (e.g. `.cursor/skills-l1dder`) are covered naturally: they
 * only get removed once every skill sub-directory under them is gone, and
 * climbing halts as soon as a sibling file/directory remains.
 */
async function removeEmptyParentDirs(
  fs: FileSystemPort,
  deletedFilePath: string,
  projectRoot: string,
): Promise<void> {
  let dir = dirname(deletedFilePath);
  while (dir !== projectRoot && dir.startsWith(projectRoot)) {
    let entries: readonly string[];
    try {
      entries = await fs.readDir(dir);
    } catch {
      break;
    }
    if (entries.length > 0) break;
    await fs.removeDir(dir);
    dir = dirname(dir);
  }
}

function buildInstallEntry(
  file: TransformedInstallFile,
  profile: string | null,
  timestamp: string,
): InstallStateEntry {
  return {
    path: file.path,
    hash: file.hash,
    source: file.source,
    profile,
    target: file.target,
    timestamp,
  };
}

/** Ensure `.l1dder` directory exists before writing install-state. */
export async function ensureL1dderDir(fs: FileSystemPort, projectRoot: string): Promise<void> {
  await fs.mkdir(join(projectRoot, '.l1dder'));
}
