import { describe, it, expect } from 'vitest';
import { Phase } from '@l1dder/core';
import { mapPhaseToGroup } from './phase-groups.js';

describe('mapPhaseToGroup', () => {
  it('maps SPECIFY to SPECIFY group', () => {
    expect(mapPhaseToGroup(Phase.SPECIFY)).toBe('SPECIFY');
  });

  it('maps PLAN to PLAN group', () => {
    expect(mapPhaseToGroup(Phase.PLAN)).toBe('PLAN');
  });

  it('maps UPDATE_TOBE to TO_BE_KU group', () => {
    expect(mapPhaseToGroup(Phase.UPDATE_TOBE)).toBe('TO_BE_KU');
  });

  it('maps TASKS to TASKS group', () => {
    expect(mapPhaseToGroup(Phase.TASKS)).toBe('TASKS');
  });

  it('maps IMPLEMENT to IMPLEMENT group', () => {
    expect(mapPhaseToGroup(Phase.IMPLEMENT)).toBe('IMPLEMENT');
  });

  it('maps UPDATE_ASIS to AS_IS_KU group', () => {
    expect(mapPhaseToGroup(Phase.UPDATE_ASIS)).toBe('AS_IS_KU');
  });

  it('maps COMPLETE to COMPLETE group', () => {
    expect(mapPhaseToGroup(Phase.COMPLETE)).toBe('COMPLETE');
  });

  it('maps REVIEW to COMPLETE group', () => {
    expect(mapPhaseToGroup(Phase.REVIEW)).toBe('COMPLETE');
  });

  it('maps HYGIENE to COMPLETE group', () => {
    expect(mapPhaseToGroup(Phase.HYGIENE)).toBe('COMPLETE');
  });

  it('maps IDLE to IDLE group', () => {
    expect(mapPhaseToGroup(Phase.IDLE)).toBe('IDLE');
  });

  it('maps QUICK_PLAN to QUICK group', () => {
    expect(mapPhaseToGroup(Phase.QUICK_PLAN)).toBe('QUICK');
  });

  it('maps QUICK_IMPLEMENT to QUICK group', () => {
    expect(mapPhaseToGroup(Phase.QUICK_IMPLEMENT)).toBe('QUICK');
  });

  it('maps QUICK_COMPLETE to QUICK group', () => {
    expect(mapPhaseToGroup(Phase.QUICK_COMPLETE)).toBe('QUICK');
  });

  it('maps FAST_IMPLEMENT to QUICK group', () => {
    expect(mapPhaseToGroup(Phase.FAST_IMPLEMENT)).toBe('QUICK');
  });

  it('maps FAST_COMPLETE to QUICK group', () => {
    expect(mapPhaseToGroup(Phase.FAST_COMPLETE)).toBe('QUICK');
  });

  it('covers all Phase enum values (exhaustive)', () => {
    const phases = Object.values(Phase);
    expect(phases.length).toBe(15);

    for (const phase of phases) {
      expect(() => mapPhaseToGroup(phase)).not.toThrow();
    }
  });
});
