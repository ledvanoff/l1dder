import { describe, expect, it } from 'vitest';

import type { DeliveryRailSession } from '../projection/delivery-rail-index-port.js';
import {
  RoadmapRailGuard,
  nextEligibleSession,
} from './roadmap-rail-guard.js';

function rail(
  overrides: Partial<DeliveryRailSession> &
    Pick<DeliveryRailSession, 'session'>,
): DeliveryRailSession {
  return {
    iteration: 'ITER-001',
    title: overrides.session,
    status: 'pending',
    profile: 'delivery',
    dependsOn: [],
    ...overrides,
  };
}

describe('RoadmapRailGuard', () => {
  const guard = new RoadmapRailGuard();

  it('allows any session id when the rail index is empty (rails unknown)', () => {
    const result = guard.check('HARD-5', []);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.railsUnknown).toBe(true);
    expect(result.value.session).toBeNull();
  });

  it('returns SESSION_OFF_ROAD when the id is absent from non-empty rails', () => {
    const result = guard.check('HARD-9', [rail({ session: 'HARD-5' })]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SESSION_OFF_ROAD');
  });

  it('returns SESSION_ALREADY_CLOSED for done or skipped sessions', () => {
    const done = guard.check('HARD-5', [
      rail({ session: 'HARD-5', status: 'done' }),
    ]);
    expect(done.ok).toBe(false);
    if (!done.ok) {
      expect(done.error.code).toBe('SESSION_ALREADY_CLOSED');
    }

    const skipped = guard.check('HARD-5', [
      rail({ session: 'HARD-5', status: 'skipped' }),
    ]);
    expect(skipped.ok).toBe(false);
    if (!skipped.ok) {
      expect(skipped.error.code).toBe('SESSION_ALREADY_CLOSED');
    }
  });

  it('returns SESSION_DEPENDENCY_UNMET naming the blocking ids', () => {
    const result = guard.check('HARD-5', [
      rail({ session: 'HARD-4', status: 'pending' }),
      rail({ session: 'HARD-5', dependsOn: ['HARD-4'] }),
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SESSION_DEPENDENCY_UNMET');
    expect(result.error.blockingIds).toEqual(['HARD-4']);
    expect(result.error.message).toContain('HARD-4');
  });

  it('allows a pending session whose dependencies are done or skipped', () => {
    const result = guard.check('HARD-5', [
      rail({ session: 'HARD-4', status: 'done' }),
      rail({ session: 'HARD-5', dependsOn: ['HARD-4'] }),
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.railsUnknown).toBe(false);
    expect(result.value.session?.session).toBe('HARD-5');
  });
});

describe('nextEligibleSession', () => {
  it('returns the first pending session with met dependencies in declaration order', () => {
    const rails = [
      rail({ session: 'HARD-4', status: 'done' }),
      rail({ session: 'HARD-5', status: 'pending', dependsOn: ['HARD-4'] }),
      rail({ session: 'HARD-6', status: 'pending', dependsOn: ['HARD-5'] }),
    ];

    expect(nextEligibleSession(rails)?.session).toBe('HARD-5');
  });

  it('returns null when no session is eligible', () => {
    const rails = [
      rail({ session: 'HARD-5', status: 'in_progress' }),
      rail({ session: 'HARD-6', status: 'pending', dependsOn: ['HARD-5'] }),
    ];

    expect(nextEligibleSession(rails)).toBeNull();
  });
});
