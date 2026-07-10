import { describe, expect, it } from 'vitest';

import { Phase } from './phase.js';
import { PHASE_SKILL_MAP } from './skill-phase-map.js';
import { resolveSkill, resolveSkillsByWorkType } from './skill-resolution.js';
import { WORK_TYPE_SKILL_MAP, isWorkType } from './work-type-map.js';
import type { ParsedSkill } from './skill-types.js';
import type { SkillRegistry } from './skill-registry.js';

function makeSkill(overrides: {
  id: string;
  body?: string;
  summary?: string;
  filePath?: string;
  category?: 'builtin' | 'custom';
  frontMatter?: Partial<Omit<ParsedSkill['frontMatter'], 'id'>>;
}): ParsedSkill {
  const defaults = {
    id: overrides.id,
    name: overrides.id,
    format_version: 1 as const,
    phase: 'specify' as const,
    roles: [] as string[],
    trigger: 'auto' as const,
    priority: 5,
    context_profile: null,
    tags: [] as string[],
    builtin: true,
  };

  return {
    frontMatter: { ...defaults, ...overrides.frontMatter },
    body: overrides.body ?? '',
    summary: overrides.summary ?? '',
    filePath: overrides.filePath ?? `skills/${overrides.id}.md`,
    category: overrides.category ?? 'builtin',
  };
}

function createRegistry(skills: ParsedSkill[]): SkillRegistry {
  const map = new Map<string, ParsedSkill>();
  for (const s of skills) {
    map.set(s.frontMatter.id, s);
  }

  return {
    all: () => [...map.values()],
    findByPhase: (phase: string) => {
      const skillId = PHASE_SKILL_MAP[phase as keyof typeof PHASE_SKILL_MAP];
      if (!skillId) return [];
      return [...map.values()].filter(
        (s) => s.frontMatter.id === skillId,
      );
    },
    findById: (id: string) => map.get(id),
    register: (s: ParsedSkill) => map.set(s.frontMatter.id, s),
    has: (id: string) => map.has(id),
  };
}

describe('PHASE_SKILL_MAP', () => {
  it('maps SPECIFY to specify-feature', () => {
    expect(PHASE_SKILL_MAP[Phase.SPECIFY]).toBe('specify-feature');
  });

  it('maps QUICK_PLAN, QUICK_IMPLEMENT, FAST_IMPLEMENT to quick-implement', () => {
    expect(PHASE_SKILL_MAP[Phase.QUICK_PLAN]).toBe('quick-implement');
    expect(PHASE_SKILL_MAP[Phase.QUICK_IMPLEMENT]).toBe('quick-implement');
    expect(PHASE_SKILL_MAP[Phase.FAST_IMPLEMENT]).toBe('quick-implement');
  });

  it('has no mapping for IDLE', () => {
    expect(PHASE_SKILL_MAP[Phase.IDLE]).toBeUndefined();
  });

  it('has no mapping for QUICK_COMPLETE and FAST_COMPLETE', () => {
    expect(PHASE_SKILL_MAP[Phase.QUICK_COMPLETE]).toBeUndefined();
    expect(PHASE_SKILL_MAP[Phase.FAST_COMPLETE]).toBeUndefined();
  });

  it('covers all main loop phases', () => {
    const mainPhases = [
      Phase.SPECIFY, Phase.PLAN, Phase.UPDATE_TOBE, Phase.TASKS,
      Phase.IMPLEMENT, Phase.UPDATE_ASIS, Phase.COMPLETE,
    ];
    for (const phase of mainPhases) {
      expect(PHASE_SKILL_MAP[phase]).toBeDefined();
    }
  });

  it('maps HYGIENE to hygiene-audit', () => {
    expect(PHASE_SKILL_MAP[Phase.HYGIENE]).toBe('hygiene-audit');
  });
});

describe('resolveSkill', () => {
  it('resolves auto-trigger built-in skill for phase', () => {
    const skill = makeSkill({ id: 'specify-feature' });
    const registry = createRegistry([skill]);

    const result = resolveSkill(
      { phase: Phase.SPECIFY, role: 'architect', mode: 'main' },
      registry,
    );

    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.skill.frontMatter.id).toBe('specify-feature');
    expect(result.source).toBe('builtin');
  });

  it('returns null for IDLE phase (no skill mapped)', () => {
    const skill = makeSkill({ id: 'specify-feature' });
    const registry = createRegistry([skill]);

    const result = resolveSkill(
      { phase: Phase.IDLE, role: 'developer', mode: 'main' },
      registry,
    );

    expect(result).toBeNull();
  });

  it('custom override wins over built-in (same id)', () => {
    const builtin = makeSkill({ id: 'specify-feature', category: 'builtin' });
    const custom = makeSkill({
      id: 'specify-feature',
      category: 'custom',
      frontMatter: { builtin: false },
    });
    const registry = createRegistry([builtin, custom]);

    const result = resolveSkill(
      { phase: Phase.SPECIFY, role: 'architect', mode: 'main' },
      registry,
    );

    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.source).toBe('custom');
  });

  it('filters by role (roles array)', () => {
    const skill = makeSkill({
      id: 'specify-feature',
      frontMatter: { roles: ['architect'] },
    });
    const registry = createRegistry([skill]);

    const result = resolveSkill(
      { phase: Phase.SPECIFY, role: 'developer', mode: 'main' },
      registry,
    );

    expect(result).toBeNull();
  });

  it('empty roles means all roles allowed', () => {
    const skill = makeSkill({
      id: 'specify-feature',
      frontMatter: { roles: [] },
    });
    const registry = createRegistry([skill]);

    const result = resolveSkill(
      { phase: Phase.SPECIFY, role: 'qa', mode: 'main' },
      registry,
    );

    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.skill.frontMatter.id).toBe('specify-feature');
  });

  it('returns null when no auto-trigger skills available', () => {
    const skill = makeSkill({
      id: 'specify-feature',
      frontMatter: { trigger: 'manual' },
    });
    const registry = createRegistry([skill]);

    const result = resolveSkill(
      { phase: Phase.SPECIFY, role: 'architect', mode: 'main' },
      registry,
    );

    expect(result).toBeNull();
  });

  it('both builtin and custom with same id returns merged source', () => {
    const builtin = makeSkill({ id: 'specify-feature', category: 'builtin' });
    const custom = makeSkill({
      id: 'specify-feature',
      category: 'custom',
      frontMatter: { builtin: false },
    });

    const all = [builtin, custom];

    const registry: SkillRegistry = {
      all: () => all,
      findByPhase: (phase: string) => {
        const skillId = PHASE_SKILL_MAP[phase as keyof typeof PHASE_SKILL_MAP];
        if (!skillId) return [];
        return all.filter((s) => s.frontMatter.id === skillId);
      },
      findById: (id: string) => all.find((s) => s.frontMatter.id === id),
      register: () => {},
      has: (id: string) => all.some((s) => s.frontMatter.id === id),
    };

    const result = resolveSkill(
      { phase: Phase.SPECIFY, role: 'architect', mode: 'main' },
      registry,
    );

    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.source).toBe('merged');
  });
});

describe('WORK_TYPE_SKILL_MAP / isWorkType', () => {
  it('maps testing to tdd-workflow and e2e-testing', () => {
    expect(WORK_TYPE_SKILL_MAP.testing).toEqual(['tdd-workflow', 'e2e-testing']);
  });

  it('recognizes known work types and rejects unknown ones', () => {
    expect(isWorkType('security')).toBe(true);
    expect(isWorkType('onboarding')).toBe(true);
    expect(isWorkType('nonsense')).toBe(false);
  });
});

describe('resolveSkillsByWorkType', () => {
  it('returns all testing skills present in the registry', () => {
    const tdd = makeSkill({ id: 'tdd-workflow', frontMatter: { trigger: 'manual', roles: [] } });
    const e2e = makeSkill({ id: 'e2e-testing', frontMatter: { trigger: 'manual', roles: [] } });
    const registry = createRegistry([tdd, e2e]);

    const result = resolveSkillsByWorkType('testing', registry);

    expect(result.map((s) => s.frontMatter.id)).toEqual(['tdd-workflow', 'e2e-testing']);
  });

  it('skips mapped skills that are not registered', () => {
    const tdd = makeSkill({ id: 'tdd-workflow', frontMatter: { roles: [] } });
    const registry = createRegistry([tdd]);

    const result = resolveSkillsByWorkType('testing', registry);

    expect(result.map((s) => s.frontMatter.id)).toEqual(['tdd-workflow']);
  });

  it('returns an empty list for an unknown work type (no throw)', () => {
    const registry = createRegistry([]);

    const result = resolveSkillsByWorkType('bogus' as never, registry);

    expect(result).toEqual([]);
  });

  it('filters by role when a skill restricts its roles', () => {
    const sec = makeSkill({
      id: 'security-review',
      frontMatter: { roles: ['developer', 'architect'] },
    });
    const registry = createRegistry([sec]);

    expect(resolveSkillsByWorkType('security', registry, 'qa')).toEqual([]);
    expect(resolveSkillsByWorkType('security', registry, 'developer')).toHaveLength(1);
  });

  it('allows a skill with empty roles for any role', () => {
    const sec = makeSkill({ id: 'security-review', frontMatter: { roles: [] } });
    const registry = createRegistry([sec]);

    expect(resolveSkillsByWorkType('security', registry, 'qa')).toHaveLength(1);
  });
});
