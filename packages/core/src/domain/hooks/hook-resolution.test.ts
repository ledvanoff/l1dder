import { describe, it, expect } from 'vitest';
import { resolveActiveHooks } from './hook-resolution.js';
import { getBuiltinHooks } from './hook-registry.js';

const hooks = getBuiltinHooks();

describe('resolveActiveHooks', () => {
  it('returns only minimal-profile hooks with profile=minimal', () => {
    const active = resolveActiveHooks(hooks, {
      profile: 'minimal',
      disabled: [],
      env: {},
    });
    // minimal profile: pre-commit-guard, precompact-handoff-save, session-start-bounded-context
    for (const h of active) {
      expect(h.profiles).toContain('minimal');
    }
    const ids = active.map((h) => h.id);
    expect(ids).toContain('pre-commit-guard');
    expect(ids).toContain('precompact-handoff-save');
    expect(ids).toContain('session-start-bounded-context');
    expect(ids).not.toContain('format-after-edit');
    expect(ids).not.toContain('strategic-compact-reminder');
  });

  it('returns standard hooks with profile=standard', () => {
    const active = resolveActiveHooks(hooks, {
      profile: 'standard',
      disabled: [],
      env: {},
    });
    const ids = active.map((h) => h.id);
    expect(ids).toContain('doc-file-guard');
    expect(ids).toContain('format-after-edit');
    expect(ids).not.toContain('strategic-compact-reminder');
  });

  it('returns all hooks with profile=strict', () => {
    const active = resolveActiveHooks(hooks, {
      profile: 'strict',
      disabled: [],
      env: {},
    });
    const ids = active.map((h) => h.id);
    expect(ids).toContain('strategic-compact-reminder');
    expect(ids.length).toBe(hooks.length);
  });

  it('excludes disabled hook even if in active profile', () => {
    const active = resolveActiveHooks(hooks, {
      profile: 'standard',
      disabled: ['format-after-edit'],
      env: {},
    });
    const ids = active.map((h) => h.id);
    expect(ids).not.toContain('format-after-edit');
    expect(ids).toContain('doc-file-guard');
  });

  it('returns empty list when L1DDER_HOOKS=off', () => {
    const active = resolveActiveHooks(hooks, {
      profile: 'strict',
      disabled: [],
      env: { hooksGlobal: 'off' },
    });
    expect(active).toHaveLength(0);
  });

  it('uses env profile over config profile (env > config)', () => {
    const active = resolveActiveHooks(hooks, {
      profile: 'standard',
      disabled: [],
      env: { profile: 'strict' },
    });
    const ids = active.map((h) => h.id);
    expect(ids).toContain('strategic-compact-reminder');
  });

  it('falls back to config profile if env profile is invalid', () => {
    const active = resolveActiveHooks(hooks, {
      profile: 'minimal',
      disabled: [],
      env: { profile: 'ultra' },
    });
    // Should behave as minimal
    const ids = active.map((h) => h.id);
    expect(ids).not.toContain('format-after-edit');
    expect(ids).toContain('pre-commit-guard');
  });

  it('disables hook via L1DDER_DISABLED_HOOKS env (csv)', () => {
    const active = resolveActiveHooks(hooks, {
      profile: 'standard',
      disabled: [],
      env: { disabledHooks: 'doc-file-guard, format-after-edit' },
    });
    const ids = active.map((h) => h.id);
    expect(ids).not.toContain('doc-file-guard');
    expect(ids).not.toContain('format-after-edit');
  });
});
