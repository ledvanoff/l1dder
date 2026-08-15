import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import { ROLE_NONE } from '@l1dder/core';
import { parseSlashCommand } from '@l1dder/knowledge';

import { composeCommandBody } from './command-composer.js';
import { transformCommand } from './command-transformer.js';
import { cursorManifest } from '../../cursor-manifest.js';

/**
 * Contract for the shipped `/l1dder-next` command asset (HARD-6 / T-15):
 * discovered, composed, and rendered to `.cursor/commands/l1dder-next.md`
 * with a projection-backed dispatch body (no local phase-routing table).
 */
describe('l1dder-next command asset', () => {
  const assetPath = join(
    process.cwd(),
    'packages/cli/assets/commands/built-in/next.md',
  );
  const raw = readFileSync(assetPath, 'utf-8');
  const parsed = parseSlashCommand('commands/built-in/next.md', raw);

  it('parses as a built-in no_transition wildcard command', () => {
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.frontMatter.id).toBe('next');
    expect(parsed.value.frontMatter.builtin).toBe(true);
    expect(parsed.value.frontMatter.trigger_kind).toBe('no_transition');
    expect(parsed.value.frontMatter.phase).toBe('*');
  });

  it('declares no persona so the dispatcher does not adopt a domain role', () => {
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.frontMatter.role).toBe(ROLE_NONE);
  });

  it('renders to .cursor/commands/l1dder-next.md with a non-empty composed body', () => {
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const composed = composeCommandBody({
      command: parsed.value,
      persona: null,
      skill: null,
    });
    expect(composed.trim().length).toBeGreaterThan(0);

    const transformed = transformCommand(parsed.value, composed, cursorManifest);
    expect(transformed.relativePath).toBe('.cursor/commands/l1dder-next.md');
    expect(transformed.content).toContain('## Command Instructions');
    expect(transformed.content.trim().length).toBeGreaterThan(0);
  });

  it('composed body references projection CLI and has no local phase-routing table', () => {
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const composed = composeCommandBody({
      command: parsed.value,
      persona: null,
      skill: null,
    });

    expect(composed).toMatch(/l1dder now --json/);
    expect(composed).toMatch(/primary_action/);
    expect(composed).toMatch(/blockers/);
    expect(composed).not.toMatch(/## Next Step/);
    expect(composed).not.toMatch(/## Transition/);

    // Must not embed the phase-chain routing table used by advanced slashes.
    expect(composed).not.toMatch(/constitution:\s*['"]?\/l1dder-specify/);
    expect(composed).not.toMatch(/NEXT_STEP_MAP/);
    expect(composed).not.toMatch(/specify\s*→\s*plan\s*→\s*update-tobe/);
  });
});
