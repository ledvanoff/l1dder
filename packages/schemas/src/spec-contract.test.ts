import { describe, expect, it } from 'vitest';

import { SpecContractSchema } from './spec-contract.js';

describe('SpecContractSchema', () => {
  it('accepts a minimal valid contract with empty optional lists', () => {
    const result = SpecContractSchema.safeParse({
      feature: 'FEAT-001',
      usecases: ['UC-001-01'],
      decisions: [],
      models: [],
      test_contracts: [],
    });

    expect(result.success).toBe(true);
  });

  it('rejects when test_contracts key is missing', () => {
    const result = SpecContractSchema.safeParse({
      feature: 'FEAT-001',
      usecases: ['UC-001-01'],
      decisions: [],
      models: [],
    });

    expect(result.success).toBe(false);
  });

  it('rejects an empty usecases list', () => {
    const result = SpecContractSchema.safeParse({
      feature: 'FEAT-001',
      usecases: [],
      decisions: [],
      models: [],
      test_contracts: [],
    });

    expect(result.success).toBe(false);
  });

  it('normalizes the single-feature shorthand into the features list', () => {
    const result = SpecContractSchema.safeParse({
      feature: 'FEAT-001',
      usecases: ['UC-001-01'],
      decisions: [],
      models: [],
      test_contracts: [],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.features).toEqual(['FEAT-001']);
  });

  it('accepts an iteration spec covering several features', () => {
    const result = SpecContractSchema.safeParse({
      iteration: 'HARD',
      features: ['FEAT-001', 'FEAT-002'],
      usecases: ['UC-001-01'],
      decisions: ['DEC-HARD-01'],
      models: [],
      test_contracts: ['TC-001-05-A'],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.features).toEqual(['FEAT-001', 'FEAT-002']);
    expect(result.data.iteration).toBe('HARD');
  });

  it('rejects a contract that names no feature at all', () => {
    const result = SpecContractSchema.safeParse({
      usecases: ['UC-001-01'],
      decisions: [],
      models: [],
      test_contracts: [],
    });

    expect(result.success).toBe(false);
  });

  it('ignores extra project metadata keys', () => {
    const result = SpecContractSchema.safeParse({
      feature: 'FEAT-001',
      usecases: ['UC-001-01'],
      decisions: [],
      models: [],
      test_contracts: [],
      canonical_registry: 'knowledge/project-registry.yml',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid feature id', () => {
    const result = SpecContractSchema.safeParse({
      feature: 'FEAT-NNN',
      usecases: ['UC-001-01'],
      decisions: [],
      models: [],
      test_contracts: [],
    });

    expect(result.success).toBe(false);
  });
});
