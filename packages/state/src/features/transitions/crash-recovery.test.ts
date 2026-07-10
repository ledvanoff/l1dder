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
