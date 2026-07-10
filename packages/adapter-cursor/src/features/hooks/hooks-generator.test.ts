import { describe, expect, it } from 'vitest';
import { generateHooks } from './hooks-generator.js';
import { cursorManifest } from '../../cursor-manifest.js';

describe('generateHooks', () => {
  it('produces valid .cursor/hooks.json for standard profile', () => {
    const result = generateHooks({ profile: 'standard', disabled: [] }, cursorManifest);

    expect(result.relativePath).toBe('.cursor/hooks.json');

    const parsed = JSON.parse(result.content) as { version: number; hooks: Record<string, unknown[]> };
    expect(parsed.version).toBe(1);
    expect(typeof parsed.hooks).toBe('object');
  });

  it('maps canonical PreToolUse to beforeShellExecution', () => {
    const result = generateHooks({ profile: 'standard', disabled: [] }, cursorManifest);
    const parsed = JSON.parse(result.content) as { version: number; hooks: Record<string, Array<{ command: string; event: string }>> };

    expect(parsed.hooks['beforeShellExecution']).toBeDefined();
    const entry = parsed.hooks['beforeShellExecution']?.find((e) =>
      e.command.includes('PreToolUse'),
    );
    expect(entry).toBeDefined();
    expect(entry?.event).toBe('beforeShellExecution');
  });

  it('maps canonical PreCompact to preCompact', () => {
    const result = generateHooks({ profile: 'standard', disabled: [] }, cursorManifest);
    const parsed = JSON.parse(result.content) as { version: number; hooks: Record<string, Array<{ command: string }>> };

    expect(parsed.hooks['preCompact']).toBeDefined();
    const entry = parsed.hooks['preCompact']?.find((e) => e.command.includes('PreCompact'));
    expect(entry).toBeDefined();
  });

  it('maps canonical SessionStart to sessionStart', () => {
    const result = generateHooks({ profile: 'minimal', disabled: [] }, cursorManifest);
    const parsed = JSON.parse(result.content) as { version: number; hooks: Record<string, Array<{ command: string }>> };

    expect(parsed.hooks['sessionStart']).toBeDefined();
  });

  it('excludes hooks not in minimal profile', () => {
    const minimal = generateHooks({ profile: 'minimal', disabled: [] }, cursorManifest);
    const standard = generateHooks({ profile: 'standard', disabled: [] }, cursorManifest);

    const minimalParsed = JSON.parse(minimal.content) as { hooks: Record<string, unknown[]> };
    const standardParsed = JSON.parse(standard.content) as { hooks: Record<string, unknown[]> };

    // doc-file-guard and format-after-edit are standard/strict only
    const minimalEvents = Object.keys(minimalParsed.hooks);
    const standardEvents = Object.keys(standardParsed.hooks);

    // standard should have more or equal events than minimal
    expect(standardEvents.length).toBeGreaterThanOrEqual(minimalEvents.length);

    // afterFileEdit (PostToolUse → doc-file-guard, format-after-edit) should not appear in minimal
    // since both PostToolUse hooks are standard/strict
    expect(minimalParsed.hooks['afterFileEdit']).toBeUndefined();
  });

  it('respects disabled list — excludes specified hook from output', () => {
    const withoutPreCommit = generateHooks(
      { profile: 'standard', disabled: ['pre-commit-guard'] },
      cursorManifest,
    );
    const withPreCommit = generateHooks({ profile: 'standard', disabled: [] }, cursorManifest);

    const withoutParsed = JSON.parse(withoutPreCommit.content) as { hooks: Record<string, Array<{ command: string }>> };
    const withParsed = JSON.parse(withPreCommit.content) as { hooks: Record<string, Array<{ command: string }>> };

    const beforeShellWithout = withoutParsed.hooks['beforeShellExecution'] ?? [];
    const beforeShellWith = withParsed.hooks['beforeShellExecution'] ?? [];

    const hasPreCommit = (entries: Array<{ command: string }>) =>
      entries.some((e) => e.command.includes('PreToolUse'));

    expect(hasPreCommit(beforeShellWith)).toBe(true);
    expect(hasPreCommit(beforeShellWithout)).toBe(false);
  });

  it('is idempotent — same inputs produce same output', () => {
    const first = generateHooks({ profile: 'standard', disabled: [] }, cursorManifest);
    const second = generateHooks({ profile: 'standard', disabled: [] }, cursorManifest);

    expect(first.content).toBe(second.content);
    expect(first.hash).toBe(second.hash);
  });

  it('produces a non-empty hash', () => {
    const result = generateHooks({ profile: 'standard', disabled: [] }, cursorManifest);
    expect(result.hash).toMatch(/^[0-9a-f]{12}$/);
  });
});
