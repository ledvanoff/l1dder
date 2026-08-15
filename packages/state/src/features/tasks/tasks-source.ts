/**
 * Where a project keeps its `tasks.md`.
 *
 * Single source of truth for both sides of the task lifecycle: `l1dder task *`
 * resolves the document to read, and the implementation gate resolves the
 * documents that must not be ignored. Keeping one resolver is what makes the
 * gate fail-closed — checking only the default location let a project with a
 * tasks file elsewhere walk straight through it (DEBT-005).
 */

import type { FileSystemPort } from '@l1dder/core';
import type { State } from '@l1dder/schemas';
import { join } from 'node:path';

/** Conventional location of the feature task list. */
export const DEFAULT_TASKS_RELATIVE_PATH = 'specs/current/tasks.md';

/** Directory holding one sub-directory per feature spec. */
const SPECS_DIR = 'specs';

/** File name of a task list inside a spec directory. */
const TASKS_FILE = 'tasks.md';

/**
 * Task-document locations the state itself points at, most specific first.
 *
 * Never touches the filesystem: these are declarations, not discoveries.
 *
 * @param state - Current project state
 * @returns Ordered, de-duplicated project-relative paths
 */
export function declaredTaskSources(state: State): readonly string[] {
  const candidates = [
    state.tasks.source_path,
    state.tasks.current_feature === undefined
      ? undefined
      : `${SPECS_DIR}/${state.tasks.current_feature}/${TASKS_FILE}`,
    DEFAULT_TASKS_RELATIVE_PATH,
  ];

  return [...new Set(candidates.filter((path): path is string => path !== undefined))];
}

/**
 * Task documents that exist on disk for this project.
 *
 * Checks the declared locations first, then any `specs/<feature>/tasks.md`, so
 * a project that never ran `task sync` is still recognised as having tasks.
 * Unreadable or missing directories are treated as "nothing there" — discovery
 * must not turn into an error path for the gate.
 *
 * @param fs - Filesystem port
 * @param projectRoot - Absolute project root
 * @param state - Current project state
 * @returns Existing project-relative task-document paths
 */
export async function findTaskDocuments(
  fs: FileSystemPort,
  projectRoot: string,
  state: State,
): Promise<readonly string[]> {
  const found: string[] = [];
  const seen = new Set<string>();

  const consider = async (relativePath: string): Promise<void> => {
    if (seen.has(relativePath)) return;
    seen.add(relativePath);
    try {
      if (await fs.exists(join(projectRoot, relativePath))) {
        found.push(relativePath);
      }
    } catch {
      // Treated as absent.
    }
  };

  for (const declared of declaredTaskSources(state)) {
    await consider(declared);
  }

  for (const feature of await listSpecDirectories(fs, projectRoot)) {
    await consider(`${SPECS_DIR}/${feature}/${TASKS_FILE}`);
  }

  return found;
}

/**
 * List entries under `specs/`, tolerating a missing or unreadable directory.
 *
 * @param fs - Filesystem port
 * @param projectRoot - Absolute project root
 * @returns Sorted entry names (may include files, filtered by the caller's probe)
 */
async function listSpecDirectories(
  fs: FileSystemPort,
  projectRoot: string,
): Promise<readonly string[]> {
  const specsRoot = join(projectRoot, SPECS_DIR);
  try {
    if (!(await fs.exists(specsRoot))) return [];
    return [...(await fs.readDir(specsRoot))].sort();
  } catch {
    return [];
  }
}
