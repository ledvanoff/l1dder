import { describe, expect, it } from 'vitest';
import type { State } from '@l1dder/schemas';

import { checkSkills } from './skills.js';

function makeFs(files: Record<string, string>): {
  readFile: (path: string) => Promise<string>;
  readDir: (path: string) => Promise<string[]>;
} {
  return {
    readFile: (path: string) => {
      const normalized = path.replace(/\\/g, '/');
      for (const [key, value] of Object.entries(files)) {
        if (normalized.endsWith(key)) return Promise.resolve(value);
      }
      return Promise.reject(new Error(`File not found: ${path}`));
    },
    readDir: (path: string) => {
      const normalized = path.replace(/\\/g, '/');
      const prefix = Object.keys(files).find((k) => {
        const dir = k.substring(0, k.lastIndexOf('/'));
        return normalized.endsWith(dir);
      });
      if (!prefix) return Promise.reject(new Error('ENOENT'));
      const dir = prefix.substring(0, prefix.lastIndexOf('/'));
      return Promise.resolve(
        Object.keys(files)
          .filter((k) => k.startsWith(dir + '/') && !k.substring(dir.length + 1).includes('/'))
          .map((k) => k.substring(dir.length + 1)),
      );
    },
  };
}

function skillFrontMatter(overrides: Record<string, string> = {}): string {
  const fm: Record<string, string> = {
    id: 'my-skill',
    name: 'My Skill',
    format_version: '1',
    phase: 'idle',
    trigger: 'manual',
    priority: '5',
    builtin: 'true',
    ...overrides,
  };
  return ['---', ...Object.entries(fm).map(([k, v]) => `${k}: ${v}`), '---', '', '# Body'].join('\n');
}

describe('checkSkills', () => {
  it('reports skills-dir warn when no skills directory exists', async () => {
    const fs = makeFs({});
    const checks = await checkSkills(fs as never, '/project');
    expect(checks.some((c) => c.id === 'skills-dir')).toBe(true);
  });

  it('passes when all skills are SK10-valid', async () => {
    const fs = makeFs({
      'skills/built-in/my-skill.md': skillFrontMatter(),
    });
    const checks = await checkSkills(fs as never, '/project');
    expect(checks.some((c) => c.id === 'skills-valid' && c.level === 'pass')).toBe(true);
  });

  it('flags duplicate skill id as fail', async () => {
    const fs = makeFs({
      'skills/built-in/a.md': skillFrontMatter({ id: 'dup-skill', trigger: 'manual' }),
      'skills/custom/b.md': skillFrontMatter({ id: 'dup-skill', trigger: 'manual' }),
    });
    const checks = await checkSkills(fs as never, '/project');
    const fail = checks.find((c) => c.level === 'fail');
    expect(fail?.message).toContain('Duplicate skill id');
  });

  it('flags multiple auto-trigger skills on the same phase as fail', async () => {
    const fs = makeFs({
      'skills/built-in/a.md': skillFrontMatter({ id: 'skill-a', trigger: 'auto', phase: 'specify' }),
      'skills/built-in/b.md': skillFrontMatter({ id: 'skill-b', trigger: 'auto', phase: 'specify' }),
    });
    const checks = await checkSkills(fs as never, '/project');
    const fail = checks.find((c) => c.level === 'fail');
    expect(fail?.message).toContain('Duplicate auto-trigger');
  });

  it('warns and marks fixable when format_version does not match the expected literal', async () => {
    // The schema enforces format_version=1 at parse time (z.literal(1)), so a
    // legacy value fails Zod parsing — surfaced as a fixable per-file warning
    // (same code path as any other malformed front-matter), auto-fixable by
    // `fixSkillFormat` which normalizes `format_version` via raw-text regex.
    const fs = makeFs({
      'skills/built-in/old.md': skillFrontMatter({ id: 'old-skill', trigger: 'manual', format_version: '2' }),
    });
    const checks = await checkSkills(fs as never, '/project');
    const warn = checks.find((c) => c.id === 'skill-format-old.md');
    expect(warn?.level).toBe('warn');
    expect(warn?.fixable).toBe(true);
  });

  it('reports a per-file fixable warning for malformed skill files without breaking others', async () => {
    const fs = makeFs({
      'skills/built-in/good.md': skillFrontMatter({ id: 'good-skill', trigger: 'manual' }),
      'skills/built-in/bad.md': '# My Skill\n\nNo front-matter here\n',
    });
    const checks = await checkSkills(fs as never, '/project');
    const parseError = checks.find((c) => c.id === 'skill-format-bad.md');
    expect(parseError?.level).toBe('warn');
    expect(parseError?.fixable).toBe(true);
    // The valid sibling file does not get swallowed by the malformed one —
    // no fail-level check is raised for it.
    expect(checks.some((c) => c.level === 'fail')).toBe(false);
  });

  it('aggregates skill health warn from skillRuns with failures', async () => {
    const fs = makeFs({
      'skills/built-in/my-skill.md': skillFrontMatter(),
    });
    const state = {
      skillRuns: [
        { skillId: 'my-skill', phase: 'idle', outcome: 'failure', timestamp: '2026-01-01T00:00:00.000Z' },
        { skillId: 'my-skill', phase: 'idle', outcome: 'success', timestamp: '2026-01-02T00:00:00.000Z' },
      ],
    } as unknown as State;

    const checks = await checkSkills(fs as never, '/project', { state });
    const health = checks.find((c) => c.id === 'skills-health-my-skill');
    expect(health?.level).toBe('warn');
    expect(health?.message).toContain('1/2');
  });

  it('does not add a health check when no skillRuns are failures', async () => {
    const fs = makeFs({
      'skills/built-in/my-skill.md': skillFrontMatter(),
    });
    const state = {
      skillRuns: [
        { skillId: 'my-skill', phase: 'idle', outcome: 'success', timestamp: '2026-01-02T00:00:00.000Z' },
      ],
    } as unknown as State;

    const checks = await checkSkills(fs as never, '/project', { state });
    expect(checks.some((c) => c.id.startsWith('skills-health-'))).toBe(false);
  });
});
