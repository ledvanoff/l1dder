import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseSpecContract } from './parse-spec-contract.js';

const VALID_CONTRACT = `# Demo Feature

## Summary

Demo prose.

## AI Contract

\`\`\`yaml
feature: FEAT-001
usecases:
  - UC-001-01
decisions: []
models: []
test_contracts:
  - TC-001-01-A
\`\`\`
`;

describe('parseSpecContract', () => {
  it('parses a valid AI Contract block', () => {
    const result = parseSpecContract(VALID_CONTRACT);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      features: ['FEAT-001'],
      usecases: ['UC-001-01'],
      decisions: [],
      models: [],
      test_contracts: ['TC-001-01-A'],
    });
  });

  it('accepts the iteration specs this repository actually ships', () => {
    // Dogfooding guard: L1DDER's own multi-feature iteration specs must satisfy
    // the contract it asks every project to follow.
    const specs = [
      'specs/iter-hard-hardening/spec.md',
      'specs/iter-polish-launch-readiness/spec.md',
    ];

    for (const relativePath of specs) {
      const content = readFileSync(join(process.cwd(), relativePath), 'utf-8');
      const result = parseSpecContract(content);

      expect(result.ok, `${relativePath}: ${JSON.stringify(result)}`).toBe(true);
      if (!result.ok) continue;
      expect(result.value.features.length).toBeGreaterThan(0);
    }
  });

  it('returns err when the AI Contract block is missing', () => {
    const result = parseSpecContract('# Spec\n\n## Summary\n\nNo contract.\n');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SPEC_CONTRACT_MISSING');
  });

  it('returns err when the yaml fence is missing under AI Contract', () => {
    const result = parseSpecContract(
      '## AI Contract\n\nNot a yaml fence.\n',
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SPEC_CONTRACT_MISSING');
  });

  it('returns SPEC_CONTRACT_INVALID_YAML when the yaml is malformed', () => {
    const result = parseSpecContract(`## AI Contract

\`\`\`yaml
feature: FEAT-001
usecases: [
  - UC-001-01
decisions: []
models: []
test_contracts: []
\`\`\`
`);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SPEC_CONTRACT_INVALID_YAML');
  });

  it('returns SPEC_CONTRACT_INVALID_FIELDS when a required key is missing', () => {
    const result = parseSpecContract(`## AI Contract

\`\`\`yaml
feature: FEAT-001
usecases:
  - UC-001-01
decisions: []
models: []
\`\`\`
`);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SPEC_CONTRACT_INVALID_FIELDS');
    expect(result.error.issues?.some((i) => i.path.includes('test_contracts'))).toBe(
      true,
    );
  });

  it('returns SPEC_CONTRACT_INVALID_FIELDS when an id format is invalid', () => {
    const result = parseSpecContract(`## AI Contract

\`\`\`yaml
feature: FEAT-ABC
usecases:
  - UC-001-01
decisions: []
models: []
test_contracts: []
\`\`\`
`);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SPEC_CONTRACT_INVALID_FIELDS');
    expect(result.error.issues?.some((i) => i.path === 'feature')).toBe(true);
  });

  it('accepts empty optional lists for decisions, models, and test_contracts', () => {
    const result = parseSpecContract(`## AI Contract

\`\`\`yaml
feature: FEAT-002
usecases:
  - UC-002-01
decisions: []
models: []
test_contracts: []
\`\`\`
`);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.decisions).toEqual([]);
    expect(result.value.models).toEqual([]);
    expect(result.value.test_contracts).toEqual([]);
  });

  it('returns SPEC_CONTRACT_INVALID_FIELDS when usecases is empty', () => {
    const result = parseSpecContract(`## AI Contract

\`\`\`yaml
feature: FEAT-001
usecases: []
decisions: []
models: []
test_contracts: []
\`\`\`
`);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SPEC_CONTRACT_INVALID_FIELDS');
  });

  it.each(['en', 'ru'] as const)(
    'accepts the shipped %s spec-template.md AI Contract',
    (locale) => {
      const path = join(
        process.cwd(),
        'packages/cli/assets/i18n',
        locale,
        'templates/specs/spec-template.md',
      );
      const content = readFileSync(path, 'utf-8');
      const result = parseSpecContract(content);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.features).toEqual([expect.stringMatching(/^FEAT-\d{3}$/)]);
      expect(result.value.usecases.length).toBeGreaterThan(0);
    },
  );
});
