import { describe, expect, it } from 'vitest';

import {
  CommandSuccessSchema,
  CommandErrorSchema,
  InitOutputSchema,
  StatusOutputSchema,
  CheckOutputSchema,
  DoctorOutputSchema,
  ContextBriefOutputSchema,
  QuickOutputSchema,
  StageStatusOutputSchema,
  TransitionOutputSchema,
} from './cli-output.js';

describe('CommandSuccessSchema', () => {
  it('validates success envelope', () => {
    const data = { ok: true, command: 'status', data: { foo: 1 } };
    expect(CommandSuccessSchema.parse(data)).toEqual(data);
  });

  it('rejects ok: false', () => {
    expect(() => CommandSuccessSchema.parse({ ok: false, command: 'x', data: null })).toThrow();
  });
});

describe('CommandErrorSchema', () => {
  it('validates error envelope', () => {
    const data = {
      ok: false,
      exit_code: 3,
      error: { code: 'FORBIDDEN_TRANSITION', message: 'Cannot transition' },
    };
    expect(CommandErrorSchema.parse(data)).toMatchObject(data);
  });

  it('validates error with hint and details', () => {
    const data = {
      ok: false,
      exit_code: 8,
      error: {
        code: 'NOT_INITIALIZED',
        message: 'Not initialized',
        hint: "Run 'l1dder init'",
        details: { cwd: '/tmp' },
      },
    };
    expect(CommandErrorSchema.parse(data)).toMatchObject(data);
  });
});

describe('InitOutputSchema', () => {
  it('validates greenfield output', () => {
    const data = {
      project: { name: 'my-saas', stage: 'discovery' },
      mode: 'greenfield',
      files_created: ['.l1dder/state.yml', '.l1dder/config.yml'],
      next_steps: [
        { label: 'Run /l1dder.specify', command: null, blocking: false },
        { label: 'Generate project brief', command: 'l1dder context', blocking: false },
      ],
    };
    expect(InitOutputSchema.parse(data)).toMatchObject(data);
  });

  it('validates brownfield output', () => {
    const data = {
      project: { name: 'backend-api', stage: 'delivery' },
      mode: 'brownfield',
      files_created: ['.l1dder/state.yml'],
      next_steps: [],
    };
    expect(InitOutputSchema.parse(data)).toMatchObject(data);
  });
});

describe('StatusOutputSchema', () => {
  it('validates complete status data', () => {
    const data = {
      project: { name: 'my-saas', stage: 'delivery', created: '2026-05-09' },
      workflow: { phase: 'implement', status: 'in_progress', mode: 'main', iteration: '7-payment-flow' },
      tasks: { total: 8, done: 2, in_progress: 1, pending: 5, blocked: 0, skipped: 0, next_available: 'task-3' },
      next_steps: [{ label: 'Continue task-3', command: '/l1dder.implement', blocking: false }],
    };
    expect(StatusOutputSchema.parse(data)).toMatchObject(data);
  });

  it('accepts null iteration and next_available', () => {
    const data = {
      project: { name: 'p', stage: 'discovery', created: '2026-01-01' },
      workflow: { phase: 'idle', status: 'in_progress', mode: 'main', iteration: null },
      tasks: { total: 0, done: 0, in_progress: 0, pending: 0, blocked: 0, skipped: 0, next_available: null },
      next_steps: [],
    };
    expect(StatusOutputSchema.parse(data)).toMatchObject(data);
  });
});

describe('CheckOutputSchema', () => {
  it('validates check output with pass/warn/fail', () => {
    const data = {
      summary: { pass: 5, warn: 1, fail: 0 },
      checks: [
        { id: 'base-conventions', level: 'pass', message: 'valid (10 sections)' },
        {
          id: 'user-workflow-overrides',
          level: 'warn',
          message: 'override conflicts with machine-enforced',
          hint: 'Remove from overrides table',
        },
      ],
    };
    expect(CheckOutputSchema.parse(data)).toMatchObject(data);
  });
});

describe('DoctorOutputSchema', () => {
  it('validates sections array', () => {
    const data = {
      summary: { pass: 23, warn: 6, fail: 0, auto_fixable: 1 },
      sections: [
        {
          id: 'knowledge',
          label: 'Knowledge integrity',
          checks: [
            { id: 'idea-summary', level: 'pass', message: 'present, Summary 24 lines' },
            {
              id: 'to-be-arch-size',
              level: 'warn',
              message: '1247 lines',
              hint: 'consider splitting',
              fixable: false,
            },
          ],
        },
        {
          id: 'state',
          label: 'State consistency',
          checks: [
            { id: 'state-valid', level: 'pass', message: 'schema v1' },
          ],
        },
      ],
    };
    expect(DoctorOutputSchema.parse(data)).toMatchObject(data);
  });

  it('validates new Hygiene Sessions section ids (skills, ide)', () => {
    const data = {
      summary: { pass: 2, warn: 0, fail: 0, auto_fixable: 0 },
      sections: [
        {
          id: 'skills',
          label: 'Skill Health',
          checks: [{ id: 'skills-registry-valid', level: 'pass', message: '13 skills valid' }],
        },
        {
          id: 'ide',
          label: 'Adapter Compliance',
          checks: [{ id: 'ide-cursor-complete', level: 'pass', message: 'cursor adapter manifest complete' }],
        },
      ],
    };
    expect(DoctorOutputSchema.parse(data)).toMatchObject(data);
  });
});

describe('ContextBriefOutputSchema', () => {
  it('validates brief output', () => {
    const data = {
      content: '# Project Brief\n...',
      token_estimate: 187,
      char_count: 4823,
      sections: ['project', 'stage', 'workflow'],
    };
    expect(ContextBriefOutputSchema.parse(data)).toMatchObject(data);
  });
});

describe('QuickOutputSchema', () => {
  it('validates quick start output', () => {
    const data = {
      quick_task: {
        id: 'qt-2026-05-09-a3f7b2',
        mode: 'quick',
        title: 'fix null check',
        status: 'in_progress',
        started_at: '2026-05-09T10:30:00Z',
      },
      transition: { from: 'idle', to: 'quick_plan' },
      active_skill: 'quick-implement',
    };
    expect(QuickOutputSchema.parse(data)).toMatchObject(data);
  });

  it('validates finish output without transition', () => {
    const data = {
      quick_task: {
        id: 'qt-2026-05-09-a3f7b2',
        mode: 'quick',
        title: 'fix null check',
        status: 'done',
        completed_at: '2026-05-09T11:00:00Z',
        knowledge_drift_warning: true,
      },
    };
    expect(QuickOutputSchema.parse(data)).toMatchObject(data);
  });
});

describe('StageStatusOutputSchema', () => {
  it('validates stage status with readiness', () => {
    const data = {
      stage: 'discovery',
      enforcement: 'advisory',
      readiness: {
        score: '3/4',
        ready: true,
        criteria: [
          { id: 'DC1', label: 'to-be/architecture.md', met: true },
          { id: 'DC2', label: 'to-be/erd.md', met: true },
          { id: 'DC3', label: 'design/ files', met: true },
          { id: 'DC4', label: 'no TBD markers', met: false, detail: 'usecases.md has TBD' },
        ],
      },
      history: [
        { from: 'discovery', to: 'delivery', timestamp: '2026-05-08T12:00:00Z', reason: 'Ready' },
      ],
    };
    expect(StageStatusOutputSchema.parse(data)).toMatchObject(data);
  });
});

describe('TransitionOutputSchema', () => {
  it('validates transition output', () => {
    const data = {
      from: 'idle',
      to: 'specify',
      kind: 'forward',
      trigger: { kind: 'cli', command: 'transition' },
      forced: false,
      timestamp: '2026-05-09T10:00:00Z',
    };
    expect(TransitionOutputSchema.parse(data)).toMatchObject(data);
  });

  it('validates forced transition with slash trigger', () => {
    const data = {
      from: 'specify',
      to: 'plan',
      kind: 'forward',
      trigger: { kind: 'slash', command: 'specify' },
      forced: true,
      timestamp: '2026-05-09T11:00:00Z',
    };
    expect(TransitionOutputSchema.parse(data)).toMatchObject(data);
  });
});
