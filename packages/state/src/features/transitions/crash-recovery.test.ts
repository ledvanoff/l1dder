import { describe, expect, it } from 'vitest';
import { FixedClock } from '@l1dder/core/testing';

import { createTestState } from '../../testing.js';
import { CrashRecovery } from './crash-recovery.js';

const NOW = '2026-05-11T12:00:00Z';

describe('CrashRecovery', () => {
  const recovery = new CrashRecovery();
  const clock = new FixedClock(NOW);

  describe('detect', () => {
    it('detects in-flight transition marker', () => {
      const state = createTestState({
        _in_flight_transition: {
          from: 'specify',
          to: 'plan',
          started_at: '2026-05-11T11:00:00Z',
          actor: { kind: 'human', id: 'dev' },
          trigger: { kind: 'cli', command: 'transition' },
        },
      });

      const result = recovery.detect(state);

      expect(result).not.toBeNull();
      expect(result?.from).toBe('specify');
      expect(result?.to).toBe('plan');
    });

    it('returns null when no in-flight marker', () => {
      const state = createTestState();

      const result = recovery.detect(state);

      expect(result).toBeNull();
    });
  });

  describe('resolve', () => {
    const markerState = createTestState({
      workflow: {
        current_phase: 'specify',
        phase_history: [],
      },
      _in_flight_transition: {
        from: 'specify',
        to: 'plan',
        started_at: '2026-05-11T11:00:00Z',
        actor: { kind: 'human', id: 'dev' },
        trigger: { kind: 'cli', command: 'transition' },
      },
    });

    it('resume resolves to target phase', () => {
      const result = recovery.resolve(markerState, 'resume', clock);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.workflow.current_phase).toBe('plan');
        expect(result.value.workflow.current_status).toBe('in_progress');
        expect(result.value._in_flight_transition).toBeUndefined();
        expect(result.value.workflow.phase_history).toHaveLength(1);
        const entry = result.value.workflow.phase_history[0];
        expect(entry?.trigger.kind).toBe('recovery');
      }
    });

    it('rollback resolves to original phase', () => {
      const result = recovery.resolve(markerState, 'rollback', clock);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.workflow.current_phase).toBe('specify');
        expect(result.value.workflow.current_status).toBe('in_progress');
        expect(result.value._in_flight_transition).toBeUndefined();
      }
    });

    it('returns error when no marker present', () => {
      const state = createTestState();

      const result = recovery.resolve(state, 'resume', clock);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('CORRUPTED_STATE');
      }
    });

    // @tc TC-004-01-A
    it('second resolve after resume is a no-op and does not duplicate phase_history', () => {
      const first = recovery.resolve(markerState, 'resume', clock);
      expect(first.ok).toBe(true);
      if (!first.ok) return;

      // Simulate ghost marker still present after a partial persist (DF-007).
      const withGhostMarker = {
        ...first.value,
        _in_flight_transition: markerState._in_flight_transition,
      };

      const second = recovery.resolve(withGhostMarker, 'resume', clock);
      expect(second.ok).toBe(true);
      if (!second.ok) return;

      expect(second.value._in_flight_transition).toBeUndefined();
      expect(second.value.workflow.phase_history).toHaveLength(1);
      expect(second.value.workflow.current_phase).toBe('plan');
    });
  });

  describe('setMarker / clearMarker', () => {
    it('sets in-flight marker', () => {
      const state = createTestState();
      const actor = { kind: 'human' as const, id: 'dev' };
      const trigger = { kind: 'cli' as const, command: 'transition' };

      const markedState = recovery.setMarker(
        state, 'specify', 'plan', actor, trigger, clock,
      );

      expect(markedState._in_flight_transition).toBeDefined();
      expect(markedState._in_flight_transition?.from).toBe('specify');
      expect(markedState._in_flight_transition?.to).toBe('plan');
      expect(markedState._in_flight_transition?.started_at).toBe(NOW);
    });

    it('clears in-flight marker', () => {
      const state = createTestState({
        _in_flight_transition: {
          from: 'specify',
          to: 'plan',
          started_at: NOW,
          actor: { kind: 'system' },
          trigger: { kind: 'cli', command: 'test' },
        },
      });

      const cleared = recovery.clearMarker(state);

      expect(cleared._in_flight_transition).toBeUndefined();
    });
  });
});
