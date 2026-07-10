import { describe, it, expect } from 'vitest';
import { ProjectStage } from '@l1dder/core';
import { BASE_PROFILES, resolveBaseProfile } from './profiles.js';
import { ROLE_OVERLAYS, matchesPattern } from './role-overlays.js';

describe('BASE_PROFILES', () => {
  it('has entry for SPECIFY × discovery', () => {
    const entries = resolveBaseProfile('SPECIFY', ProjectStage.DISCOVERY);
    expect(entries.length).toBeGreaterThan(0);

    const toBeArch = entries.find(e => e.path === 'knowledge/to-be/architecture.md');
    expect(toBeArch).toBeDefined();
    expect(toBeArch?.mode).toBe('full');

    const asIsArch = entries.find(e => e.path === 'knowledge/as-is/architecture.md');
    expect(asIsArch).toBeDefined();
    expect(asIsArch?.mode).toBe('summary');
  });

  it('has entry for IMPLEMENT × delivery (uses "any" fallback)', () => {
    const entries = resolveBaseProfile('IMPLEMENT', ProjectStage.DELIVERY);
    expect(entries.length).toBeGreaterThan(0);

    const specs = entries.filter(e => e.category === 'specs');
    expect(specs.length).toBeGreaterThanOrEqual(2);
    expect(specs.every(e => e.priority === 1)).toBe(true);
  });

  it('returns minimal entries for IDLE phase', () => {
    const entries = resolveBaseProfile('IDLE', ProjectStage.DELIVERY);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every(e => e.mode === 'summary')).toBe(true);
  });

  it('QUICK returns summaries only', () => {
    const entries = resolveBaseProfile('QUICK', ProjectStage.DELIVERY);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every(e => e.mode === 'summary')).toBe(true);
  });

  it('TO_BE_KU promotes to-be knowledge to priority 1', () => {
    const entries = resolveBaseProfile('TO_BE_KU', ProjectStage.DELIVERY);
    const toBeEntries = entries.filter(e => e.path.includes('to-be/'));
    expect(toBeEntries.length).toBeGreaterThan(0);
    expect(toBeEntries.every(e => e.priority === 1)).toBe(true);
  });

  it('falls back to "any" when specific stage not defined', () => {
    const entries = resolveBaseProfile('IMPLEMENT', ProjectStage.MAINTENANCE);
    expect(entries.length).toBeGreaterThan(0);
  });

  it('all 9 phase groups have at least one stage profile', () => {
    const groups = Object.keys(BASE_PROFILES);
    expect(groups).toHaveLength(9);
    for (const group of groups) {
      const profiles = BASE_PROFILES[group as keyof typeof BASE_PROFILES];
      expect(Object.keys(profiles).length).toBeGreaterThan(0);
    }
  });
});

describe('ROLE_OVERLAYS', () => {
  it('architect promotes architecture and erd', () => {
    const overlay = ROLE_OVERLAYS['architect'];
    expect(overlay).toBeDefined();
    expect(overlay?.promote).toContain('knowledge/*/architecture.md');
    expect(overlay?.promote).toContain('knowledge/*/erd.md');
  });

  it('developer demotes usecases and idea', () => {
    const overlay = ROLE_OVERLAYS['developer'];
    expect(overlay).toBeDefined();
    expect(overlay?.demote).toContain('knowledge/*/usecases.md');
    expect(overlay?.demote).toContain('knowledge/idea.md');
  });

  it('all 6 core roles have overlays', () => {
    const roles = ['architect', 'developer', 'po', 'analyst', 'qa', 'designer'];
    for (const role of roles) {
      const overlay = ROLE_OVERLAYS[role];
      expect(overlay).toBeDefined();
      expect(overlay?.promote).toBeInstanceOf(Array);
      expect(overlay?.demote).toBeInstanceOf(Array);
    }
  });
});

describe('matchesPattern', () => {
  it('matches wildcard in path segment', () => {
    expect(matchesPattern('knowledge/to-be/architecture.md', 'knowledge/*/architecture.md')).toBe(true);
    expect(matchesPattern('knowledge/as-is/architecture.md', 'knowledge/*/architecture.md')).toBe(true);
  });

  it('does not match different filename', () => {
    expect(matchesPattern('knowledge/to-be/erd.md', 'knowledge/*/architecture.md')).toBe(false);
  });

  it('matches exact path without wildcards', () => {
    expect(matchesPattern('knowledge/idea.md', 'knowledge/idea.md')).toBe(true);
  });

  it('does not match partial path', () => {
    expect(matchesPattern('knowledge/idea.md', 'idea.md')).toBe(false);
  });

  it('wildcard does not cross path segments', () => {
    expect(matchesPattern('knowledge/a/b/architecture.md', 'knowledge/*/architecture.md')).toBe(false);
  });
});
