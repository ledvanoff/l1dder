import { describe, it, expect, vi, afterEach } from 'vitest';
import { InMemoryFileSystem, FixedClock, NullLogger } from '@l1dder/core/testing';

import { runCli } from '../program.js';
import { ExitCode } from './exit-codes.js';
import { createColorPalette } from './colors.js';
import { createFormatter } from './formatter.js';
import type { CommandResult } from './formatter.js';

const NOW = '2026-01-15T10:00:00Z';

function makeStateYml(): string {
  return `schema_version: 2
project:
  name: "quiet-test"
  stage: delivery
  stage_history: []
  created_at: "${NOW}"
  updated_at: "${NOW}"
workflow:
  current_phase: implement
  current_status: in_progress
  mode: main
  profile: null
  iteration: 1
  phase_history: []
  gate_history: []
discovery:
  milestones: []
  current: null
  waivers: []
tasks:
  items: []
quick_tasks: []
knowledge_updates: []
decisions: []
`;
}

async function withProjectFs(): Promise<InMemoryFileSystem> {
  const fs = new InMemoryFileSystem();
  await fs.mkdir('/proj/.l1dder');
  await fs.writeFile('/proj/.l1dder/state.yml', makeStateYml());
  await fs.writeFile(
    '/proj/.l1dder/config.yml',
    'role_mode: solo\nenforcement: open\n',
  );
  return fs;
}

function captureStream(stream: NodeJS.WriteStream): {
  read: () => string;
  restore: () => void;
} {
  let out = '';
  const spy = vi.spyOn(stream, 'write').mockImplementation((chunk) => {
    out += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString();
    return true;
  });
  return {
    read: () => out,
    restore: () => {
      spy.mockRestore();
    },
  };
}

describe('--quiet human output (DF-030)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('HumanFormatter prints only quietSummary when quiet', () => {
    const colors = createColorPalette(false);
    const fmt = createFormatter('human', colors, { quiet: true });
    const cap = captureStream(process.stdout);

    const result: CommandResult = {
      command: 'status',
      data: { ok: true },
      humanText: '\n───────── L1DDER Status ─────────\n  banner\n',
      quietSummary: 'implement → l1dder task complete T-01',
    };
    fmt.render(result);
    const out = cap.read();
    cap.restore();

    expect(out.trim()).toBe('implement → l1dder task complete T-01');
    expect(out).not.toContain('L1DDER Status');
  });

  it('given status -q, expect one summary line and no banner', async () => {
    const fs = await withProjectFs();
    const cap = captureStream(process.stdout);

    const code = await runCli(
      ['node', 'l1dder', 'status', '-q', '--cwd', '/proj', '--no-recover'],
      { fs, clock: new FixedClock(NOW), logger: new NullLogger() },
    );
    const stdout = cap.read();
    cap.restore();

    expect(code).toBe(ExitCode.SUCCESS);
    const lines = stdout.trim().split('\n').filter((l) => l.length > 0);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^implement → /);
    expect(stdout).not.toContain('L1DDER Status');
    expect(stdout).not.toContain('In-flight');
  });

  it('given status -q --json, expect full JSON envelope', async () => {
    const fs = await withProjectFs();
    const cap = captureStream(process.stdout);

    const code = await runCli(
      [
        'node',
        'l1dder',
        'status',
        '-q',
        '--json',
        '--cwd',
        '/proj',
        '--no-recover',
      ],
      { fs, clock: new FixedClock(NOW), logger: new NullLogger() },
    );
    const stdout = cap.read();
    cap.restore();

    expect(code).toBe(ExitCode.SUCCESS);
    const parsed = JSON.parse(stdout) as {
      ok: boolean;
      command: string;
      data: { workflow: { phase: string }; primary_action: { kind: string } };
    };
    expect(parsed.ok).toBe(true);
    expect(parsed.command).toBe('status');
    expect(parsed.data.workflow.phase).toBe('implement');
    expect(parsed.data.primary_action.kind.length).toBeGreaterThan(0);
  });

  it('given error with -q, expect error message and same exit code', async () => {
    const fs = new InMemoryFileSystem();
    const cap = captureStream(process.stderr);

    const code = await runCli(
      ['node', 'l1dder', 'status', '-q', '--cwd', '/empty', '--no-recover'],
      { fs, clock: new FixedClock(NOW), logger: new NullLogger() },
    );
    const stderr = cap.read();
    cap.restore();

    expect(code).toBe(ExitCode.NOT_INITIALIZED);
    expect(stderr.length).toBeGreaterThan(0);
  });
});
