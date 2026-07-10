import { describe, expect, it } from 'vitest';

import { fixSkillFormat } from './skill-format.js';
import type { DoctorFixerContext } from '../types.js';

function makeCtx(files: Record<string, string>): { ctx: DoctorFixerContext; written: Record<string, string> } {
  const written: Record<string, string> = {};
  const fs = {
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
    readFile: (path: string) => {
      const normalized = path.replace(/\\/g, '/');
      for (const [key, value] of Object.entries(files)) {
        if (normalized.endsWith(key)) return Promise.resolve(value);
      }
      return Promise.reject(new Error('not found'));
    },
    writeFile: (path: string, content: string) => {
      written[path] = content;
      return Promise.resolve();
    },
  };

  return {
    ctx: {
      fs: fs as unknown as DoctorFixerContext['fs'],
      projectRoot: '/project',
      logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    },
    written,
  };
}

describe('fixSkillFormat', () => {
  it('adds full front-matter (including format_version) to a file with none', async () => {
    const { ctx, written } = makeCtx({ 'skills/built-in/bad.md': '# No front matter\n' });

    const fixed = await fixSkillFormat(ctx);

    expect(fixed).toBe(true);
    const content = Object.values(written)[0] ?? '';
    expect(content).toContain('id: bad');
    expect(content).toContain('phase: idle');
    expect(content).toContain('trigger: manual');
    expect(content).toContain('format_version: 1');
  });

  it('normalizes a mismatched format_version to 1', async () => {
    const skill = [
      '---',
      'id: old-skill',
      'phase: idle',
      'trigger: manual',
      'format_version: 2',
      '---',
      '',
      '# Body',
    ].join('\n');
    const { ctx, written } = makeCtx({ 'skills/built-in/old.md': skill });

    const fixed = await fixSkillFormat(ctx);

    expect(fixed).toBe(true);
    const content = Object.values(written)[0] ?? '';
    expect(content).toContain('format_version: 1');
    expect(content).not.toContain('format_version: 2');
  });

  it('does nothing when front-matter is already valid', async () => {
    const skill = [
      '---',
      'id: good-skill',
      'phase: idle',
      'trigger: manual',
      'format_version: 1',
      '---',
      '',
      '# Body',
    ].join('\n');
    const { ctx, written } = makeCtx({ 'skills/built-in/good.md': skill });

    const fixed = await fixSkillFormat(ctx);

    expect(fixed).toBe(false);
    expect(Object.keys(written)).toHaveLength(0);
  });

  it('returns false when skills/built-in/ does not exist', async () => {
    const { ctx } = makeCtx({});
    const fixed = await fixSkillFormat(ctx);
    expect(fixed).toBe(false);
  });
});
