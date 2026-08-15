import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { runCli } from '../../src/index.js';
import type { CliContextOverrides } from '../../src/cli/context.js';

let testDir: string;

function createOverrides(): CliContextOverrides {
  return {
    prompt: {
      confirm: () => Promise.resolve(true),
      input: () => Promise.resolve('test-project'),
      select: <T extends string>(_m: string, choices: readonly { value: T }[]) =>
        Promise.resolve(choices[0]?.value ?? ('en' as T)),
    },
  };
}

function capturedRunCli(args: string[], overrides?: CliContextOverrides): Promise<number> {
  const baseArgs = ['node', 'l1dder', '--cwd', testDir, '--no-prompt', '--no-color'];
  return runCli([...baseArgs, ...args], overrides);
}

/**
 * Run the CLI while capturing everything written to stdout/stderr, and return
 * the parsed JSON envelope produced by `JsonFormatter`
 * (`{ ok, command, data }` on success, `{ ok: false, error }` on failure).
 *
 * `--json` always emits exactly one `process.stdout.write`/`process.stderr.write`
 * call for the command envelope, so we pick the line starting with `{"ok":`.
 */
async function runCliJson(
  args: string[],
  overrides?: CliContextOverrides,
): Promise<{
  exitCode: number;
  body: { ok: boolean; command?: string; data?: unknown; error?: { code: string; message: string } } | undefined;
}> {
  const chunks: string[] = [];
  const capture = (chunk: string | Uint8Array): boolean => {
    chunks.push(String(chunk));
    return true;
  };
  const outSpy = vi.spyOn(process.stdout, 'write').mockImplementation(capture);
  const errSpy = vi.spyOn(process.stderr, 'write').mockImplementation(capture);

  let exitCode: number;
  try {
    exitCode = await capturedRunCli([...args, '--json'], overrides);
  } finally {
    outSpy.mockRestore();
    errSpy.mockRestore();
  }

  const jsonLine = chunks.find((c) => c.trimStart().startsWith('{"ok":'));
  const body = jsonLine
    ? (JSON.parse(jsonLine) as { ok: boolean; command?: string; data?: unknown; error?: { code: string; message: string } })
    : undefined;
  return { exitCode, body };
}

describe('E2E: Hygiene Sessions (doctor --deep, HYGIENE transitions, sync --prune)', () => {
  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'l1dder-e2e-hygiene-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('doctor --deep', () => {
    it('includes skills/ide sections in --json output, even when checks report issues', async () => {
      const overrides = createOverrides();
      await capturedRunCli(['init', '--name', 'hyg-deep'], overrides);

      const { exitCode, body } = await runCliJson(['doctor', '--deep'], overrides);
      // A freshly-initialized project realistically has doctor findings
      // (e.g. empty knowledge docs) — GENERIC_ERROR (1) is expected, not a crash.
      expect(exitCode).toBeLessThanOrEqual(1);
      // Regression guard (T-13 finding): `renderResult` used to render nothing
      // at all — neither human text nor JSON — whenever a command returned a
      // non-zero exit code without an explicit `error` (e.g. doctor/check
      // reporting failed checks). The envelope must always be present.
      expect(body).toBeDefined();

      const data = body?.data as { sections: Array<{ id: string }> } | undefined;
      const sectionIds = data?.sections.map((s) => s.id) ?? [];
      expect(sectionIds).toContain('skills');
      expect(sectionIds).toContain('ide');
      expect(sectionIds).toContain('knowledge');
      expect(sectionIds).toContain('drift');
    });

    it('without --deep, skills/ide sections are absent from the default sweep', async () => {
      const overrides = createOverrides();
      await capturedRunCli(['init', '--name', 'hyg-shallow'], overrides);

      const { body } = await runCliJson(['doctor'], overrides);
      const data = body?.data as { sections: Array<{ id: string }> } | undefined;
      const sectionIds = data?.sections.map((s) => s.id) ?? [];
      expect(sectionIds).not.toContain('ide');
      expect(sectionIds).not.toContain('skills');
    });
  });

  describe('doctor --section', () => {
    it('--section ide returns only the ide section', async () => {
      const overrides = createOverrides();
      await capturedRunCli(['init', '--name', 'hyg-section-ide'], overrides);

      const { exitCode, body } = await runCliJson(['doctor', '--section', 'ide'], overrides);
      expect(exitCode).toBeLessThanOrEqual(1);
      expect(body).toBeDefined();

      const data = body?.data as { sections: Array<{ id: string }> } | undefined;
      expect(data?.sections.map((s) => s.id)).toEqual(['ide']);
    });

    it('--section skills returns only the skills section', async () => {
      const overrides = createOverrides();
      await capturedRunCli(['init', '--name', 'hyg-section-skills'], overrides);

      const { exitCode, body } = await runCliJson(['doctor', '--section', 'skills'], overrides);
      expect(exitCode).toBeLessThanOrEqual(1);
      expect(body).toBeDefined();

      const data = body?.data as { sections: Array<{ id: string }> } | undefined;
      expect(data?.sections.map((s) => s.id)).toEqual(['skills']);
    });
  });

  describe('HYGIENE phase transitions', () => {
    it('idle -> hygiene -> idle succeeds without a gate', async () => {
      const overrides = createOverrides();
      await capturedRunCli(['init', '--name', 'hyg-transition'], overrides);

      const toHygiene = await capturedRunCli(['transition', '--to', 'hygiene'], overrides);
      expect(toHygiene).toBe(0);

      const state = readFileSync(join(testDir, '.l1dder', 'state.yml'), 'utf-8');
      expect(state).toContain('current_phase: hygiene');

      const backToIdle = await capturedRunCli(['transition', '--to', 'idle'], overrides);
      expect(backToIdle).toBe(0);
    });

    it('rejects a forbidden transition into hygiene from a non-whitelisted phase', async () => {
      const overrides = createOverrides();
      await capturedRunCli(['init', '--name', 'hyg-forbidden'], overrides);

      // DF-015 blocks idle→specify while idea is pending; force into specify
      // so we can assert the hygiene whitelist rejection from that phase.
      const toSpecify = await capturedRunCli(
        ['transition', '--to', 'specify', '--force', '--reason', 'e2e setup'],
        overrides,
      );
      expect(toSpecify).toBe(0);

      const code = await capturedRunCli(['transition', '--to', 'hygiene'], overrides);
      expect(code).toBe(3); // FORBIDDEN_TRANSITION
    });
  });

  describe('sync --prune orphan detection (full CLI, dry-run)', () => {
    // Real (non-dry-run) prune deletes are covered in
    // `install-runner.real-fs.test.ts` (T-13). This path exercises dry-run
    // orphan reporting through the real CLI after init's default cursor sync.
    it('reports a stale install-state entry as orphaned without touching disk', async () => {
      const overrides = createOverrides();
      await capturedRunCli(['init', '--name', 'hyg-prune'], overrides);

      // Init defaults to --ai cursor and writes install-state. Inject a stale
      // skill entry that will never appear in this project's transform output.
      const installStatePath = join(testDir, '.l1dder', 'install-state.yml');
      const existing = readFileSync(installStatePath, 'utf-8');
      const orphanEntry = [
        '    - path: .cursor/skills-l1dder/deleted-skill/SKILL.md',
        '      hash: aaaaaaaaaaaa',
        '      source: built-in',
        '      profile: null',
        '      target: cursor',
        '      timestamp: 2026-01-01T00:00:00.000Z',
        '',
      ].join('\n');
      writeFileSync(installStatePath, `${existing.trimEnd()}\n${orphanEntry}`);

      const orphanPath = join(
        testDir,
        '.cursor',
        'skills-l1dder',
        'deleted-skill',
        'SKILL.md',
      );
      expect(existsSync(orphanPath)).toBe(false);

      const { exitCode, body } = await runCliJson(['sync', '--dry-run', '--prune'], overrides);
      expect(exitCode).toBe(0);

      const data = body?.data as { orphaned: string[]; pruned: string[] } | undefined;
      expect(data?.orphaned).toContain('.cursor/skills-l1dder/deleted-skill/SKILL.md');
      // Dry-run never mutates state or disk.
      expect(data?.pruned).toHaveLength(0);
      expect(existsSync(join(testDir, '.cursor'))).toBe(true);
      expect(existsSync(orphanPath)).toBe(false);
    });
  });
});
