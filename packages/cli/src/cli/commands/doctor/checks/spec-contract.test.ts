import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import { InMemoryFileSystem } from '@l1dder/core/testing';
import { parseTasksMarkdown } from '@l1dder/state';

import { checkSpecContract, SPEC_CONTRACT_SECTION_ID } from './spec-contract.js';

const ROOT = '/doctor-spec-contract';

const LEGACY_SPEC = `# Legacy Feature

## Summary

Old prose without a machine contract.
`;

const VALID_SPEC = `# Demo Feature

## Summary

Demo.

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

const MALFORMED_SPEC = `# Broken Feature

## Summary

Demo.

## AI Contract

\`\`\`yaml
feature: NOT-A-FEATURE
usecases:
  - UC-001-01
decisions: []
models: []
test_contracts: []
\`\`\`
`;

describe('checkSpecContract', () => {
  it('given no specs directory, returns pass (not an error)', async () => {
    const fs = new InMemoryFileSystem();
    const checks = await checkSpecContract(fs, ROOT);

    expect(checks).toHaveLength(1);
    expect(checks[0]?.id).toBe(SPEC_CONTRACT_SECTION_ID);
    expect(checks[0]?.level).toBe('pass');
    expect(checks[0]?.message).toMatch(/no feature specs/i);
  });

  it('given a legacy spec without AI Contract, returns warn not error', async () => {
    const fs = new InMemoryFileSystem();
    await fs.mkdir(`${ROOT}/specs/current`);
    await fs.writeFile(`${ROOT}/specs/current/spec.md`, LEGACY_SPEC);

    const checks = await checkSpecContract(fs, ROOT);

    expect(checks).toHaveLength(1);
    expect(checks[0]?.level).toBe('warn');
    expect(checks[0]?.id).toBe(SPEC_CONTRACT_SECTION_ID);
    expect(checks[0]?.hint).toMatch(/AI Contract/i);
    expect(checks.some((c) => c.level === 'fail')).toBe(false);
  });

  it('given a malformed AI Contract, returns error with structured details', async () => {
    const fs = new InMemoryFileSystem();
    await fs.mkdir(`${ROOT}/specs/current`);
    await fs.writeFile(`${ROOT}/specs/current/spec.md`, MALFORMED_SPEC);

    const checks = await checkSpecContract(fs, ROOT);

    expect(checks).toHaveLength(1);
    expect(checks[0]?.level).toBe('fail');
    expect(checks[0]?.message).toMatch(/invalid AI Contract/i);
    expect(checks[0]?.details?.length).toBeGreaterThan(0);
    expect(checks[0]?.details?.[0]?.path).toMatch(/specs\/current\/spec\.md/);
  });

  it('given a valid AI Contract, returns pass', async () => {
    const fs = new InMemoryFileSystem();
    await fs.mkdir(`${ROOT}/specs/current`);
    await fs.writeFile(`${ROOT}/specs/current/spec.md`, VALID_SPEC);

    const checks = await checkSpecContract(fs, ROOT);

    expect(checks).toHaveLength(1);
    expect(checks[0]?.level).toBe('pass');
    expect(checks[0]?.message).toMatch(/FEAT-001/);
  });
});

describe('shipped tasks-template.md Task List', () => {
  it.each(['en', 'ru'] as const)(
    'parses the %s tasks-template.md Task List with parseTasksMarkdown',
    (locale) => {
      const path = join(
        process.cwd(),
        'packages/cli/assets/i18n',
        locale,
        'templates/specs/tasks-template.md',
      );
      const content = readFileSync(path, 'utf-8');
      const result = parseTasksMarkdown(content);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.tasks.length).toBeGreaterThan(0);
      expect(result.value.tasks[0]?.id).toBe('T-01');
      expect(result.value.tasks.some((t) => t.depends_on.length > 0)).toBe(true);
    },
  );
});
