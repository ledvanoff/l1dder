import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parse } from 'yaml';

import { DISCOVERY_MILESTONE_ORDER } from '@l1dder/core';
import { cliEntry, ensureBuiltCli } from './built-cli.js';
import { StateSchema } from '@l1dder/schemas';

/**
 * Built-CLI e2e: profile install + init asset delivery.
 *
 * Bundled assets resolve relative to the compiled bundle (`dist/assets`),
 * which only exists after a build. The bundle is built once per run (shared with
 * the other built-CLI specs), then this file spawns the real `dist/cli.js` so
 * starter-skills delivery and the localized roadmap scaffold are exercised end
 * to end.
 */

/** Run the built CLI in `cwd`; returns exit code (0 on success). */
function runBuiltCli(cwd: string, args: string[]): number {
  try {
    execFileSync(
      'node',
      [cliEntry, '--cwd', cwd, '--no-prompt', '--no-color', ...args],
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

beforeAll(() => {
  // One build shared by every e2e file; parallel workers wait instead of
  // cleaning dist under each other (see ./built-cli.ts).
  ensureBuiltCli();
}, 300_000);

describe('E2E: init install profile (built CLI)', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'l1dder-e2e-profile-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('default init delivers the process core without engineering starter skills', () => {
    const code = runBuiltCli(testDir, ['init', '--name', 'default-proj']);
    expect(code).toBe(0);

    // process-core skill present, engineering starter skills absent
    expect(existsSync(join(testDir, 'skills', 'built-in', 'specify-feature.md'))).toBe(true);
    for (const skill of STARTER_SKILLS) {
      expect(existsSync(join(testDir, 'skills', 'built-in', skill))).toBe(false);
    }
  });

  it('init --profile engineering delivers the 6 starter skills into skills/built-in', () => {
    const code = runBuiltCli(testDir, ['init', '--name', 'eng-proj', '--profile', 'engineering']);
    expect(code).toBe(0);

    for (const skill of STARTER_SKILLS) {
      expect(existsSync(join(testDir, 'skills', 'built-in', skill))).toBe(true);
    }
  });

  it('init --profile unknown rejects with a usage error (exit 2)', () => {
    const code = runBuiltCli(testDir, ['init', '--name', 'bad-profile', '--profile', 'bogus']);
    expect(code).toBe(2);
  });
});

describe('E2E: init roadmap scaffold + discovery milestones (built CLI)', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'l1dder-e2e-scaffold-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('init writes full roadmap scaffold and initializes 7 discovery milestones', () => {
    const code = runBuiltCli(testDir, ['init', '--name', 'scaffold-proj']);
    expect(code).toBe(0);

    const roadmapPath = join(testDir, 'knowledge', 'roadmap.md');
    expect(existsSync(roadmapPath)).toBe(true);
    const roadmap = readFileSync(roadmapPath, 'utf-8');
    expect(roadmap).toContain('scaffold-proj');
    expect(roadmap).toContain('## Discovery Control Plane');
    expect(roadmap).toContain('## MVP Feature Map');
    expect(roadmap).toContain('## Delivery Plan');
    expect(roadmap).toContain('## Technical Debt');
    expect(roadmap).toContain('## Long-term Backlog');
    expect(roadmap).not.toContain('{{');

    const stateRaw = readFileSync(join(testDir, '.l1dder', 'state.yml'), 'utf-8');
    const state = StateSchema.parse(parse(stateRaw));
    expect(state.discovery.current).toBe('idea');
    expect(state.discovery.milestones).toHaveLength(7);
    expect(state.discovery.milestones.map((m) => m.id)).toEqual([
      ...DISCOVERY_MILESTONE_ORDER,
    ]);
  });
});
