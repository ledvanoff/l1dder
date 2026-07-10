import { describe, it, expect, vi } from 'vitest';
import { ConfigSchema } from '@l1dder/schemas';

import { executeDoctor } from './doctor.js';
import type { CliContext } from '../../context.js';
import { ExitCode } from '../../output/exit-codes.js';

function createDoctorCtx(options: {
  files?: Record<string, string>;
  stateThrows?: boolean;
  stateSnapshot?: unknown;
  configSnapshot?: unknown;
  shell?: { exec: (command: string) => Promise<{ stdout: string; stderr: string; exitCode: number }> };
}): CliContext {
  const { files = {}, stateThrows = false, stateSnapshot, configSnapshot, shell } = options;

  const fs = {
    readFile: (path: string): Promise<string> => {
      const normalized = path.replace(/\\/g, '/');
      for (const [key, value] of Object.entries(files)) {
        if (normalized.endsWith(key)) return Promise.resolve(value);
      }
      return Promise.reject(new Error(`File not found: ${path}`));
    },
    writeFile: () => Promise.resolve(),
    rename: () => Promise.resolve(),
    exists: (path: string) => {
      const normalized = path.replace(/\\/g, '/');
      return Promise.resolve(Object.keys(files).some((k) => normalized.endsWith(k)));
    },
    stat: () => Promise.resolve({ size: 0, mtimeMs: 0, isFile: true, isDirectory: false }),
    mkdir: () => Promise.resolve(),
    deleteFile: () => Promise.resolve(),
    readDir: (path: string) => {
      const normalized = path.replace(/\\/g, '/');
      const prefix = Object.keys(files).find((k) => {
        const dir = k.substring(0, k.lastIndexOf('/'));
        return normalized.endsWith(dir);
      });
      if (!prefix) return Promise.resolve([] as string[]);
      const dir = prefix.substring(0, prefix.lastIndexOf('/'));
      return Promise.resolve(
        Object.keys(files)
          .filter((k) => k.startsWith(dir + '/') && !k.substring(dir.length + 1).includes('/'))
          .map((k) => k.substring(dir.length + 1)),
      );
    },
    removeDir: () => Promise.resolve(),
  };

  const defaultState = {
    schema_version: 1,
    project: { name: 'test', stage: 'delivery', stage_history: [], created_at: '2026-01-01', updated_at: '2026-01-01' },
    workflow: { current_phase: 'idle', current_status: 'in_progress', mode: 'main', iteration: 0 },
    tasks: { items: [] },
    quick_tasks: [],
    phase_history: [],
    stage_history: [],
    knowledge_updates: [],
    _in_flight_transition: null,
    sessions: [],
    skillRuns: [],
    skillVersions: [],
  };

  return {
    cwd: '/project',
    fs,
    clock: { now: () => '2026-05-24T12:00:00.000Z' },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    prompt: {
      confirm: () => Promise.resolve(true),
      input: () => Promise.resolve(''),
      select: <T extends string>() => Promise.resolve('' as T),
    },
    globals: {
      cwd: '/project',
      json: false,
      color: false,
      quiet: false,
      verbose: false,
      noPrompt: true,
      noRecover: false,
    },
    output: { render: () => {}, error: () => {} },
    colors: {
      success: (t: string) => t,
      warning: (t: string) => t,
      error: (t: string) => t,
      info: (t: string) => t,
      dim: (t: string) => t,
      bold: (t: string) => t,
      glyph: { pass: '[OK]', warn: '[WARN]', fail: '[FAIL]', info: '[i]', arrow: '→' },
    },
    shell,
    state: stateThrows
      ? () => Promise.reject(new Error('not initialized'))
      : () => Promise.resolve({
          stateSnapshot: () => stateSnapshot ?? defaultState,
          configSnapshot: () => configSnapshot ?? ConfigSchema.parse({}),
        }),
    knowledge: () => { throw new Error('not initialized'); },
    contextEngine: () => { throw new Error('not initialized'); },
  } as unknown as CliContext;
}

describe('executeDoctor', () => {
  const BASE_FILES = {
    'standards/.base/conventions.base.yml': 'meta:\n  format_version: 1\nlanguage:\n  primary: ts\n',
    'standards/.base/workflow.base.yml': 'meta:\n  format_version: 1\nlanguage_policy:\n  code: en\n',
    '.l1dder/state.yml': 'schema_version: 1\n',
    '.l1dder/config.yml': 'schema_version: 1\n',
    'knowledge/idea.md': '# Idea\n',
    'knowledge/roadmap.md': '# Roadmap\n',
  };

  it('runs all 6 sections', async () => {
    const ctx = createDoctorCtx({ files: BASE_FILES });
    const result = await executeDoctor(ctx, {});

    expect(result.data?.sections).toHaveLength(6);
    const sectionIds = result.data?.sections.map((s) => s.id);
    expect(sectionIds).toContain('knowledge');
    expect(sectionIds).toContain('state');
    expect(sectionIds).toContain('stage');
    expect(sectionIds).toContain('standards');
    expect(sectionIds).toContain('workflow');
    expect(sectionIds).toContain('drift');
  });

  it('--section state runs only state checks', async () => {
    const ctx = createDoctorCtx({ files: BASE_FILES });
    const result = await executeDoctor(ctx, { section: 'state' });

    expect(result.data?.sections).toHaveLength(1);
    expect(result.data?.sections[0]?.id).toBe('state');
  });

  it('detects stale in-progress task', async () => {
    const staleState = {
      schema_version: 1,
      project: { name: 'test', stage: 'delivery', created_at: '2026-01-01', updated_at: '2026-01-01' },
      workflow: { current_phase: 'implement', current_status: 'in_progress', mode: 'main', iteration: 1 },
      tasks: {
        items: [
          { id: 'T-01', title: 'Old task', status: 'in_progress', depends_on: [], started_at: '2026-05-20T00:00:00Z' },
        ],
      },
      quick_tasks: [],
      phase_history: [],
      stage_history: [],
      knowledge_updates: [],
      _in_flight_transition: null,
      sessions: [],
    };

    const ctx = createDoctorCtx({ files: BASE_FILES, stateSnapshot: staleState });
    const result = await executeDoctor(ctx, { section: 'state' });

    const warnCheck = result.data?.sections[0]?.checks.find((c) => c.id === 'state-stale-tasks');
    expect(warnCheck?.level).toBe('warn');
    expect(warnCheck?.message).toContain('T-01');
  });

  it('detects knowledge drift from quick tasks', async () => {
    const driftState = {
      schema_version: 1,
      project: { name: 'test', stage: 'delivery', created_at: '2026-01-01', updated_at: '2026-01-01' },
      workflow: { current_phase: 'idle', current_status: 'in_progress', mode: 'main', iteration: 0 },
      tasks: { items: [] },
      quick_tasks: [
        { id: 'quick-fix-123', description: 'fix', status: 'done', created_at: '2026-05-20', knowledge_drift_warning: true },
      ],
      phase_history: [],
      stage_history: [],
      knowledge_updates: [],
      _in_flight_transition: null,
      sessions: [],
    };

    const ctx = createDoctorCtx({ files: BASE_FILES, stateSnapshot: driftState });
    const result = await executeDoctor(ctx, { section: 'drift' });

    const driftCheck = result.data?.sections[0]?.checks.find((c) => c.id.startsWith('drift-'));
    expect(driftCheck?.level).toBe('warn');
  });

  it('outputs DoctorOutputSchema-compatible data', async () => {
    const ctx = createDoctorCtx({ files: BASE_FILES });
    const result = await executeDoctor(ctx, {});

    expect(result.data).toBeDefined();
    expect(result.data?.summary).toHaveProperty('pass');
    expect(result.data?.summary).toHaveProperty('warn');
    expect(result.data?.summary).toHaveProperty('fail');
    expect(result.data?.summary).toHaveProperty('auto_fixable');
    expect(result.data?.sections).toBeInstanceOf(Array);
  });

  it('exit 1 on any fail', async () => {
    const corruptState = {
      schema_version: 1,
      project: { name: 'test', stage: 'delivery', created_at: '2026-01-01', updated_at: '2026-01-01' },
      workflow: { current_phase: 'idle', current_status: 'in_progress', mode: 'quick', iteration: 0 },
      tasks: { items: [] },
      quick_tasks: [],
      phase_history: [],
      stage_history: [],
      knowledge_updates: [],
      _in_flight_transition: null,
      sessions: [],
    };

    const ctx = createDoctorCtx({ files: BASE_FILES, stateSnapshot: corruptState });
    const result = await executeDoctor(ctx, { section: 'state' });

    expect(result.exitCode).toBe(ExitCode.GENERIC_ERROR);
  });

  it('--fix clears in-flight marker from state.yml', async () => {
    const stateYml = [
      'schema_version: 1',
      'project:',
      '  name: test',
      '  stage: delivery',
      '  created_at: "2026-01-01"',
      '  updated_at: "2026-01-01"',
      'workflow:',
      '  current_phase: idle',
      '  current_status: in_progress',
      '  mode: main',
      '  iteration: 0',
      '_in_flight_transition:',
      '  from: idle',
      '  to: specify',
      '  started_at: "2026-05-24T10:00:00Z"',
      '  actor: user',
      '  trigger:',
      '    kind: cli',
      'tasks:',
      '  items: []',
      'quick_tasks: []',
      'phase_history: []',
      'stage_history: []',
      'knowledge_updates: []',
      'sessions: []',
    ].join('\n');

    const stateWithMarker = {
      schema_version: 1,
      project: { name: 'test', stage: 'delivery', created_at: '2026-01-01', updated_at: '2026-01-01' },
      workflow: { current_phase: 'idle', current_status: 'in_progress', mode: 'main', iteration: 0 },
      tasks: { items: [] },
      quick_tasks: [],
      phase_history: [],
      stage_history: [],
      knowledge_updates: [],
      _in_flight_transition: { from: 'idle', to: 'specify', started_at: '2026-05-24T10:00:00Z', actor: 'user', trigger: { kind: 'cli' } },
      sessions: [],
    };

    const writtenFiles: Record<string, string> = {};
    const files = {
      ...BASE_FILES,
      '.l1dder/state.yml': stateYml,
    };

    const ctx = createDoctorCtx({ files, stateSnapshot: stateWithMarker });
    (ctx.fs as { writeFile: (p: string, c: string) => Promise<void> }).writeFile = (p: string, c: string) => {
      writtenFiles[p] = c;
      return Promise.resolve();
    };

    const result = await executeDoctor(ctx, { fix: true, section: 'state' });

    expect(result.exitCode).toBe(ExitCode.GENERIC_ERROR);
    const written = Object.values(writtenFiles).find((v) => v.includes('schema_version'));
    expect(written).toBeDefined();
    expect(written).not.toContain('_in_flight_transition');
  });

  it('--fix adds missing front-matter to skill files', async () => {
    const skillContent = '# My Skill\n\nSome content\n';
    const filesWithSkills = {
      ...BASE_FILES,
      'skills/built-in/bad-skill.md': skillContent,
    };

    const writtenFiles: Record<string, string> = {};
    const ctx = createDoctorCtx({ files: filesWithSkills });
    (ctx.fs as { writeFile: (p: string, c: string) => Promise<void> }).writeFile = (p: string, c: string) => {
      writtenFiles[p] = c;
      return Promise.resolve();
    };

    await executeDoctor(ctx, { fix: true, section: 'skills' });

    const written = Object.values(writtenFiles).find((v) => v.includes('id:'));
    expect(written).toBeDefined();
    expect(written).toContain('id: bad-skill');
    expect(written).toContain('phase: idle');
    expect(written).toContain('trigger: manual');
  });

  describe('--deep', () => {
    it('without --deep runs the identical check set as before (regression)', async () => {
      const ctx = createDoctorCtx({ files: BASE_FILES });
      const result = await executeDoctor(ctx, {});

      const knowledgeChecks = result.data?.sections.find((s) => s.id === 'knowledge')?.checks ?? [];
      expect(knowledgeChecks.some((c) => c.id.startsWith('knowledge-drift-'))).toBe(false);
    });

    it('flags structural as-is/to-be drift in the knowledge section', async () => {
      const files = {
        ...BASE_FILES,
        'knowledge/as-is/architecture.md': '## Summary\ntext\n',
        'knowledge/to-be/architecture.md': '## Summary\ntext\n## Details\nmore\n',
      };
      const ctx = createDoctorCtx({ files });
      const result = await executeDoctor(ctx, { section: 'knowledge', deep: true });

      const checks = result.data?.sections[0]?.checks ?? [];
      const driftCheck = checks.find((c) => c.id.startsWith('knowledge-drift-architecture-'));
      expect(driftCheck?.level).toBe('warn');
    });

    it('flags orphan git-diff drift in the drift section', async () => {
      const shell = {
        exec: () => Promise.resolve({ stdout: 'knowledge/roadmap.md\n', stderr: '', exitCode: 0 }),
      };
      const ctx = createDoctorCtx({ files: BASE_FILES, shell });
      const result = await executeDoctor(ctx, { section: 'drift', deep: true });

      const checks = result.data?.sections[0]?.checks ?? [];
      const orphanCheck = checks.find((c) => c.id.startsWith('drift-orphan-'));
      expect(orphanCheck?.level).toBe('warn');
      expect(orphanCheck?.message).toContain('knowledge/roadmap.md');
    });

    it('--deep --json produces DoctorOutputSchema-compatible structured output with new checks', async () => {
      const shell = {
        exec: () => Promise.resolve({ stdout: 'knowledge/roadmap.md\n', stderr: '', exitCode: 0 }),
      };
      const ctx = createDoctorCtx({ files: BASE_FILES, shell });
      const result = await executeDoctor(ctx, { deep: true });

      expect(result.data?.summary).toHaveProperty('warn');
      const allChecks = result.data?.sections.flatMap((s) => s.checks) ?? [];
      expect(allChecks.some((c) => c.id.startsWith('drift-orphan-'))).toBe(true);
    });

    it('hybrid trigger: adds an advisory when drift findings reach the configured threshold (DEC-6-4)', async () => {
      const shell = {
        exec: (command: string) => {
          if (command.startsWith('git diff')) {
            return Promise.resolve({
              stdout: ['knowledge/roadmap.md', 'standards/conventions.md', 'knowledge/idea.md'].join('\n'),
              stderr: '',
              exitCode: 0,
            });
          }
          return Promise.resolve({ stdout: '', stderr: '', exitCode: 0 });
        },
      };
      const ctx = createDoctorCtx({
        files: BASE_FILES,
        shell,
        configSnapshot: ConfigSchema.parse({ hygiene: { drift_threshold: 2 } }),
      });
      const result = await executeDoctor(ctx, { deep: true });

      const driftChecks = result.data?.sections.find((s) => s.id === 'drift')?.checks ?? [];
      const advisory = driftChecks.find((c) => c.id === 'hygiene-trigger-advisory');
      expect(advisory?.level).toBe('info');
      expect(advisory?.message).toContain('3 drift finding(s)');
      expect(advisory?.hint).toContain('l1dder transition --to hygiene');
    });

    it('hybrid trigger: does not fire when drift findings are below the threshold', async () => {
      const ctx = createDoctorCtx({
        files: BASE_FILES,
        configSnapshot: ConfigSchema.parse({ hygiene: { drift_threshold: 10 } }),
      });
      const result = await executeDoctor(ctx, { deep: true });

      const driftChecks = result.data?.sections.find((s) => s.id === 'drift')?.checks ?? [];
      expect(driftChecks.some((c) => c.id === 'hygiene-trigger-advisory')).toBe(false);
    });
  });

  describe('skills/ide section wiring (T-06/T-07)', () => {
    it('--deep default sweep additionally includes skills and ide sections', async () => {
      const ctx = createDoctorCtx({ files: BASE_FILES });
      const result = await executeDoctor(ctx, { deep: true });

      expect(result.data?.sections).toHaveLength(8);
      const sectionIds = result.data?.sections.map((s) => s.id);
      expect(sectionIds).toContain('skills');
      expect(sectionIds).toContain('ide');
    });

    it('without --deep, the default sweep still runs only the original 6 sections', async () => {
      const ctx = createDoctorCtx({ files: BASE_FILES });
      const result = await executeDoctor(ctx, {});

      const sectionIds = result.data?.sections.map((s) => s.id);
      expect(sectionIds).not.toContain('skills');
      expect(sectionIds).not.toContain('ide');
    });

    it('--section skills is reachable without --deep', async () => {
      const ctx = createDoctorCtx({ files: BASE_FILES });
      const result = await executeDoctor(ctx, { section: 'skills' });

      expect(result.data?.sections).toHaveLength(1);
      expect(result.data?.sections[0]?.id).toBe('skills');
    });

    it('--section ide is reachable without --deep', async () => {
      const ctx = createDoctorCtx({ files: BASE_FILES });
      const result = await executeDoctor(ctx, { section: 'ide' });

      expect(result.data?.sections).toHaveLength(1);
      expect(result.data?.sections[0]?.id).toBe('ide');
    });
  });

  describe('--mode (E9 deep-modes, T-09)', () => {
    it('rejects --mode without --deep', async () => {
      const ctx = createDoctorCtx({ files: BASE_FILES });
      const result = await executeDoctor(ctx, { mode: 'production-audit' });

      expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
      expect(result.error?.message).toContain('--mode requires --deep');
    });

    it('rejects an unknown --mode value', async () => {
      const ctx = createDoctorCtx({ files: BASE_FILES });
      const result = await executeDoctor(ctx, { deep: true, mode: 'bogus-mode' });

      expect(result.exitCode).toBe(ExitCode.USAGE_ERROR);
      expect(result.error?.message).toContain('Unknown mode');
    });

    it('--deep --mode production-audit appends a "mode" section summarizing production-readiness', async () => {
      const ctx = createDoctorCtx({ files: BASE_FILES });
      const result = await executeDoctor(ctx, { deep: true, mode: 'production-audit' });

      const modeSection = result.data?.sections.find((s) => s.id === 'mode');
      expect(modeSection).toBeDefined();
      expect(modeSection?.checks.some((c) => c.id === 'audit-no-fail')).toBe(true);
    });

    it('--deep --mode verification-loop appends a single aggregate pass/warn/fail check', async () => {
      const ctx = createDoctorCtx({ files: BASE_FILES });
      const result = await executeDoctor(ctx, { deep: true, mode: 'verification-loop' });

      const modeSection = result.data?.sections.find((s) => s.id === 'mode');
      expect(modeSection?.checks).toHaveLength(1);
      expect(modeSection?.checks[0]?.id).toBe('verification-loop-status');
    });
  });
});
