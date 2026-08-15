import { describe, it, expect, vi, afterEach } from 'vitest';
import { InMemoryFileSystem, FixedClock, NullLogger } from '@l1dder/core/testing';

import { runCli } from '../program.js';
import { ExitCode } from '../output/exit-codes.js';
import { classifyHelpTopic, formatUnknownHelpTopic } from './unknown-topic.js';
import { slashCommandRef } from '@l1dder/core';

describe('classifyHelpTopic / formatUnknownHelpTopic', () => {
  it('classifies a known phase', () => {
    expect(classifyHelpTopic('specify')).toEqual({ kind: 'phase', phase: 'specify' });
    const text = formatUnknownHelpTopic(
      { kind: 'phase', phase: 'specify' },
      ['status', 'transition'],
    );
    expect(text).toContain(slashCommandRef('specify'));
    expect(text).toContain('l1dder transition --to specify');
    expect(text).not.toMatch(/\/l1dder\./);
  });

  it('classifies a known slash command id', () => {
    expect(classifyHelpTopic('next')).toEqual({ kind: 'slash', id: 'next' });
    const text = formatUnknownHelpTopic(
      { kind: 'slash', id: 'next' },
      ['status'],
    );
    expect(text).toContain(slashCommandRef('next'));
  });

  it('classifies a historical phase alias', () => {
    expect(classifyHelpTopic('to_be_knowledge_update')).toEqual({
      kind: 'phase_alias',
      input: 'to_be_knowledge_update',
      canonical: 'update_tobe',
    });
    const text = formatUnknownHelpTopic(
      {
        kind: 'phase_alias',
        input: 'to_be_knowledge_update',
        canonical: 'update_tobe',
      },
      ['status'],
    );
    expect(text).toContain('update_tobe');
  });

  it('classifies unknown topic with available commands', () => {
    expect(classifyHelpTopic('totally-unknown')).toEqual({
      kind: 'unknown',
      input: 'totally-unknown',
    });
    const text = formatUnknownHelpTopic(
      { kind: 'unknown', input: 'totally-unknown' },
      ['status', 'doctor'],
    );
    expect(text).toContain('status');
    expect(text).toContain('doctor');
  });
});

describe('l1dder help <topic> (DF-011)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function runHelp(topic: string): Promise<{ code: number; stderr: string }> {
    const fs = new InMemoryFileSystem();
    const clock = new FixedClock('2026-01-15T10:00:00Z');
    const logger = new NullLogger();
    let stderr = '';
    const writeSpy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      stderr += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString();
      return true;
    });

    // Match production argv shape used by bin (commander strips node+script).
    const code = await runCli(['node', 'l1dder', 'help', topic, '--no-recover'], {
      fs,
      clock,
      logger,
    });
    writeSpy.mockRestore();
    return { code, stderr };
  }

  it('given a workflow phase, explains slash vs CLI and exits USAGE_ERROR', async () => {
    const { code, stderr } = await runHelp('specify');
    expect(stderr, `stderr was: ${stderr}`).toContain(slashCommandRef('specify'));
    expect(stderr).toContain('l1dder transition --to specify');
    expect(code, `stderr was: ${stderr}`).toBe(ExitCode.USAGE_ERROR);
  });

  it('given a slash command id, explains IDE invocation', async () => {
    const { code, stderr } = await runHelp('next');
    expect(code).toBe(ExitCode.USAGE_ERROR);
    expect(stderr).toContain(slashCommandRef('next'));
  });

  it('given a historical alias, suggests canonical phase', async () => {
    const { code, stderr } = await runHelp('to_be_knowledge_update');
    expect(code).toBe(ExitCode.USAGE_ERROR);
    expect(stderr).toContain('update_tobe');
  });

  it('given garbage, lists available commands', async () => {
    const { code, stderr } = await runHelp('not-a-thing');
    expect(code).toBe(ExitCode.USAGE_ERROR);
    expect(stderr).toContain('Available commands:');
    expect(stderr).toContain('status');
  });
});
