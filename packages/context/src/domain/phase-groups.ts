/**
 * Phase group mapping for context profile resolution (CE3).
 *
 * Groups 15 Phase Machine phases (incl. HYGIENE) into 9 logical groups
 * used as keys in BASE_PROFILES lookup table.
 */

import { Phase } from '@l1dder/core';

/** Logical phase groups for profile resolution. */
export type PhaseGroup =
  | 'IDLE'
  | 'SPECIFY'
  | 'PLAN'
  | 'TO_BE_KU'
  | 'TASKS'
  | 'IMPLEMENT'
  | 'AS_IS_KU'
  | 'COMPLETE'
  | 'QUICK';

/**
 * Map a Phase enum value to its profile resolution group.
 *
 * Quick/Fast phases all map to QUICK (minimal context).
 * REVIEW and HYGIENE map to COMPLETE (similar end-of-iteration / broad
 * knowledge-audit context needs).
 */
export function mapPhaseToGroup(phase: Phase): PhaseGroup {
  switch (phase) {
    case Phase.IDLE:
      return 'IDLE';
    case Phase.SPECIFY:
      return 'SPECIFY';
    case Phase.PLAN:
      return 'PLAN';
    case Phase.UPDATE_TOBE:
      return 'TO_BE_KU';
    case Phase.TASKS:
      return 'TASKS';
    case Phase.IMPLEMENT:
      return 'IMPLEMENT';
    case Phase.UPDATE_ASIS:
      return 'AS_IS_KU';
    case Phase.COMPLETE:
    case Phase.REVIEW:
    case Phase.HYGIENE:
      return 'COMPLETE';
    case Phase.QUICK_PLAN:
    case Phase.QUICK_IMPLEMENT:
    case Phase.QUICK_COMPLETE:
    case Phase.FAST_IMPLEMENT:
    case Phase.FAST_COMPLETE:
      return 'QUICK';
    default: {
      const _exhaustive: never = phase;
      throw new Error(`Unknown phase: ${String(_exhaustive)}`);
    }
  }
}
