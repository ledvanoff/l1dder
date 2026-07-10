import type { ParsedSkill } from './skill-types.js';

/**
 * Registry for loaded and merged L1DDER skills.
 *
 * Implementations: InMemorySkillRegistry (runtime Map-based).
 * Used by Agent Router for phase→skill resolution.
 */
export interface SkillRegistry {
  /** Return all registered skills. */
  all(): readonly ParsedSkill[];

  /** Find skills matching a phase via PHASE_SKILL_MAP. */
  findByPhase(phase: string): readonly ParsedSkill[];

  /** Find a skill by its unique id. */
  findById(id: string): ParsedSkill | undefined;

  /** Register a skill (last wins on id conflict). */
  register(skill: ParsedSkill): void;

  /** Check whether a skill with the given id is registered. */
  has(id: string): boolean;
}
