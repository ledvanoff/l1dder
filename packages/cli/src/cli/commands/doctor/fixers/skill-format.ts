import type { DoctorFixerContext } from '../types.js';
import { join } from 'node:path';

const REQUIRED_FIELDS = ['id', 'phase', 'trigger'] as const;

/**
 * Fixer: add missing YAML front-matter fields to skill files.
 *
 * Scans skills/built-in/ for .md files missing required front-matter keys.
 * Adds defaults for missing fields: `trigger: manual`, `phase: idle`.
 * Returns true if any file was fixed.
 */
export async function fixSkillFormat(ctx: DoctorFixerContext): Promise<boolean> {
  const skillsDir = join(ctx.projectRoot, 'skills', 'built-in');

  let files: readonly string[];
  try {
    files = await ctx.fs.readDir(skillsDir);
  } catch {
    return false;
  }

  const mdFiles = files.filter((f) => f.endsWith('.md'));
  let fixedAny = false;

  for (const file of mdFiles) {
    const filePath = join(skillsDir, file);
    const content = await ctx.fs.readFile(filePath);
    const fixed = fixFrontMatter(content, file);
    if (fixed !== null) {
      await ctx.fs.writeFile(filePath, fixed);
      ctx.logger.info(`Fixed: added missing front-matter fields to ${file}`);
      fixedAny = true;
    }
  }

  return fixedAny;
}

function fixFrontMatter(content: string, filename: string): string | null {
  const fmMatch = /^---\n([\s\S]*?)\n---/.exec(content);

  if (!fmMatch) {
    const id = filename.replace(/\.md$/, '');
    const newFm = [
      '---',
      `id: ${id}`,
      'phase: idle',
      'trigger: manual',
      'format_version: 1',
      '---',
      '',
    ].join('\n');
    return newFm + content;
  }

  const fm = fmMatch[1] ?? '';
  const missing: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    if (!fm.includes(`${field}:`)) {
      missing.push(field);
    }
  }

  const formatVersionFix = fixFormatVersion(fm);

  if (missing.length === 0 && formatVersionFix === null) return null;

  const defaults: Record<string, string> = {
    id: filename.replace(/\.md$/, ''),
    phase: 'idle',
    trigger: 'manual',
  };

  let fixedFm = formatVersionFix ?? fm;

  if (missing.length > 0) {
    const additions = missing.map((f) => `${f}: ${defaults[f] ?? 'unknown'}`).join('\n');
    fixedFm = fixedFm.trimEnd() + '\n' + additions;
  }

  return content.replace(fmMatch[0], `---\n${fixedFm}\n---`);
}

/**
 * Normalize `format_version` to `1` (Iteration 6, T-06). Returns the fixed
 * front-matter block, or `null` if `format_version` is already `1` or absent
 * (absence is handled separately — only mismatches are auto-fixed here).
 */
function fixFormatVersion(fm: string): string | null {
  const match = /^format_version:\s*(\S+)\s*$/m.exec(fm);
  if (!match || match[1] === '1') return null;
  return fm.replace(match[0], 'format_version: 1');
}
