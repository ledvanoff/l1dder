import { describe, expect, it } from 'vitest';
import { listProfileTransitions } from '@l1dder/core';

import {
  PRIMARY_ACTION_COMMANDS,
  PRIMARY_ACTION_REQUIRED_INPUTS,
  resolvePrimaryAction,
  type PrimaryActionInput,
} from './primary-action.js';

function baseInput(
  overrides: Partial<PrimaryActionInput> = {},
): PrimaryActionInput {
  return {
    hasInFlightTransition: false,
    selectedProfile: 'product_discovery',
    recommendedProfile: 'product_discovery',
    projectStage: 'discovery',
    currentPhase: 'idle',
    discoveryReady: false,
    currentMilestoneId: 'idea',
    currentMilestoneStatus: 'pending',
    missingEvidence: false,
    allowedTransitions: [],
    ...overrides,
  };
}

describe('resolvePrimaryAction', () => {
  it('prioritizes resolve_recovery over every other fact', () => {
    const action = resolvePrimaryAction(
      baseInput({
        hasInFlightTransition: true,
        selectedProfile: null,
        currentMilestoneStatus: 'pending',
      }),
    );

    expect(action.kind).toBe('resolve_recovery');
    expect(action.command).toBe(PRIMARY_ACTION_COMMANDS.resolveRecovery);
  });

  it('selects profile when none is selected and mentions the recommendation', () => {
    const action = resolvePrimaryAction(
      baseInput({
        selectedProfile: null,
        recommendedProfile: 'delivery',
        projectStage: 'delivery',
      }),
    );

    expect(action.kind).toBe('select_profile');
    expect(action.command).toBe(
      PRIMARY_ACTION_COMMANDS.selectProfile('delivery'),
    );
    expect(action.reason).toContain('delivery');
  });

  it('maps pending → start_brainstorm and brainstorming → plan_milestone', () => {
    expect(
      resolvePrimaryAction(baseInput({ currentMilestoneStatus: 'pending' }))
        .kind,
    ).toBe('start_brainstorm');

    const plan = resolvePrimaryAction(
      baseInput({ currentMilestoneStatus: 'brainstorming' }),
    );
    expect(plan.kind).toBe('plan_milestone');
    expect(plan.command).toBe(PRIMARY_ACTION_COMMANDS.planMilestone('idea'));
    expect(plan.needsInput).toBe(true);
    expect(plan.requiredInputs).toEqual(
      PRIMARY_ACTION_REQUIRED_INPUTS.planMilestone,
    );
    expect(plan.requiredInputs?.map((input) => input.flag)).toEqual([
      '--summary',
      '--session',
    ]);
  });

  it('maps planned → start_milestone and in_progress → complete_milestone', () => {
    expect(
      resolvePrimaryAction(baseInput({ currentMilestoneStatus: 'planned' }))
        .kind,
    ).toBe('start_milestone');

    const complete = resolvePrimaryAction(
      baseInput({
        currentMilestoneStatus: 'in_progress',
        missingEvidence: true,
      }),
    );
    expect(complete.kind).toBe('complete_milestone');
    expect(complete.reason).toContain('Evidence is missing');
    expect(complete.needsInput).toBe(true);
    expect(complete.requiredInputs).toEqual(
      PRIMARY_ACTION_REQUIRED_INPUTS.completeMilestone,
    );
    expect(complete.requiredInputs?.map((input) => input.flag)).toEqual([
      '--evidence',
    ]);
  });

  it('start_brainstorm and start_milestone are executable without human flags', () => {
    const start = resolvePrimaryAction(
      baseInput({ currentMilestoneStatus: 'pending' }),
    );
    expect(start.needsInput).toBeUndefined();
    expect(start.requiredInputs).toBeUndefined();

    const work = resolvePrimaryAction(
      baseInput({ currentMilestoneStatus: 'planned' }),
    );
    expect(work.needsInput).toBeUndefined();
    expect(work.requiredInputs).toBeUndefined();
  });

  it('advances stage when discovery is ready but stage is still discovery', () => {
    const action = resolvePrimaryAction(
      baseInput({
        discoveryReady: true,
        projectStage: 'discovery',
        currentMilestoneId: null,
        currentMilestoneStatus: null,
      }),
    );

    expect(action.kind).toBe('advance_stage');
    expect(action.command).toBe(PRIMARY_ACTION_COMMANDS.advanceStage);
  });

  it('transitions phase in delivery toward the first allowed profile target', () => {
    const allowed = listProfileTransitions('delivery', 'tasks');
    expect(allowed.length).toBeGreaterThan(0);
    const to = allowed[0];
    if (to === undefined) {
      throw new Error('expected a delivery transition from tasks');
    }

    const action = resolvePrimaryAction(
      baseInput({
        selectedProfile: 'delivery',
        recommendedProfile: 'delivery',
        projectStage: 'delivery',
        discoveryReady: true,
        currentMilestoneId: null,
        currentMilestoneStatus: null,
        allowedTransitions: allowed,
      }),
    );

    expect(action.kind).toBe('transition_phase');
    expect(action.to).toBe(to);
    expect(action.command).toBe(PRIMARY_ACTION_COMMANDS.transitionPhase(to));
  });

  it('returns none naming the dead-end profile route when no transition is allowed', () => {
    const action = resolvePrimaryAction(
      baseInput({
        selectedProfile: 'delivery',
        projectStage: 'delivery',
        currentPhase: 'idle',
        discoveryReady: true,
        allowedTransitions: [],
      }),
    );

    expect(action.kind).toBe('none');
    expect(action.command).toBe('');
    expect(action.reason).toContain('delivery');
    expect(action.reason).toContain('idle');
  });
});
