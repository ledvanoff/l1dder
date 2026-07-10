import { Phase, type Phase as PhaseType } from '@l1dder/core';

/**
 * Static per-phase guidance for `l1dder helpme`.
 *
 * Language-neutral English — presentation layer only, not domain logic.
 */
export const PHASE_GUIDANCE: Record<PhaseType, readonly string[]> = {
  [Phase.IDLE]: [
    'No active iteration. Start one (/l1dder.specify) or a quick task (l1dder quick).',
  ],
  [Phase.SPECIFY]: [
    'Describe problem, solution and acceptance criteria in spec.md.',
    'Discovery: stay in plan-mode, present 2-3 options, mark the recommended one.',
  ],
  [Phase.PLAN]: [
    'Capture technical approach, architecture impact, file changes and risks in plan.md.',
    'Fill "Options Considered + Recommended"; record significant decisions in state.decisions[] and ADR.',
  ],
  [Phase.UPDATE_TOBE]: [
    'Update to-be artifacts (architecture/erd/usecases) for this iteration.',
  ],
  [Phase.TASKS]: [
    'Break the plan into tasks (T-01…) with depends_on and acceptance criteria.',
  ],
  [Phase.IMPLEMENT]: [
    'Implement tasks per tasks.md. Run lint/typecheck/test before finishing.',
  ],
  [Phase.UPDATE_ASIS]: [
    'Promote changes into as-is and update the roadmap.',
  ],
  [Phase.COMPLETE]: [
    'Iteration is closing — commit and open a PR.',
  ],
  [Phase.REVIEW]: [
    'Review iteration outcomes and prepare for completion or rework.',
  ],
  [Phase.HYGIENE]: [
    "Run 'l1dder doctor --deep --json', interpret the findings, and reconcile every knowledge/as-is and knowledge/to-be document with the code (no gaps).",
    "Transition back to idle ('l1dder transition --to idle') once the doctor-checklist passes.",
  ],
  [Phase.QUICK_PLAN]: [
    'Plan the quick task scope briefly, then implement.',
  ],
  [Phase.QUICK_IMPLEMENT]: [
    'Implement the quick task. Run lint/typecheck/test before --finish.',
  ],
  [Phase.QUICK_COMPLETE]: [
    'Wrap up the quick task and return to idle.',
  ],
  [Phase.FAST_IMPLEMENT]: [
    'Implement the fast task directly. Run lint/typecheck/test before --finish.',
  ],
  [Phase.FAST_COMPLETE]: [
    'Wrap up the fast task and return to idle.',
  ],
};

/**
 * Return guidance lines for a phase, with a safe fallback.
 */
export function getPhaseGuidance(phase: string): readonly string[] {
  if (phase in PHASE_GUIDANCE) {
    return PHASE_GUIDANCE[phase as PhaseType];
  }
  return [`Work on the current phase (${phase}). Run l1dder status for details.`];
}
