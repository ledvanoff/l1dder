import { describe, it, expect } from 'vitest';
import { findSecrets } from './secret-scan.js';
import { isConventionalCommit } from './commit-format.js';
import { isProtectedPath, getProtectedDir } from './protected-path.js';

describe('findSecrets', () => {
  it('detects OpenAI key pattern', () => {
    const findings = findSecrets('my token is sk-abcdefghijklmnopqrstuvwxyz12345');
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.pattern).toContain('OpenAI');
  });

  it('detects GitHub token pattern', () => {
    const findings = findSecrets('token: ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789');
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.pattern).toContain('GitHub');
  });

  it('detects AWS access key', () => {
    const findings = findSecrets('AKIAIOSFODNN7EXAMPLE is my key');
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.pattern).toContain('AWS');
  });

  it('detects private key block', () => {
    const findings = findSecrets('-----BEGIN RSA PRIVATE KEY-----\nABCD...');
    expect(findings.length).toBeGreaterThan(0);
  });

  it('returns empty for clean text', () => {
    const findings = findSecrets('nothing suspicious here — just a normal commit message');
    expect(findings).toHaveLength(0);
  });

  it('truncates matched value in findings', () => {
    const findings = findSecrets('sk-abcdefghijklmnopqrstuvwxyz12345');
    expect(findings[0]?.match).toMatch(/\*\*\*/);
  });
});

describe('isConventionalCommit', () => {
  it('accepts valid conventional commits', () => {
    expect(isConventionalCommit('feat: add hook schemas')).toBe(true);
    expect(isConventionalCommit('fix(cli): handle empty stdin gracefully')).toBe(true);
    expect(isConventionalCommit('docs: update roadmap')).toBe(true);
    expect(isConventionalCommit('chore!: breaking change')).toBe(true);
    expect(isConventionalCommit('refactor(core): extract hook resolution')).toBe(true);
  });

  it('rejects non-conventional commits', () => {
    expect(isConventionalCommit('updated stuff')).toBe(false);
    expect(isConventionalCommit('WIP')).toBe(false);
    expect(isConventionalCommit('')).toBe(false);
    expect(isConventionalCommit('feat add hooks')).toBe(false);
  });
});

describe('isProtectedPath', () => {
  it('identifies knowledge/ as protected', () => {
    expect(isProtectedPath('knowledge/roadmap.md')).toBe(true);
    expect(isProtectedPath('knowledge/to-be/architecture.md')).toBe(true);
  });

  it('identifies standards/ as protected', () => {
    expect(isProtectedPath('standards/conventions.md')).toBe(true);
  });

  it('identifies templates/ as protected', () => {
    expect(isProtectedPath('templates/spec.md')).toBe(true);
  });

  it('identifies archive/ as protected', () => {
    expect(isProtectedPath('archive/ecc-analysis.md')).toBe(true);
  });

  it('does not flag regular source files', () => {
    expect(isProtectedPath('packages/core/src/index.ts')).toBe(false);
    expect(isProtectedPath('specs/iter-eh-hooks/spec.md')).toBe(false);
  });

  it('normalises backslashes on Windows-style paths', () => {
    expect(isProtectedPath('knowledge\\roadmap.md')).toBe(true);
  });
});

describe('getProtectedDir', () => {
  it('returns matching prefix', () => {
    expect(getProtectedDir('knowledge/roadmap.md')).toBe('knowledge/');
  });

  it('returns undefined for non-protected path', () => {
    expect(getProtectedDir('src/index.ts')).toBeUndefined();
  });
});
