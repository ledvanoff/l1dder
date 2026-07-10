import { describe, it, expect } from 'vitest';
import type { ShellPort, ShellResult } from '@l1dder/core';
import { GitDriftChecker } from './drift-checker.js';

function createMockShell(stdout: string, exitCode = 0): ShellPort {
  return {
    exec: (): Promise<ShellResult> => Promise.resolve({
      stdout,
      stderr: '',
      exitCode,
    }),
  };
}

function createFailingShell(): ShellPort {
  return {
    exec: () => Promise.reject(new Error('git not available')),
  };
}

describe('GitDriftChecker', () => {
  const fakeTask = {
    id: 'quick-fix-123',
    description: 'fix null check',
    status: 'done' as const,
    created_at: '2026-05-24T10:00:00Z',
    knowledge_drift_warning: false,
  };

  it('detects drift when knowledge files changed', async () => {
    const shell = createMockShell('src/app.ts\nknowledge/to-be/architecture.md\nstandards/conventions.md\n');
    const checker = new GitDriftChecker(shell, '/project');

    const result = await checker.checkDrift(fakeTask, 'knowledge/to-be');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.hasDrift).toBe(true);
      expect(result.value.affectedFiles).toHaveLength(2);
      expect(result.value.affectedFiles).toContain('knowledge/to-be/architecture.md');
      expect(result.value.affectedFiles).toContain('standards/conventions.md');
    }
  });

  it('returns no drift when no knowledge files changed', async () => {
    const shell = createMockShell('src/app.ts\nsrc/utils.ts\n');
    const checker = new GitDriftChecker(shell, '/project');

    const result = await checker.checkDrift(fakeTask, 'knowledge/to-be');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.hasDrift).toBe(false);
      expect(result.value.affectedFiles).toHaveLength(0);
    }
  });

  it('returns empty drift on git failure', async () => {
    const shell = createFailingShell();
    const checker = new GitDriftChecker(shell, '/project');

    const result = await checker.checkDrift(fakeTask, 'knowledge/to-be');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.hasDrift).toBe(false);
    }
  });

  it('returns empty drift on non-zero exit code', async () => {
    const shell = createMockShell('', 128);
    const checker = new GitDriftChecker(shell, '/project');

    const result = await checker.checkDrift(fakeTask, 'knowledge/to-be');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.hasDrift).toBe(false);
    }
  });
});
