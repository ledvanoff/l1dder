import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Shared access to the built CLI bundle for e2e specs.
 *
 * Several e2e files spawn `dist/cli.js`, and vitest runs files in parallel
 * workers. An unconditional `pnpm build` per file therefore cleans the output
 * folder while a sibling file is executing the bundle. The build is guarded by
 * an atomically created lock directory: the first worker builds, the others wait
 * for the bundle to appear.
 */

/** `packages/cli` root. */
export const cliRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

/** Absolute path of the built CLI entry. */
export const cliEntry = join(cliRoot, 'dist', 'cli.js');

/** Lock directory marking an in-progress build. */
const lockDir = join(cliRoot, 'dist.e2e-build-lock');

/** How long a waiting worker tolerates someone else's build. */
const BUILD_TIMEOUT_MS = 240_000;

/**
 * Block the current thread; test hooks are synchronous.
 *
 * @param ms - Milliseconds to sleep
 */
function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Build `dist/cli.js` once per test run, tolerating parallel workers.
 *
 * @returns Absolute path of the built CLI entry
 * @throws When the bundle is still missing after the build window
 */
export function ensureBuiltCli(): string {
  if (existsSync(cliEntry)) {
    return cliEntry;
  }

  let owned = false;
  try {
    mkdirSync(lockDir);
    owned = true;
  } catch {
    owned = false;
  }

  if (owned) {
    try {
      execFileSync('pnpm', ['build'], { cwd: cliRoot, stdio: 'pipe' });
    } finally {
      rmSync(lockDir, { recursive: true, force: true });
    }
  }

  const deadline = Date.now() + BUILD_TIMEOUT_MS;
  while (!existsSync(cliEntry) && Date.now() < deadline) {
    sleepSync(250);
  }

  if (!existsSync(cliEntry)) {
    throw new Error(
      `Built CLI not found at ${cliEntry}. Run \`pnpm build\` before the e2e suite.`,
    );
  }

  return cliEntry;
}
