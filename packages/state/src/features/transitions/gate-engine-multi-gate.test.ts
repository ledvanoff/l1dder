import { describe, expect, it, vi } from 'vitest';
import { ok } from '@l1dder/core';
import type { ClockPort } from '@l1dder/core';
import type * as L1dderCore from '@l1dder/core';
import { NullLogger, FixedClock } from '@l1dder/core/testing';

import type { ApproverPort } from '../../ports/approver-port.js';
import { createTestConfig } from '../../testing.js';

// A transition with two gates isn't present in the real transitions table
// (P2 tech debt: `hasGates`/`evaluate` both silently assumed at most one gate
// per transition). Mocking `requiredGatesFor` lets us exercise the
// multi-gate path without adding a throwaway transition to the whitelist.
vi.mock('@l1dder/core', async (importOriginal) => {
  const actual = await importOriginal<typeof L1dderCore>();
  return {
    ...actual,
    requiredGatesFor: vi.fn(() => ['first-gate', 'second-gate']),
  };
});

const NOW = '2026-07-07T12:00:00Z';
const clock: ClockPort = new FixedClock(NOW);

describe('GateEngine — multiple gates on one transition (P2 tech debt)', () => {
  it('hasGates returns true when only the second gate is enabled', async () => {
    const { GateEngine } = await import('./gate-engine.js');
    const approveFn = vi.fn().mockResolvedValue(ok({ approved: true, approver: 'test', timestamp: NOW }));
    const port: ApproverPort = { approve: approveFn };
    const engine = new GateEngine(port, new NullLogger(), clock);

    const config = createTestConfig({
      gates: {
        default: { enabled: true },
        overrides: { 'first-gate': { enabled: false } },
      },
    });

    expect(engine.hasGates('specify', 'plan', 'main', config)).toBe(true);
  });

  it('evaluate calls the approver for every enabled gate, not just the first', async () => {
    const { GateEngine } = await import('./gate-engine.js');
    const approveFn = vi.fn().mockResolvedValue(ok({ approved: true, approver: 'test', timestamp: NOW }));
    const port: ApproverPort = { approve: approveFn };
    const engine = new GateEngine(port, new NullLogger(), clock);

    const config = createTestConfig();

    const result = await engine.evaluate(
      'specify', 'plan', 'main',
      config,
      { phase: 'specify', actor: { kind: 'system' }, state: {} as never, config },
    );

    expect(result.ok).toBe(true);
    expect(approveFn).toHaveBeenCalledTimes(2);
    expect(approveFn).toHaveBeenNthCalledWith(1, 'first-gate', expect.anything());
    expect(approveFn).toHaveBeenNthCalledWith(2, 'second-gate', expect.anything());
  });

  it('evaluate stops at the first gate that rejects, without calling later gates', async () => {
    const { GateEngine } = await import('./gate-engine.js');
    const approveFn = vi.fn().mockResolvedValueOnce(
      ok({ approved: false, approver: 'test', timestamp: NOW, reason: 'not ready' }),
    );
    const port: ApproverPort = { approve: approveFn };
    const engine = new GateEngine(port, new NullLogger(), clock);

    const config = createTestConfig();

    const result = await engine.evaluate(
      'specify', 'plan', 'main',
      config,
      { phase: 'specify', actor: { kind: 'system' }, state: {} as never, config },
    );

    expect(result.ok).toBe(false);
    expect(approveFn).toHaveBeenCalledTimes(1);
  });
});
