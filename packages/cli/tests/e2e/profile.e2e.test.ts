import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

/**
 * Profile install behavior must be verified against the BUILT CLI: bundled
 * assets resolve relative to the compiled bundle (dist/assets), which only
 * exists after a build. These tests build the cli package once, then spawn the
 * real `dist/cli.js` so the starter-skills delivery is exercised end to end.
 */

const cliRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cliEntry = join(cliRoot, 'dist', 'cli.js');

let testDir: string;

/** Run the built CLI in `testDir`; returns exit code (0 on success). */
function runBuiltCli(args: string[]): number {
  try {
    execFileSync(
      'node',
      [cliEntry, '--cwd', testDir, '--no-prompt', '--no-color', ...args],
      { stdio: 'pipe' },
    );
    return 0;
  } catch (e) {
    return (e as { status?: number }).status ?? 1;
  }
}

const STARTER_SKILLS = [
  'tdd-workflow.md',
  'security-review.md',
  'e2e-testing.md',
  'error-handling.md',
  'code-tour.md',
  'debugging-systematic.md',
];

describe('E2E: init install profile (built CLI)', () => {
  beforeAll(() => {
    // Rebuild so dist/cli.js and dist/assets/skills/starter reflect the source.
    execFileSync('pnpm', ['build'], { cwd: cliRoot, stdio: 'pipe' });
    expect(existsSync(cliEntry)).toBe(true);
  }, 180_000);

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'l1dder-e2e-profile-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('default init delivers the process core without engineering starter skills', () => {
    const code = runBuiltCli(['init', '--name', 'default-proj']);
    expect(code).toBe(0);

    // process-core skill present, engineering starter skills absent
    expect(existsSync(join(testDir, 'skills', 'built-in', 'specify-feature.md'))).toBe(true);
    for (const skill of STARTER_SKILLS) {
      expect(existsSync(join(testDir, 'skills', 'built-in', skill))).toBe(false);
    }
  });

  it('init --profile engineering delivers the 6 starter skills into skills/built-in', () => {
    const code = runBuiltCli(['init', '--name', 'eng-proj', '--profile', 'engineering']);
    expect(code).toBe(0);

    for (const skill of STARTER_SKILLS) {
      expect(existsSync(join(testDir, 'skills', 'built-in', skill))).toBe(true);
    }
  });

  it('init --profile unknown rejects with a usage error (exit 2)', () => {
    const code = runBuiltCli(['init', '--name', 'bad-profile', '--profile', 'bogus']);
    expect(code).toBe(2);
  });
});
