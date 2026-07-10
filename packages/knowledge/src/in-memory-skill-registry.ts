import type { ParsedSkill, SkillRegistry } from '@l1dder/core';
import { PHASE_SKILL_MAP } from '@l1dder/core';

/**
 * In-memory Map-based implementation of SkillRegistry.
 *
 * `register()` with id dedup (last wins).
 * `findByPhase()` uses PHASE_SKILL_MAP for resolution.
 */
export class InMemorySkillRegistry implements SkillRegistry {
  private readonly skills = new Map<string, ParsedSkill>();

  all(): readonly ParsedSkill[] {
    return [...this.skills.values()];
  }

  findByPhase(phase: string): readonly ParsedSkill[] {
    const skillId = PHASE_SKILL_MAP[phase as keyof typeof PHASE_SKILL_MAP];
    if (!skillId) return [];

    const results: ParsedSkill[] = [];
    for (const skill of this.skills.values()) {
      if (skill.frontMatter.id === skillId) {
        results.push(skill);
      }
    }
    return results;
  }

  findById(id: string): ParsedSkill | undefined {
    return this.skills.get(id);
  }

  register(skill: ParsedSkill): void {
    this.skills.set(skill.frontMatter.id, skill);
  }

  has(id: string): boolean {
    return this.skills.has(id);
  }
}
