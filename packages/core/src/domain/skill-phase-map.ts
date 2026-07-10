import type { Phase } from './phase.js';

/**
 * Maps Phase Machine phases to expected built-in skill ids.
 *
 * Primary resolution mechanism for phase→skill routing (SK4).
 * Multi-phase skills (e.g. quick-implement) have multiple entries pointing to one id.
 * SkillRegistry.findByPhase() uses this map, NOT the front-matter `phase` field.
 */
export const PHASE_SKILL_MAP: Readonly<Partial<Record<Phase, string>>> = {
  specify: 'specify-feature',
  plan: 'plan-implementation',
  update_tobe: 'update-knowledge-tobe',
  tasks: 'decompose-tasks',
  implement: 'implement-task',
  update_asis: 'update-knowledge-asis',
  complete: 'complete-iteration',
  hygiene: 'hygiene-audit',
  quick_plan: 'quick-implement',
  quick_implement: 'quick-implement',
  fast_implement: 'quick-implement',
};
