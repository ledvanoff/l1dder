import { describe, expect, it } from 'vitest';

import {
  PHASE_TO_MODE,
  Phase,
  PhaseStatus,
  ProjectStage,
  TransitionKind,
  WorkflowMode,
  suggestCanonicalPhase,
} from './phase.js';

describe('Phase', () => {
  const phaseValues = Object.values(Phase);

  it('has exactly 15 values', () => {
    expect(phaseValues).toHaveLength(15);
  });

  it('all values are unique strings', () => {
    const unique = new Set(phaseValues);
    expect(unique.size).toBe(15);
    for (const v of phaseValues) {
      expect(typeof v).toBe('string');
    }
  });

  it('contains all expected phases', () => {
    expect(phaseValues).toContain('idle');
    expect(phaseValues).toContain('specify');
    expect(phaseValues).toContain('plan');
    expect(phaseValues).toContain('update_tobe');
    expect(phaseValues).toContain('tasks');
    expect(phaseValues).toContain('implement');
    expect(phaseValues).toContain('update_asis');
    expect(phaseValues).toContain('complete');
    expect(phaseValues).toContain('review');
    expect(phaseValues).toContain('hygiene');
    expect(phaseValues).toContain('quick_plan');
    expect(phaseValues).toContain('quick_implement');
    expect(phaseValues).toContain('quick_complete');
    expect(phaseValues).toContain('fast_implement');
    expect(phaseValues).toContain('fast_complete');
  });
});

describe('PhaseStatus', () => {
  it('has exactly 6 values', () => {
    expect(Object.values(PhaseStatus)).toHaveLength(6);
  });
});

describe('WorkflowMode', () => {
  it('has exactly 3 values', () => {
    expect(Object.values(WorkflowMode)).toHaveLength(3);
  });
});

describe('ProjectStage', () => {
  it('has exactly 3 values', () => {
    expect(Object.values(ProjectStage)).toHaveLength(3);
  });
});

describe('TransitionKind', () => {
  it('has exactly 4 values', () => {
    expect(Object.values(TransitionKind)).toHaveLength(4);
  });
});

describe('PHASE_TO_MODE', () => {
  it('maps all 15 phases', () => {
    const mappedPhases = Object.keys(PHASE_TO_MODE);
    expect(mappedPhases).toHaveLength(15);
  });

  it('maps main phases to "main"', () => {
    expect(PHASE_TO_MODE[Phase.IDLE]).toBe('main');
    expect(PHASE_TO_MODE[Phase.SPECIFY]).toBe('main');
    expect(PHASE_TO_MODE[Phase.PLAN]).toBe('main');
    expect(PHASE_TO_MODE[Phase.UPDATE_TOBE]).toBe('main');
    expect(PHASE_TO_MODE[Phase.TASKS]).toBe('main');
    expect(PHASE_TO_MODE[Phase.IMPLEMENT]).toBe('main');
    expect(PHASE_TO_MODE[Phase.UPDATE_ASIS]).toBe('main');
    expect(PHASE_TO_MODE[Phase.COMPLETE]).toBe('main');
    expect(PHASE_TO_MODE[Phase.REVIEW]).toBe('main');
    expect(PHASE_TO_MODE[Phase.HYGIENE]).toBe('main');
  });

  it('maps quick phases to "quick"', () => {
    expect(PHASE_TO_MODE[Phase.QUICK_PLAN]).toBe('quick');
    expect(PHASE_TO_MODE[Phase.QUICK_IMPLEMENT]).toBe('quick');
    expect(PHASE_TO_MODE[Phase.QUICK_COMPLETE]).toBe('quick');
  });

  it('maps fast phases to "fast"', () => {
    expect(PHASE_TO_MODE[Phase.FAST_IMPLEMENT]).toBe('fast');
    expect(PHASE_TO_MODE[Phase.FAST_COMPLETE]).toBe('fast');
  });
});

describe('suggestCanonicalPhase', () => {
  it('maps to_be_knowledge_update to UPDATE_TOBE', () => {
    expect(suggestCanonicalPhase('to_be_knowledge_update')).toBe(
      Phase.UPDATE_TOBE,
    );
  });

  it('maps TO_BE_KU (case-insensitive) to UPDATE_TOBE', () => {
    expect(suggestCanonicalPhase('TO_BE_KU')).toBe(Phase.UPDATE_TOBE);
  });

  it('maps Update-ToBe (hyphen + mixed case) to UPDATE_TOBE', () => {
    expect(suggestCanonicalPhase('Update-ToBe')).toBe(Phase.UPDATE_TOBE);
  });

  it('maps historical AS_IS aliases to UPDATE_ASIS', () => {
    expect(suggestCanonicalPhase('as_is_knowledge_update')).toBe(
      Phase.UPDATE_ASIS,
    );
    expect(suggestCanonicalPhase('AS_IS_KU')).toBe(Phase.UPDATE_ASIS);
  });

  it('returns the same phase when input is already canonical', () => {
    expect(suggestCanonicalPhase('update_tobe')).toBe(Phase.UPDATE_TOBE);
    expect(suggestCanonicalPhase('implement')).toBe(Phase.IMPLEMENT);
  });

  it('returns null for unknown garbage input', () => {
    expect(suggestCanonicalPhase('not_a_phase')).toBeNull();
    expect(suggestCanonicalPhase('')).toBeNull();
  });
});
