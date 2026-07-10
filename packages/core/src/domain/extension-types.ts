import type { ParsedSkill } from './skill-types.js';

/**
 * Extension Skills provider interface (P2 placeholder).
 *
 * Extensions declare skills via manifest. Loaded through Tool Registry.
 * See SK9 in design/skills.md.
 */
export interface SkillProvider {
  /** Unique provider identifier. */
  readonly id: string;

  /** Load all skills provided by this extension. */
  loadSkills(): Promise<readonly ParsedSkill[]>;
}
