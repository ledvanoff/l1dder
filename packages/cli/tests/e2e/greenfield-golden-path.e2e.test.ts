import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parse } from 'yaml';

import { DISCOVERY_MILESTONE_ORDER } from '@l1dder/core';
import { StateSchema, type State } from '@l1dder/schemas';

import { ExitCode } from '../../src/cli/output/exit-codes.js';
import { cliEntry, ensureBuiltCli } from './built-cli.js';

/**
 * T-17 automated greenfield E2E: one project walks the whole golden path with
 * the built CLI — `init` → seven discovery milestones → `stage advance` →
 * delivery session on registry rails → task gate → session close → recovery.
 *
 * Steps share one project on purpose: the value of this file is that each step
 * is reachable from the previous one. Two dead ends found this way (a delivery
 * profile with no forward transition out of IDLE, and `registry sync --init`
 * leaving `registry check` red) are pinned by explicit assertions below.
 */

let projectDir: string;

/** Result of one CLI invocation. */
interface CliRun {
  readonly code: number;
  readonly stdout: string;
}

/** Run the built CLI in the shared project dir. */
function run(...args: string[]): CliRun {
  try {
    const stdout = execFileSync(
      'node',
      [
        cliEntry,
        '--cwd',
        projectDir,
        '--no-prompt',
        '--no-color',
        '--no-recover',
        ...args,
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return { code: 0, stdout };
  } catch (error) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? 1, stdout: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

/** Run with `--json` and parse the `data` payload. */
function runJson(...args: string[]): { code: number; data: Record<string, unknown> } {
  const result = run(...args, '--json');
  const parsed = JSON.parse(result.stdout) as {
    data?: Record<string, unknown>;
  };
  return { code: result.code, data: parsed.data ?? {} };
}

/** Raw `state.yml` bytes (for no-mutation assertions). */
function stateBytes(): string {
  return readFileSync(join(projectDir, '.l1dder', 'state.yml'), 'utf8');
}

/** Schema-validated state object. */
function state(): State {
  return StateSchema.parse(parse(stateBytes()));
}

/**
 * State without volatile fields, for "was not mutated" assertions.
 *
 * A rejected transition still rewrites `project.updated_at`: the crash-safety
 * marker is written before the pipeline validates the request and cleared right
 * after (see `TransitionExecutor.execute`). Semantic state must stay untouched.
 */
function stableState(): string {
  const current = state() as State & { project: { updated_at?: string } };
  return JSON.stringify({
    ...current,
    project: { ...current.project, updated_at: 'ignored' },
  });
}

/** Drive one discovery milestone through its full lifecycle. */
function closeMilestone(id: string): void {
  expect(run('discovery', 'start', id).code).toBe(ExitCode.SUCCESS);
  expect(
    run(
      'discovery',
      'plan',
      id,
      '--summary',
      `brainstorm for ${id}`,
      '--session',
      'AS-1',
    ).code,
  ).toBe(ExitCode.SUCCESS);
  expect(run('discovery', 'start', id).code).toBe(ExitCode.SUCCESS);
  expect(
    run('discovery', 'complete', id, '--evidence', 'knowledge/roadmap.md').code,
  ).toBe(ExitCode.SUCCESS);
}

beforeAll(() => {
  ensureBuiltCli();
  projectDir = mkdtempSync(join(tmpdir(), 'l1dder-e2e-golden-'));
}, 300_000);

afterAll(() => {
  rmSync(projectDir, { recursive: true, force: true });
});

describe('E2E: greenfield golden path (built CLI)', () => {
  it('init scaffolds a discovery project with all seven milestones pending', () => {
    expect(
      run('init', '--name', 'golden-path', '--ai', 'none', '--lang', 'en').code,
    ).toBe(ExitCode.SUCCESS);

    const current = state();
    expect(current.project.stage).toBe('discovery');
    expect(current.discovery.milestones.map((m) => m.id)).toEqual([
      ...DISCOVERY_MILESTONE_ORDER,
    ]);
    expect(
      current.discovery.milestones.every((m) => m.status === 'pending'),
    ).toBe(true);
    expect(existsSync(join(projectDir, 'knowledge', 'roadmap.md'))).toBe(true);
    expect(existsSync(join(projectDir, 'AGENTS.md'))).toBe(true);
  });

  it('names the recommended profile as the single next action', () => {
    const { data } = runJson('now');
    const action = data.primary_action as { kind: string; command: string };

    expect(action.kind).toBe('select_profile');
    expect(action.command).toBe('l1dder profile select product_discovery');
  });

  it('keeps IMPLEMENT off the product discovery route without touching state', () => {
    expect(run('profile', 'select', 'product_discovery').code).toBe(
      ExitCode.SUCCESS,
    );

    const before = stableState();
    expect(run('transition', '--to', 'implement').code).toBe(
      ExitCode.FORBIDDEN_TRANSITION,
    );
    expect(stableState()).toBe(before);
  });

  it('refuses stage advance before READY and predicts the same refusal in dry-run', () => {
    const before = stableState();

    expect(run('stage', 'advance', '--yes').code).toBe(
      ExitCode.DISCOVERY_NOT_READY,
    );
    expect(run('stage', 'advance', '--dry-run').code).toBe(
      ExitCode.DISCOVERY_NOT_READY,
    );
    expect(stableState()).toBe(before);
  });

  it('closes all seven milestones in dependency order and reports READY', () => {
    for (const milestone of DISCOVERY_MILESTONE_ORDER) {
      closeMilestone(milestone);
    }

    const { data } = runJson('discovery', 'status');
    expect(data.score).toBe('7/7');
    expect(data.ready).toBe(true);
  });

  it('advances discovery to delivery without a forced waiver', () => {
    expect(run('stage', 'advance', '--yes').code).toBe(ExitCode.SUCCESS);

    const current = state();
    expect(current.project.stage).toBe('delivery');
    expect(current.decisions.some((d) => /force|waiver/i.test(d.title))).toBe(
      false,
    );
  });

  it('offers the delivery route entry point instead of a dead end at idle', () => {
    expect(run('profile', 'select', 'delivery').code).toBe(ExitCode.SUCCESS);

    const { data } = runJson('now');
    const action = data.primary_action as { kind: string; command: string };

    // Regression guard: `delivery` used to allow no forward transition from
    // IDLE, so the projection returned an empty command.
    expect(action.kind).toBe('transition_phase');
    expect(action.command).toBe('l1dder transition --to tasks');
  });

  it('leaves registry check green right after registry sync --init', () => {
    expect(run('registry', 'sync', '--init').code).toBe(ExitCode.SUCCESS);
    expect(existsSync(join(projectDir, 'knowledge', 'registry.md'))).toBe(true);

    const { code, data } = runJson('registry', 'check');
    expect(code).toBe(ExitCode.SUCCESS);
    expect((data.issue_summary as { error: number }).error).toBe(0);
  });

  it('starts only the eligible rail session and rejects off-road ids', () => {
    writeFileSync(
      join(projectDir, 'knowledge', 'project-registry.yml'),
      [
        'schema_version: 1',
        'iterations:',
        '  - id: ITER-001',
        '    title: First delivery iteration',
        '    status: in_progress',
        '    source_anchor: knowledge/roadmap.md',
        '    sessions:',
        '      - id: DEV-1',
        '        title: Walking skeleton',
        '        status: pending',
        '        profile: delivery',
        '        source_anchor: knowledge/roadmap.md',
        '',
      ].join('\n'),
    );
    expect(run('registry', 'sync').code).toBe(ExitCode.SUCCESS);

    const before = stableState();
    expect(run('session', 'start', 'NOPE-1').code).toBe(ExitCode.SESSION_ERROR);
    expect(stableState()).toBe(before);

    expect(run('session', 'start', 'DEV-1').code).toBe(ExitCode.SUCCESS);
    expect(state().workflow.session?.session).toBe('DEV-1');
    expect(state().workflow.session?.iteration).toBe('ITER-001');
  });

  it('projects tasks from markdown and keeps update_asis closed until they are done', () => {
    mkdirSync(join(projectDir, 'specs', 'current'), { recursive: true });
    writeFileSync(
      join(projectDir, 'specs', 'current', 'tasks.md'),
      [
        '# Walking skeleton — tasks',
        '',
        '## Task List',
        '',
        '| id | Task | depends_on | Complexity | Status |',
        '|----|------|------------|------------|--------|',
        '| T-01 | Create the entrypoint | — | S | pending |',
        '| T-02 | Cover it with one test | T-01 | S | pending |',
        '',
      ].join('\n'),
    );

    expect(run('transition', '--to', 'tasks').code).toBe(ExitCode.SUCCESS);

    const sync = runJson('task', 'sync');
    expect(sync.code).toBe(ExitCode.SUCCESS);
    expect((sync.data.counts as { added: number }).added).toBe(2);
    expect(state().tasks.items).toHaveLength(2);

    expect(run('transition', '--to', 'implement').code).toBe(ExitCode.SUCCESS);

    const blocked = run('transition', '--to', 'update_asis');
    expect(blocked.code).toBe(ExitCode.TASKS_ERROR);
    expect(blocked.stdout).toContain('TASKS_INCOMPLETE');
    expect(state().workflow.current_phase).toBe('implement');

    expect(run('task', 'complete', 'T-02').code).toBe(
      ExitCode.DEPENDENCIES_NOT_MET,
    );
    expect(run('task', 'complete', 'T-01').code).toBe(ExitCode.SUCCESS);
    expect(run('task', 'complete', 'T-02').code).toBe(ExitCode.SUCCESS);

    const tasksMarkdown = readFileSync(
      join(projectDir, 'specs', 'current', 'tasks.md'),
      'utf8',
    );
    expect(tasksMarkdown).toContain('| T-01 | Create the entrypoint |');
    expect(tasksMarkdown.match(/done/g)).toHaveLength(2);

    expect(run('transition', '--to', 'update_asis').code).toBe(
      ExitCode.SUCCESS,
    );
  });

  it('records session outcome and evidence when the session closes', () => {
    expect(run('transition', '--to', 'complete').code).toBe(ExitCode.SUCCESS);

    expect(
      run(
        'session',
        'end',
        '--outcome',
        'completed',
        '--evidence',
        'specs/current/tasks.md',
        '--next',
        'l1dder',
      ).code,
    ).toBe(ExitCode.SUCCESS);

    const history = state().workflow.session_history;
    expect(history).toHaveLength(1);
    expect(history[0]?.session).toBe('DEV-1');
    expect(history[0]?.outcome).toBe('completed');
    expect(history[0]?.evidence).toContain('specs/current/tasks.md');
    expect(state().workflow.session).toBeNull();
  });

  it('reports an interrupted transition read-only, then clears it with --fix', () => {
    const statePath = join(projectDir, '.l1dder', 'state.yml');
    writeFileSync(
      statePath,
      `${stateBytes()}_in_flight_transition:\n  from: complete\n  to: idle\n  started_at: '2026-08-12T00:00:00.000Z'\n  actor:\n    kind: human\n    id: e2e\n  trigger:\n    kind: cli\n    command: l1dder transition --to idle\n`,
    );

    expect(run('doctor', '--section', 'state').code).toBe(
      ExitCode.GENERIC_ERROR,
    );
    expect(stateBytes()).toContain('_in_flight_transition');

    expect(run('doctor', '--section', 'state', '--fix').code).toBe(
      ExitCode.SUCCESS,
    );
    expect(stateBytes()).not.toContain('_in_flight_transition');
    expect(run('doctor', '--section', 'state').code).toBe(ExitCode.SUCCESS);
  });

  it('answers the next-step question identically on every surface', () => {
    const now = runJson('now').data.primary_action as { command: string };
    const helpme = runJson('helpme').data.primary_action as { command: string };
    const status = runJson('status').data.primary_action as { command: string };

    expect(now.command.length).toBeGreaterThan(0);
    expect(helpme.command).toBe(now.command);
    expect(status.command).toBe(now.command);
  });
});
