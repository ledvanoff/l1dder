import { describe, expect, it } from 'vitest';

import { PHASE_TO_MODE, Phase, ProjectStage, TransitionKind, WorkflowMode } from './phase.js';
import {
  findTransitionRule,
  isAllowedTransition,
  listAvailableTransitions,
} from './transitions-table.js';
import {
  PROFILE_ROUTES,
  WorkflowProfile,
  isOffRouteIdleEscape,
  isPhaseAllowedInProfile,
  isTransitionAllowedInProfile,
  listProfileTransitions,
  recommendProfile,
} from './workflow-profile.js';
import type { WorkflowProfileId } from './workflow-profile.js';

describe('PROFILE_ROUTES', () => {
  it('keeps IMPLEMENT and UPDATE_ASIS out of both discovery profiles', () => {
    for (const profile of [
      WorkflowProfile.PRODUCT_DISCOVERY,
      WorkflowProfile.FEATURE_DISCOVERY,
    ]) {
      expect(PROFILE_ROUTES[profile]).not.toContain(Phase.IMPLEMENT);
      expect(PROFILE_ROUTES[profile]).not.toContain(Phase.UPDATE_ASIS);
    }
  });

  it('keeps UPDATE_TOBE out of the delivery route', () => {
    expect(PROFILE_ROUTES[WorkflowProfile.DELIVERY]).not.toContain(Phase.UPDATE_TOBE);
  });

  it('limits the hygiene route to idle, hygiene, review and complete', () => {
    expect([...PROFILE_ROUTES[WorkflowProfile.HYGIENE]]).toEqual([
      Phase.IDLE,
      Phase.HYGIENE,
      Phase.REVIEW,
      Phase.COMPLETE,
    ]);
  });
});

describe('isPhaseAllowedInProfile', () => {
  it('forbids IMPLEMENT under product_discovery', () => {
    expect(isPhaseAllowedInProfile(WorkflowProfile.PRODUCT_DISCOVERY, Phase.IMPLEMENT)).toBe(
      false,
    );
  });

  it('allows UPDATE_TOBE under feature_discovery', () => {
    expect(isPhaseAllowedInProfile(WorkflowProfile.FEATURE_DISCOVERY, Phase.UPDATE_TOBE)).toBe(
      true,
    );
  });

  it('allows every main phase when no profile is selected', () => {
    for (const phase of Object.values(Phase)) {
      expect(isPhaseAllowedInProfile(null, phase)).toBe(true);
    }
  });

  it('never restricts quick or fast phases', () => {
    const bypassPhases = [
      Phase.QUICK_PLAN,
      Phase.QUICK_IMPLEMENT,
      Phase.QUICK_COMPLETE,
      Phase.FAST_IMPLEMENT,
      Phase.FAST_COMPLETE,
    ];
    for (const phase of bypassPhases) {
      expect(isPhaseAllowedInProfile(WorkflowProfile.PRODUCT_DISCOVERY, phase)).toBe(true);
    }
  });
});

describe('isTransitionAllowedInProfile', () => {
  it('allows the delivery chain tasks→implement→update_asis under delivery', () => {
    expect(
      isTransitionAllowedInProfile(WorkflowProfile.DELIVERY, Phase.TASKS, Phase.IMPLEMENT),
    ).toBe(true);
    expect(
      isTransitionAllowedInProfile(
        WorkflowProfile.DELIVERY,
        Phase.IMPLEMENT,
        Phase.UPDATE_ASIS,
      ),
    ).toBe(true);
  });

  it('keeps update_asis→complete legal under delivery even though review exists', () => {
    expect(
      isTransitionAllowedInProfile(
        WorkflowProfile.DELIVERY,
        Phase.UPDATE_ASIS,
        Phase.COMPLETE,
      ),
    ).toBe(true);
  });

  it('allows update_tobe→review and update_tobe→complete under product_discovery', () => {
    expect(
      isTransitionAllowedInProfile(
        WorkflowProfile.PRODUCT_DISCOVERY,
        Phase.UPDATE_TOBE,
        Phase.REVIEW,
      ),
    ).toBe(true);
    expect(
      isTransitionAllowedInProfile(
        WorkflowProfile.PRODUCT_DISCOVERY,
        Phase.UPDATE_TOBE,
        Phase.COMPLETE,
      ),
    ).toBe(true);
  });

  it('rejects update_tobe→tasks under product_discovery (tasks is off-route)', () => {
    expect(
      isTransitionAllowedInProfile(
        WorkflowProfile.PRODUCT_DISCOVERY,
        Phase.UPDATE_TOBE,
        Phase.TASKS,
      ),
    ).toBe(false);
  });

  it('allows specify→idle under delivery as an off-route escape', () => {
    expect(
      isTransitionAllowedInProfile(WorkflowProfile.DELIVERY, Phase.SPECIFY, Phase.IDLE),
    ).toBe(true);
  });

  it('rejects specify→plan under delivery (plan is also off-route)', () => {
    expect(
      isTransitionAllowedInProfile(WorkflowProfile.DELIVERY, Phase.SPECIFY, Phase.PLAN),
    ).toBe(false);
  });

  it('rejects on-route tasks→idle under delivery (escape is only for off-route phases)', () => {
    expect(
      isTransitionAllowedInProfile(WorkflowProfile.DELIVERY, Phase.TASKS, Phase.IDLE),
    ).toBe(false);
  });

  it('rejects tasks→implement under product_discovery', () => {
    expect(
      isTransitionAllowedInProfile(
        WorkflowProfile.PRODUCT_DISCOVERY,
        Phase.TASKS,
        Phase.IMPLEMENT,
      ),
    ).toBe(false);
  });

  it('rejects a transition that the phase table already forbids', () => {
    expect(isAllowedTransition(Phase.IDLE, Phase.COMPLETE, WorkflowMode.MAIN)).toBe(false);
    expect(
      isTransitionAllowedInProfile(WorkflowProfile.DELIVERY, Phase.IDLE, Phase.COMPLETE),
    ).toBe(false);
  });

  it('applies no enforcement when profile is null', () => {
    expect(isTransitionAllowedInProfile(null, Phase.TASKS, Phase.IMPLEMENT)).toBe(true);
  });

  it('allows the hygiene route idle→hygiene→review→complete', () => {
    const route: readonly [Phase, Phase][] = [
      [Phase.IDLE, Phase.HYGIENE],
      [Phase.HYGIENE, Phase.REVIEW],
      [Phase.REVIEW, Phase.COMPLETE],
    ];
    for (const [from, to] of route) {
      expect(isTransitionAllowedInProfile(WorkflowProfile.HYGIENE, from, to)).toBe(true);
    }
  });

  it('allows entering hygiene from complete without losing the advisory trigger', () => {
    expect(
      isTransitionAllowedInProfile(WorkflowProfile.HYGIENE, Phase.COMPLETE, Phase.HYGIENE),
    ).toBe(true);
    expect(
      isTransitionAllowedInProfile(WorkflowProfile.HYGIENE, Phase.HYGIENE, Phase.IDLE),
    ).toBe(true);
  });

  it('does not restrict quick or fast mode transitions', () => {
    expect(
      isTransitionAllowedInProfile(
        WorkflowProfile.PRODUCT_DISCOVERY,
        Phase.IDLE,
        Phase.QUICK_PLAN,
      ),
    ).toBe(true);
    expect(
      isTransitionAllowedInProfile(
        WorkflowProfile.PRODUCT_DISCOVERY,
        Phase.FAST_IMPLEMENT,
        Phase.FAST_COMPLETE,
      ),
    ).toBe(true);
  });
});

describe('listProfileTransitions', () => {
  it('drops off-route targets for product_discovery', () => {
    const targets = listProfileTransitions(WorkflowProfile.PRODUCT_DISCOVERY, Phase.TASKS);
    expect(targets).not.toContain(Phase.IMPLEMENT);
  });

  it('offers idle as the sole escape when the current phase is off-route', () => {
    expect(listProfileTransitions(WorkflowProfile.DELIVERY, Phase.SPECIFY)).toEqual([
      Phase.IDLE,
    ]);
    expect(listProfileTransitions(WorkflowProfile.PRODUCT_DISCOVERY, Phase.TASKS)).toEqual([
      Phase.IDLE,
    ]);
  });

  it('offers review and complete from update_tobe under product_discovery', () => {
    const targets = listProfileTransitions(
      WorkflowProfile.PRODUCT_DISCOVERY,
      Phase.UPDATE_TOBE,
    );
    expect(targets).toContain(Phase.REVIEW);
    expect(targets).toContain(Phase.COMPLETE);
    expect(targets).not.toContain(Phase.TASKS);
  });

  it('returns all main targets when no profile is selected', () => {
    const targets = listProfileTransitions(null, Phase.TASKS);
    expect(targets).toContain(Phase.IMPLEMENT);
    expect(targets).toContain(Phase.PLAN);
  });
});

describe('isOffRouteIdleEscape', () => {
  it('returns true for specify→idle after selecting delivery', () => {
    expect(isOffRouteIdleEscape(WorkflowProfile.DELIVERY, Phase.SPECIFY, Phase.IDLE)).toBe(
      true,
    );
  });

  it('returns false when no profile is selected', () => {
    expect(isOffRouteIdleEscape(null, Phase.SPECIFY, Phase.IDLE)).toBe(false);
  });

  it('returns false when the current phase is already on the route', () => {
    expect(isOffRouteIdleEscape(WorkflowProfile.DELIVERY, Phase.TASKS, Phase.IDLE)).toBe(
      false,
    );
  });
});

describe('profile route connectivity', () => {
  /**
   * A legal "forward or out" move: leave the iteration (→ idle) or take a
   * non-rollback table/escape step. Rollback-only must not satisfy this —
   * that is how H-01 hid behind UPDATE_TOBE → PLAN.
   */
  function hasForwardOrOutMove(profile: WorkflowProfileId, from: Phase): boolean {
    const targets = listProfileTransitions(profile, from);
    return targets.some((to) => {
      if (to === Phase.IDLE && from !== Phase.IDLE) {
        return true;
      }
      const rule = findTransitionRule(from, to, WorkflowMode.MAIN);
      return rule !== undefined && rule.kind !== TransitionKind.ROLLBACK;
    });
  }

  it('gives every main phase of every profile at least one legal move forward or out', () => {
    const deadEnds: string[] = [];
    for (const profile of Object.values(WorkflowProfile)) {
      for (const phase of Object.values(Phase)) {
        if (PHASE_TO_MODE[phase] !== WorkflowMode.MAIN) {
          continue;
        }
        if (!hasForwardOrOutMove(profile, phase)) {
          deadEnds.push(`${profile} @ ${phase}`);
        }
      }
    }
    expect(deadEnds).toEqual([]);
  });

  it('gives every quick/fast phase a non-rollback exit in its own mode', () => {
    const deadEnds: string[] = [];
    for (const phase of Object.values(Phase)) {
      const mode = PHASE_TO_MODE[phase];
      if (mode === WorkflowMode.MAIN) {
        continue;
      }
      const forward = listAvailableTransitions(phase, mode).filter(
        (rule) => rule.kind !== TransitionKind.ROLLBACK,
      );
      if (forward.length === 0) {
        deadEnds.push(`${mode} @ ${phase}`);
      }
    }
    expect(deadEnds).toEqual([]);
  });
});

describe('recommendProfile', () => {
  it('suggests product_discovery in discovery stage', () => {
    expect(recommendProfile(ProjectStage.DISCOVERY)).toBe(WorkflowProfile.PRODUCT_DISCOVERY);
  });

  it('suggests delivery in delivery and maintenance stages', () => {
    expect(recommendProfile(ProjectStage.DELIVERY)).toBe(WorkflowProfile.DELIVERY);
    expect(recommendProfile(ProjectStage.MAINTENANCE)).toBe(WorkflowProfile.DELIVERY);
  });
});
