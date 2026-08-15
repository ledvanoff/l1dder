import { Phase, type Phase as PhaseType } from '@l1dder/core';

/**
 * Static per-phase guidance for `l1dder helpme`.
 *
 * Language-neutral English — presentation-layer prose only. Must not recommend
 * a next CLI/slash command (Primary Action comes solely from the projection).
 */
export const PHASE_GUIDANCE: Record<PhaseType, readonly string[]> = {
  [Phase.IDLE]: [
    'No active iteration. Use the Primary Action below, or start a quick task when appropriate.',
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
    'Iteration is closing — finish commit and PR workflow when ready.',
  ],
  [Phase.REVIEW]: [
    'Review iteration outcomes and prepare for completion or rework.',
  ],
  [Phase.HYGIENE]: [
    "Interpret doctor findings and reconcile every knowledge/as-is and knowledge/to-be document with the code (no gaps).",
    'Return to idle once the doctor-checklist passes.',
  ],
  [Phase.QUICK_PLAN]: [
    'Plan the quick task scope briefly, then implement.',
  ],
  [Phase.QUICK_IMPLEMENT]: [
    'Implement the quick task. Run lint/typecheck/test before finishing.',
  ],
  [Phase.QUICK_COMPLETE]: [
    'Wrap up the quick task and return to idle.',
  ],
  [Phase.FAST_IMPLEMENT]: [
    'Implement the fast task directly. Run lint/typecheck/test before finishing.',
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
  return [`Work on the current phase (${phase}).`];
}
