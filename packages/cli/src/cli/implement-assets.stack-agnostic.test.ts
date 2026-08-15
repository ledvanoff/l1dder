import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * DF-024: built-in implementation assets must not hard-code the L1DDER
 * framework's own TypeScript/pnpm toolchain. Verify/lint/test commands and
 * layout rules must be derived from the consuming project's standards.
 */
describe('implement assets are stack-agnostic (DF-024)', () => {
  const commandPath = join(
    process.cwd(),
    'packages/cli/assets/commands/built-in/implement.md',
  );
  const skillPath = join(
    process.cwd(),
    'packages/cli/assets/skills/built-in/implement-task.md',
  );
  const personaPath = join(
    process.cwd(),
    'packages/cli/assets/agents/developer.md',
  );

  const forbiddenTokens = [
    'vitest',
    'tsc --noEmit',
    'eslint',
    'pnpm vitest',
    'pnpm lint',
    'pnpm typecheck',
    'packages/',
    'No `any`',
    'no `any`',
    '*.test.ts',
  ] as const;

  it.each([
    ['implement.md', commandPath],
    ['implement-task.md', skillPath],
    ['developer.md', personaPath],
  ] as const)('%s omits hard-coded framework stack tokens', (_label, path) => {
    const content = readFileSync(path, 'utf-8');

    for (const token of forbiddenTokens) {
      expect(content, `unexpected token "${token}" in ${path}`).not.toContain(
        token,
      );
    }

    // Positive contract: assets must point agents at project standards.
    expect(content).toContain('standards/conventions.md');
  });
});
