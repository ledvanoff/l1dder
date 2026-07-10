import { describe, expect, it, vi } from 'vitest';
import { ok, err, GateRejectedError } from '@l1dder/core';
import type { ClockPort } from '@l1dder/core';
import { NullLogger, FixedClock } from '@l1dder/core/testing';
import type { Mock } from 'vitest';

import type { ApproverPort } from '../../ports/approver-port.js';
import { createTestConfig } from '../../testing.js';
import { GateEngine } from './gate-engine.js';

const NOW = '2026-05-11T12:00:00Z';
const clock: ClockPort = new FixedClock(NOW);

function createMockApprover(
  approved = true,
  reason?: string,
): { port: ApproverPort; approveFn: Mock } {
  const approveFn = vi.fn().mockResolvedValue(
    approved
      ? ok({ approved: true, approver: 'test-approver', timestamp: NOW })
      : ok({ approved: false, approver: 'test-approver', timestamp: NOW, reason }),
  );
  return { port: { approve: approveFn }, approveFn };
}

function createRejectingApprover(
  gateId: string,
  phase: string,
): { port: ApproverPort; approveFn: Mock } {
  const approveFn = vi.fn().mockResolvedValue(
    err(new GateRejectedError(gateId, phase as never, 'test-approver', 'not ready')),
  );
  return { port: { approve: approveFn }, approveFn };
}

describe('GateEngine', () => {
  it('auto-approves when no gates configured for transition', async () => {
    const { port, approveFn } = createMockApprover();
    const logger = new NullLogger();
    const engine = new GateEngine(port, logger, clock);

    const config = createTestConfig();

    const result = await engine.evaluate(
      'idle', 'specify', 'main',
      config,
      { phase: 'idle', actor: { kind: 'system' }, state: {} as never, config },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.approved).toBe(true);
      expect(result.value.approver).toBe('auto');
    }
    expect(approveFn).not.toHaveBeenCalled();
  });

  it('calls approver when gate configured and approver approves', async () => {
    const { port, approveFn } = createMockApprover(true);
    const logger = new NullLogger();
    const engine = new GateEngine(port, logger, clock);

    const config = createTestConfig();

    const result = await engine.evaluate(
      'specify', 'plan', 'main',
      config,
      { phase: 'specify', actor: { kind: 'system' }, state: {} as never, config },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.approved).toBe(true);
      expect(result.value.approver).toBe('test-approver');
    }
    expect(approveFn).toHaveBeenCalledWith(
      'spec-gate',
      expect.objectContaining({ phase: 'specify' }),
    );
  });

  it('returns rejected when approver rejects', async () => {
    const { port } = createRejectingApprover('spec-gate', 'specify');
    const logger = new NullLogger();
    const engine = new GateEngine(port, logger, clock);

    const config = createTestConfig();

    const result = await engine.evaluate(
      'specify', 'plan', 'main',
      config,
      { phase: 'specify', actor: { kind: 'system' }, state: {} as never, config },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('GATE_REJECTED');
    }
  });

  it('skip_allowed bypasses approval', async () => {
    const { port, approveFn } = createMockApprover();
    const logger = new NullLogger();
    const engine = new GateEngine(port, logger, clock);

    const config = createTestConfig({
      gates: {
        default: { skip_allowed: true },
      },
    });

    const result = await engine.evaluate(
      'specify', 'plan', 'main',
      config,
      { phase: 'specify', actor: { kind: 'system' }, state: {} as never, config },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.approved).toBe(true);
    }
    expect(approveFn).not.toHaveBeenCalled();
  });

  it('gate disabled skips approval', async () => {
    const { port, approveFn } = createMockApprover();
    const logger = new NullLogger();
    const engine = new GateEngine(port, logger, clock);

    const config = createTestConfig({
      gates: {
        default: { enabled: false },
      },
    });

    const result = await engine.evaluate(
      'specify', 'plan', 'main',
      config,
      { phase: 'specify', actor: { kind: 'system' }, state: {} as never, config },
    );

    expect(result.ok).toBe(true);
    expect(approveFn).not.toHaveBeenCalled();
  });

  it('hasGates returns true when transition has gate in table', () => {
    const { port } = createMockApprover();
    const logger = new NullLogger();
    const engine = new GateEngine(port, logger, clock);
    const config = createTestConfig();

    expect(engine.hasGates('specify', 'plan', 'main', config)).toBe(true);
  });

  it('hasGates returns false when transition has no gates', () => {
    const { port } = createMockApprover();
    const logger = new NullLogger();
    const engine = new GateEngine(port, logger, clock);
    const config = createTestConfig();

    expect(engine.hasGates('idle', 'specify', 'main', config)).toBe(false);
  });

  it('returns rejected when approver returns not-approved outcome', async () => {
    const { port } = createMockApprover(false, 'spec not ready');
    const logger = new NullLogger();
    const engine = new GateEngine(port, logger, clock);

    const config = createTestConfig();

    const result = await engine.evaluate(
      'specify', 'plan', 'main',
      config,
      { phase: 'specify', actor: { kind: 'system' }, state: {} as never, config },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('GATE_REJECTED');
    }
  });
});
