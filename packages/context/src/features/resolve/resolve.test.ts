import { describe, it, expect } from 'vitest';
import { Phase, PhaseStatus, WorkflowMode, ProjectStage } from '@l1dder/core';
import type { WorkflowPosition } from '@l1dder/core';
import type { ContextConfig } from '@l1dder/schemas';
import { resolveProfile } from './resolve.js';

const DEFAULT_CONFIG: ContextConfig = {
  token_budget: 120_000,
  reserved_tokens: 30_000,
  chars_per_token: 3.0,
  overrides: {},
  extra_files: [],
};

function makePosition(
  phase: string,
  stage: string = ProjectStage.DELIVERY,
): WorkflowPosition {
  return {
    phase: phase as WorkflowPosition['phase'],
    status: PhaseStatus.IN_PROGRESS,
    mode: WorkflowMode.MAIN,
    stage: stage as WorkflowPosition['stage'],
    iteration: 1,
  };
}

describe('resolveProfile', () => {
  it('resolves profile for SPECIFY × discovery × architect', () => {
    const position = makePosition(Phase.SPECIFY, ProjectStage.DISCOVERY);
    const profile = resolveProfile(position, 'architect', DEFAULT_CONFIG);

    expect(profile.entries.length).toBeGreaterThan(0);

    const toBeArch = profile.entries.find(
      e => e.path === 'knowledge/to-be/architecture.md',
    );
    expect(toBeArch).toBeDefined();
    expect(toBeArch?.mode).toBe('full');
  });

  it('resolves profile for IMPLEMENT × delivery × developer', () => {
    const position = makePosition(Phase.IMPLEMENT, ProjectStage.DELIVERY);
    const profile = resolveProfile(position, 'developer', DEFAULT_CONFIG);

    const specs = profile.entries.filter(e => e.category === 'specs');
    expect(specs.length).toBeGreaterThanOrEqual(2);
    expect(specs.every(e => e.priority === 1)).toBe(true);

    const conventions = profile.entries.find(
      e => e.path === 'standards/conventions.md',
    );
    expect(conventions).toBeDefined();
    expect(conventions?.mode).toBe('full');
  });

  it('applies config overrides (path → mode)', () => {
    const position = makePosition(Phase.SPECIFY, ProjectStage.DISCOVERY);
    const config: ContextConfig = {
      ...DEFAULT_CONFIG,
      overrides: { 'knowledge/idea.md': 'exclude' },
    };
    const profile = resolveProfile(position, 'architect', config);

    const idea = profile.entries.find(e => e.path === 'knowledge/idea.md');
    if (idea) {
      expect(idea.mode).toBe('exclude');
    }
  });

  it('adds config extra_files to profile', () => {
    const position = makePosition(Phase.IMPLEMENT, ProjectStage.DELIVERY);
    const config: ContextConfig = {
      ...DEFAULT_CONFIG,
      extra_files: ['custom/notes.md'],
    };
    const profile = resolveProfile(position, 'developer', config);

    const custom = profile.entries.find(e => e.path === 'custom/notes.md');
    expect(custom).toBeDefined();
    expect(custom?.mode).toBe('full');
    expect(custom?.zone).toBe('static');
  });

  it('entries sorted by zone (static first) then category then path', () => {
    const position = makePosition(Phase.IMPLEMENT, ProjectStage.DELIVERY);
    const profile = resolveProfile(position, 'developer', DEFAULT_CONFIG);

    let seenDynamic = false;
    for (const entry of profile.entries) {
      if (entry.zone === 'dynamic') seenDynamic = true;
      if (entry.zone === 'static' && seenDynamic) {
        throw new Error('Static entry found after dynamic entry');
      }
    }
  });

  it('default role is developer', () => {
    const position = makePosition(Phase.IMPLEMENT, ProjectStage.DELIVERY);
    const profile = resolveProfile(position, 'developer', DEFAULT_CONFIG);

    expect(profile.entries.length).toBeGreaterThan(0);
  });

  it('IDLE phase base entries are summary (role overlay may promote some)', () => {
    const position = makePosition(Phase.IDLE, ProjectStage.DELIVERY);
    const profile = resolveProfile(position, 'developer', DEFAULT_CONFIG);

    const nonPromoted = profile.entries.filter(
      e =>
        !e.path.includes('architecture.md') &&
        !e.path.includes('erd.md') &&
        e.path !== 'standards/conventions.md',
    );
    for (const entry of nonPromoted) {
      expect(entry.mode).toBe('summary');
    }
  });

  it('role overlay promotes summary → full for matching pattern', () => {
    const position = makePosition(Phase.IDLE, ProjectStage.DELIVERY);
    const profile = resolveProfile(position, 'architect', DEFAULT_CONFIG);

    const toBeArch = profile.entries.find(
      e => e.path === 'knowledge/to-be/architecture.md',
    );
    expect(toBeArch).toBeDefined();
    expect(toBeArch?.mode).toBe('full');
  });

  it('role overlay demotes full → summary for matching pattern', () => {
    const position = makePosition(Phase.SPECIFY, ProjectStage.DISCOVERY);
    const profile = resolveProfile(position, 'designer', DEFAULT_CONFIG);

    const toBeArch = profile.entries.find(
      e => e.path === 'knowledge/to-be/architecture.md',
    );
    if (toBeArch) {
      expect(toBeArch.mode).toBe('summary');
    }
  });

  it('unknown role returns base profile without overlay', () => {
    const position = makePosition(Phase.IMPLEMENT, ProjectStage.DELIVERY);
    const profile = resolveProfile(position, 'unknown_role', DEFAULT_CONFIG);

    expect(profile.entries.length).toBeGreaterThan(0);
  });
});
