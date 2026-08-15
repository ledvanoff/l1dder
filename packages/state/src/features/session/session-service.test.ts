import { describe, expect, it } from 'vitest';
import { FixedClock } from '@l1dder/core/testing';

import { createTestState } from '../../testing.js';
import type { DeliveryRailSession } from '../projection/delivery-rail-index-port.js';
import { SessionService } from './session-service.js';

const NOW = '2026-08-10T15:00:00Z';

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

describe('SessionService', () => {
  const service = new SessionService({ clock: new FixedClock(NOW) });

  it('starts an on-rail session and sets workflow.session + profile', () => {
    const state = createTestState({ workflow: { profile: null } });
    const result = service.start(state, 'HARD-5', [rail({ session: 'HARD-5' })], 'hygiene');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.workflow.profile).toBe('delivery');
    expect(result.value.workflow.session).toEqual({
      iteration: 'ITER-001',
      session: 'HARD-5',
      profile: 'delivery',
      started_at: NOW,
      waiver: null,
    });
    expect(state.workflow.session ?? null).toBeNull();
  });

  it('allows start when rails are empty and records null iteration', () => {
    const state = createTestState();
    const result = service.start(state, 'HARD-5', [], 'delivery');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.workflow.session).toMatchObject({
      iteration: null,
      session: 'HARD-5',
      profile: 'delivery',
      waiver: null,
    });
  });

  // @tc TC-004-03-A
  it('rejects off-road starts without force', () => {
    const result = service.start(
      createTestState(),
      'HARD-9',
      [rail({ session: 'HARD-5' })],
      'delivery',
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SESSION_OFF_ROAD');
  });

  it('records a waiver when force+reason bypasses the guard', () => {
    const result = service.start(
      createTestState(),
      'HARD-9',
      [rail({ session: 'HARD-5' })],
      'delivery',
      { force: true, reason: 'hotfix spike' },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.workflow.session).toEqual({
      iteration: null,
      session: 'HARD-9',
      profile: 'delivery',
      started_at: NOW,
      waiver: { reason: 'hotfix spike', at: NOW },
    });
  });

  it('returns err when force is set without a reason', () => {
    const result = service.start(
      createTestState(),
      'HARD-9',
      [rail({ session: 'HARD-5' })],
      'delivery',
      { force: true, reason: '   ' },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SESSION_FORCE_REASON_REQUIRED');
  });

  it('parks the phase as interrupted when the session did not finish', () => {
    const started = service.start(
      createTestState(),
      'HARD-5',
      [rail({ session: 'HARD-5' })],
      'delivery',
    );
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const ended = service.end(started.value, {
      outcome: 'interrupted',
      evidence: [],
      nextAction: 'resume task sync',
    });

    expect(ended.ok).toBe(true);
    if (!ended.ok) return;
    expect(ended.value.state.workflow.current_status).toBe('interrupted');
  });

  it('resumes an interrupted phase when the next session starts', () => {
    const state = createTestState({
      workflow: { current_status: 'interrupted' },
    });

    const resumed = service.start(
      state,
      'HARD-5',
      [rail({ session: 'HARD-5' })],
      'delivery',
    );

    expect(resumed.ok).toBe(true);
    if (!resumed.ok) return;
    expect(resumed.value.workflow.current_status).toBe('in_progress');
  });

  it('leaves the phase status alone when the session completed', () => {
    const started = service.start(
      createTestState(),
      'HARD-5',
      [rail({ session: 'HARD-5' })],
      'delivery',
    );
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const ended = service.end(started.value, {
      outcome: 'completed',
      evidence: ['tests green'],
      nextAction: null,
    });

    expect(ended.ok).toBe(true);
    if (!ended.ok) return;
    expect(ended.value.state.workflow.current_status).toBe('in_progress');
  });

  it('ends an active session, appends history, and clears the rail', () => {
    const started = service.start(
      createTestState(),
      'HARD-5',
      [rail({ session: 'HARD-5' })],
      'delivery',
    );
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const ended = service.end(started.value, {
      outcome: 'completed',
      evidence: ['shipped session end'],
      nextAction: 'l1dder session status',
    });

    expect(ended.ok).toBe(true);
    if (!ended.ok) return;
    expect(ended.value.state.workflow.session).toBeNull();
    expect(ended.value.record).toEqual({
      iteration: 'ITER-001',
      session: 'HARD-5',
      profile: 'delivery',
      started_at: NOW,
      ended_at: NOW,
      outcome: 'completed',
      evidence: ['shipped session end'],
      next_action: 'l1dder session status',
      waiver: null,
    });
    expect(ended.value.state.workflow.session_history).toEqual([
      ended.value.record,
    ]);
    expect(started.value.workflow.session).not.toBeNull();
  });

  it('returns SESSION_NOT_ACTIVE when nothing is running', () => {
    const result = service.end(createTestState(), {
      outcome: 'interrupted',
      evidence: [],
      nextAction: null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SESSION_NOT_ACTIVE');
  });

  it('returns SESSION_END_EVIDENCE_REQUIRED for completed with empty evidence', () => {
    const started = service.start(
      createTestState(),
      'HARD-5',
      [rail({ session: 'HARD-5' })],
      'delivery',
    );
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const result = service.end(started.value, {
      outcome: 'completed',
      evidence: ['  ', ''],
      nextAction: null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SESSION_END_EVIDENCE_REQUIRED');
    expect(started.value.workflow.session).not.toBeNull();
  });

  it('allows interrupted without evidence and carries over waiver', () => {
    const started = service.start(
      createTestState(),
      'HARD-9',
      [rail({ session: 'HARD-5' })],
      'delivery',
      { force: true, reason: 'spike' },
    );
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const ended = service.end(started.value, {
      outcome: 'handed_off',
      evidence: [],
      nextAction: null,
    });

    expect(ended.ok).toBe(true);
    if (!ended.ok) return;
    expect(ended.value.record.waiver).toEqual({ reason: 'spike', at: NOW });
    expect(ended.value.record.outcome).toBe('handed_off');
    expect(ended.value.record.evidence).toEqual([]);
  });
});
