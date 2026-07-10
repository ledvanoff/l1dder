import { describe, expect, it } from 'vitest';

import { PhaseSchema, PhaseStatusSchema, WorkflowModeSchema } from '@l1dder/schemas';

import { Phase, PhaseStatus, WorkflowMode } from './domain/phase.js';

describe('schemas↔core sync', () => {
  it('Phase const values match PhaseSchema.options', () => {
    const coreValues = Object.values(Phase).sort();
    const schemaValues = [...PhaseSchema.options].sort();
    expect(coreValues).toEqual(schemaValues);
  });

  it('PhaseStatus const values match PhaseStatusSchema.options', () => {
    const coreValues = Object.values(PhaseStatus).sort();
    const schemaValues = [...PhaseStatusSchema.options].sort();
    expect(coreValues).toEqual(schemaValues);
  });

  it('WorkflowMode const values match WorkflowModeSchema.options', () => {
    const coreValues = Object.values(WorkflowMode).sort();
    const schemaValues = [...WorkflowModeSchema.options].sort();
    expect(coreValues).toEqual(schemaValues);
  });
});
