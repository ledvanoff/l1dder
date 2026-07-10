import { describe, expect, it, vi } from 'vitest';
import { NullLogger } from '@l1dder/core/testing';

import { createTestState, createTestConfig } from '../../testing.js';
import { StageGuard } from './stage-guard.js';

describe('StageGuard', () => {
  it('blocks hard-enforced disallowed phase', () => {
    const logger = new NullLogger();
    const guard = new StageGuard(logger);

    const state = createTestState({
      project: { stage: 'discovery' },
    });
    const config = createTestConfig({
      stage: { enforcement: { restrict_phases: 'enforced' } },
    });

    const result = guard.check(state, config, 'implement');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('STAGE_GUARD_BLOCKED');
      expect(result.error.phase).toBe('implement');
      expect(result.error.stage).toBe('discovery');
    }
  });

  it('allows advisory-enforced disallowed phase with warning', () => {
    const logger = new NullLogger();
    const warnSpy = vi.spyOn(logger, 'warn');
    const guard = new StageGuard(logger);

    const state = createTestState({
      project: { stage: 'discovery' },
    });
    const config = createTestConfig({
      stage: { enforcement: { restrict_phases: 'advisory' } },
    });

    const result = guard.check(state, config, 'implement');

    expect(result.ok).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('implement'),
      expect.objectContaining({ phase: 'implement', stage: 'discovery' }),
    );
  });

  it('passes when phase is allowed', () => {
    const logger = new NullLogger();
    const guard = new StageGuard(logger);

    const state = createTestState({
      project: { stage: 'delivery' },
    });
    const config = createTestConfig({
      stage: { enforcement: { restrict_phases: 'enforced' } },
    });

    const result = guard.check(state, config, 'implement');

    expect(result.ok).toBe(true);
  });

  it('permissive when enforcement is off', () => {
    const logger = new NullLogger();
    const guard = new StageGuard(logger);

    const state = createTestState({
      project: { stage: 'discovery' },
    });
    const config = createTestConfig({
      stage: { enforcement: { restrict_phases: 'off' } },
    });

    const result = guard.check(state, config, 'implement');

    expect(result.ok).toBe(true);
  });

  it('permissive when no stage config (defaults)', () => {
    const logger = new NullLogger();
    const guard = new StageGuard(logger);

    const state = createTestState();
    const config = createTestConfig();

    const result = guard.check(state, config, 'specify');

    expect(result.ok).toBe(true);
  });

  it('allows specify phase in discovery stage', () => {
    const logger = new NullLogger();
    const guard = new StageGuard(logger);

    const state = createTestState({
      project: { stage: 'discovery' },
    });
    const config = createTestConfig({
      stage: { enforcement: { restrict_phases: 'enforced' } },
    });

    const result = guard.check(state, config, 'specify');

    expect(result.ok).toBe(true);
  });

  it('allows hygiene phase in every stage, even when enforced', () => {
    const logger = new NullLogger();
    const guard = new StageGuard(logger);
    const config = createTestConfig({
      stage: { enforcement: { restrict_phases: 'enforced' } },
    });

    for (const stage of ['discovery', 'delivery', 'maintenance'] as const) {
      const state = createTestState({ project: { stage } });
      const result = guard.check(state, config, 'hygiene');
      expect(result.ok).toBe(true);
    }
  });
});
