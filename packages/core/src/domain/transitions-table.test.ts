import { describe, expect, it } from 'vitest';

import { Phase, TransitionKind, WorkflowMode } from './phase.js';
import {
  TRANSITIONS,
  findTransitionRule,
  isAllowedTransition,
  isRollbackAllowed,
  listAvailableTransitions,
  requiredGatesFor,
} from './transitions-table.js';

describe('TRANSITIONS', () => {
  it('has exactly 23 rules (8 main fwd + 5 rollback + 3 hygiene + 4 quick + 3 fast)', () => {
    expect(TRANSITIONS).toHaveLength(23);
  });

  it('every rule references valid Phase values', () => {
    const validPhases = new Set(Object.values(Phase));
    for (const rule of TRANSITIONS) {
      expect(validPhases.has(rule.from)).toBe(true);
      expect(validPhases.has(rule.to)).toBe(true);
    }
  });

  it('every rule references a valid WorkflowMode', () => {
    const validModes = new Set(Object.values(WorkflowMode));
    for (const rule of TRANSITIONS) {
      expect(validModes.has(rule.mode)).toBe(true);
    }
  });

  it('every rule references a valid TransitionKind', () => {
    const validKinds = new Set(Object.values(TransitionKind));
    for (const rule of TRANSITIONS) {
      expect(validKinds.has(rule.kind)).toBe(true);
    }
  });

  it('has no duplicate (from, to, mode) triples', () => {
    const keys = TRANSITIONS.map((r) => `${r.from}|${r.to}|${r.mode}`);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it('snapshot matches expected transitions', () => {
    const serialized = TRANSITIONS.map(
      (r) => `${r.mode}:${r.from}->${r.to}(${r.kind})`,
    );
    expect(serialized).toMatchInlineSnapshot(`
      [
        "main:idle->specify(forward)",
        "main:specify->plan(forward)",
        "main:plan->update_tobe(forward)",
        "main:update_tobe->tasks(forward)",
        "main:tasks->implement(forward)",
        "main:implement->update_asis(forward)",
        "main:update_asis->complete(forward)",
        "main:complete->idle(forward)",
        "main:plan->specify(rollback)",
        "main:update_tobe->plan(rollback)",
        "main:tasks->plan(rollback)",
        "main:implement->tasks(rollback)",
        "main:update_asis->implement(rollback)",
        "main:idle->hygiene(mode_switch)",
        "main:complete->hygiene(mode_switch)",
        "main:hygiene->idle(forward)",
        "quick:idle->quick_plan(mode_switch)",
        "quick:quick_plan->quick_implement(forward)",
        "quick:quick_implement->quick_complete(forward)",
        "quick:quick_complete->idle(forward)",
        "fast:idle->fast_implement(mode_switch)",
        "fast:fast_implement->fast_complete(forward)",
        "fast:fast_complete->idle(forward)",
      ]
    `);
  });
});

describe('isAllowedTransition', () => {
  it('returns true for valid main forward transition', () => {
    expect(isAllowedTransition(Phase.IDLE, Phase.SPECIFY, WorkflowMode.MAIN)).toBe(true);
  });

  it('returns true for valid main rollback transition', () => {
    expect(isAllowedTransition(Phase.PLAN, Phase.SPECIFY, WorkflowMode.MAIN)).toBe(true);
  });

  it('returns false for disallowed transition', () => {
    expect(isAllowedTransition(Phase.IDLE, Phase.IMPLEMENT, WorkflowMode.MAIN)).toBe(false);
  });

  it('returns false for skipping phases', () => {
    expect(isAllowedTransition(Phase.SPECIFY, Phase.TASKS, WorkflowMode.MAIN)).toBe(false);
  });

  it('returns true for quick mode entry', () => {
    expect(isAllowedTransition(Phase.IDLE, Phase.QUICK_PLAN, WorkflowMode.QUICK)).toBe(true);
  });

  it('returns false for cross-mode transition', () => {
    expect(isAllowedTransition(Phase.QUICK_PLAN, Phase.PLAN, WorkflowMode.QUICK)).toBe(false);
  });

  it('returns true for fast mode entry', () => {
    expect(isAllowedTransition(Phase.IDLE, Phase.FAST_IMPLEMENT, WorkflowMode.FAST)).toBe(true);
  });

  it('returns true for IDLE→HYGIENE', () => {
    expect(isAllowedTransition(Phase.IDLE, Phase.HYGIENE, WorkflowMode.MAIN)).toBe(true);
  });

  it('returns true for HYGIENE→IDLE', () => {
    expect(isAllowedTransition(Phase.HYGIENE, Phase.IDLE, WorkflowMode.MAIN)).toBe(true);
  });

  it('returns true for COMPLETE→HYGIENE', () => {
    expect(isAllowedTransition(Phase.COMPLETE, Phase.HYGIENE, WorkflowMode.MAIN)).toBe(true);
  });

  it('returns false for SPECIFY→HYGIENE (not whitelisted)', () => {
    expect(isAllowedTransition(Phase.SPECIFY, Phase.HYGIENE, WorkflowMode.MAIN)).toBe(false);
  });

  it('is deterministic for every (from, to) pair', () => {
    const phases = Object.values(Phase);
    const modes = Object.values(WorkflowMode);
    for (const from of phases) {
      for (const to of phases) {
        for (const mode of modes) {
          const result1 = isAllowedTransition(from, to, mode);
          const result2 = isAllowedTransition(from, to, mode);
          expect(result1).toBe(result2);
        }
      }
    }
  });
});

describe('findTransitionRule', () => {
  it('returns rule for valid transition', () => {
    const rule = findTransitionRule(Phase.SPECIFY, Phase.PLAN, WorkflowMode.MAIN);
    expect(rule).toBeDefined();
    expect(rule?.gates).toEqual(['spec-gate']);
  });

  it('returns undefined for invalid transition', () => {
    expect(findTransitionRule(Phase.IDLE, Phase.COMPLETE, WorkflowMode.MAIN)).toBeUndefined();
  });
});

describe('requiredGatesFor', () => {
  it('returns gates for gated transition', () => {
    expect(requiredGatesFor(Phase.SPECIFY, Phase.PLAN, WorkflowMode.MAIN)).toEqual(['spec-gate']);
  });

  it('returns empty array for ungated transition', () => {
    expect(requiredGatesFor(Phase.IDLE, Phase.SPECIFY, WorkflowMode.MAIN)).toEqual([]);
  });

  it('returns empty array for non-existent transition', () => {
    expect(requiredGatesFor(Phase.IDLE, Phase.COMPLETE, WorkflowMode.MAIN)).toEqual([]);
  });

  it('returns discovery-gate for UPDATE_TOBE→TASKS', () => {
    expect(requiredGatesFor(Phase.UPDATE_TOBE, Phase.TASKS, WorkflowMode.MAIN)).toEqual([
      'discovery-gate',
    ]);
  });

  it('returns implementation-gate for IMPLEMENT→UPDATE_ASIS', () => {
    expect(requiredGatesFor(Phase.IMPLEMENT, Phase.UPDATE_ASIS, WorkflowMode.MAIN)).toEqual([
      'implementation-gate',
    ]);
  });

  it('returns as-is-update-gate for UPDATE_ASIS→COMPLETE', () => {
    expect(requiredGatesFor(Phase.UPDATE_ASIS, Phase.COMPLETE, WorkflowMode.MAIN)).toEqual([
      'as-is-update-gate',
    ]);
  });
});

describe('listAvailableTransitions', () => {
  it('returns two transitions from IDLE in main mode (specify + hygiene)', () => {
    const available = listAvailableTransitions(Phase.IDLE, WorkflowMode.MAIN);
    expect(available).toHaveLength(2);
    const targets = available.map((r) => r.to);
    expect(targets).toContain(Phase.SPECIFY);
    expect(targets).toContain(Phase.HYGIENE);
  });

  it('returns two transitions from COMPLETE in main mode (idle + hygiene)', () => {
    const available = listAvailableTransitions(Phase.COMPLETE, WorkflowMode.MAIN);
    expect(available).toHaveLength(2);
    const targets = available.map((r) => r.to);
    expect(targets).toContain(Phase.IDLE);
    expect(targets).toContain(Phase.HYGIENE);
  });

  it('returns one transition from HYGIENE (back to idle)', () => {
    const available = listAvailableTransitions(Phase.HYGIENE, WorkflowMode.MAIN);
    expect(available).toHaveLength(1);
    expect(available[0]?.to).toBe(Phase.IDLE);
  });

  it('returns two transitions from PLAN (forward + rollback)', () => {
    const available = listAvailableTransitions(Phase.PLAN, WorkflowMode.MAIN);
    expect(available).toHaveLength(2);
    const targets = available.map((r) => r.to);
    expect(targets).toContain(Phase.UPDATE_TOBE);
    expect(targets).toContain(Phase.SPECIFY);
  });

  it('returns empty for REVIEW (no transitions)', () => {
    expect(listAvailableTransitions(Phase.REVIEW, WorkflowMode.MAIN)).toHaveLength(0);
  });

  it('returns quick mode entry from IDLE', () => {
    const available = listAvailableTransitions(Phase.IDLE, WorkflowMode.QUICK);
    expect(available).toHaveLength(1);
    expect(available[0]?.to).toBe(Phase.QUICK_PLAN);
  });
});

describe('isRollbackAllowed', () => {
  it('returns true for adjacent rollback PLAN→SPECIFY', () => {
    expect(isRollbackAllowed(Phase.PLAN, Phase.SPECIFY, WorkflowMode.MAIN)).toBe(true);
  });

  it('returns false for non-adjacent rollback IMPLEMENT→SPECIFY', () => {
    expect(isRollbackAllowed(Phase.IMPLEMENT, Phase.SPECIFY, WorkflowMode.MAIN)).toBe(false);
  });

  it('returns false for forward transitions', () => {
    expect(isRollbackAllowed(Phase.IDLE, Phase.SPECIFY, WorkflowMode.MAIN)).toBe(false);
  });

  it('returns false in quick mode (no rollbacks)', () => {
    expect(isRollbackAllowed(Phase.QUICK_IMPLEMENT, Phase.QUICK_PLAN, WorkflowMode.QUICK)).toBe(
      false,
    );
  });
});
