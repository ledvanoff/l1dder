import { describe, expect, it } from 'vitest';
import { TransitionKind } from '@l1dder/core';
import { FixedClock } from '@l1dder/core/testing';

import { createTestState } from '../../testing.js';
import { RollbackHandler } from './rollback.js';

const NOW = '2026-05-11T12:00:00Z';

describe('RollbackHandler', () => {
  const handler = new RollbackHandler();
  const clock = new FixedClock(NOW);
  const actor = { kind: 'human' as const, id: 'dev' };
  const trigger = { kind: 'cli' as const, command: 'rollback' };

  describe('validate', () => {
    it('allows rollback to adjacent earlier phase', () => {
      const state = createTestState({
        workflow: { current_phase: 'plan', mode: 'main' },
      });

      const result = handler.validate(state, 'specify');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.kind).toBe(TransitionKind.ROLLBACK);
        expect(result.value.from).toBe('plan');
        expect(result.value.to).toBe('specify');
      }
    });

    it('rejects rollback to non-adjacent phase', () => {
      const state = createTestState({
        workflow: { current_phase: 'implement', mode: 'main' },
      });

      const result = handler.validate(state, 'specify');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('FORBIDDEN_TRANSITION');
        expect(result.error.hint).toContain('adjacent');
      }
    });

    it('rejects rollback from idle', () => {
      const state = createTestState({
        workflow: { current_phase: 'idle', mode: 'main' },
      });

      const result = handler.validate(state, 'specify');

      expect(result.ok).toBe(false);
    });

    it('allows rollback tasks → plan', () => {
      const state = createTestState({
        workflow: { current_phase: 'tasks', mode: 'main' },
      });

      const result = handler.validate(state, 'plan');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.kind).toBe(TransitionKind.ROLLBACK);
      }
    });

    it('allows rollback update_asis → implement', () => {
      const state = createTestState({
        workflow: { current_phase: 'update_asis', mode: 'main' },
      });

      const result = handler.validate(state, 'implement');

      expect(result.ok).toBe(true);
    });
  });

  describe('apply', () => {
    it('creates phase_history entry with rollback kind', () => {
      const state = createTestState({
        workflow: { current_phase: 'plan', mode: 'main', phase_history: [] },
      });

      const validateResult = handler.validate(state, 'specify');
      expect(validateResult.ok).toBe(true);
      if (!validateResult.ok) return;

      const newState = handler.apply(state, validateResult.value, actor, trigger, clock);

      const history = newState.workflow.phase_history;
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(
        expect.objectContaining({
          phase: 'specify',
          transition_kind: 'rollback',
          started_at: NOW,
          actor,
          trigger,
        }),
      );
    });

    it('sets target phase status to revisited', () => {
      const state = createTestState({
        workflow: { current_phase: 'plan', mode: 'main' },
      });

      const validateResult = handler.validate(state, 'specify');
      expect(validateResult.ok).toBe(true);
      if (!validateResult.ok) return;

      const newState = handler.apply(state, validateResult.value, actor, trigger, clock);

      expect(newState.workflow.current_phase).toBe('specify');
      expect(newState.workflow.current_status).toBe('revisited');
    });

    it('preserves existing phase_history', () => {
      const existingEntry = {
        phase: 'specify' as const,
        status: 'completed' as const,
        started_at: '2026-05-10T00:00:00Z',
        actor: { kind: 'system' as const },
        trigger: { kind: 'auto' as const, reason: 'test' },
      };

      const state = createTestState({
        workflow: {
          current_phase: 'plan',
          mode: 'main',
          phase_history: [existingEntry],
        },
      });

      const validateResult = handler.validate(state, 'specify');
      expect(validateResult.ok).toBe(true);
      if (!validateResult.ok) return;

      const newState = handler.apply(state, validateResult.value, actor, trigger, clock);

      expect(newState.workflow.phase_history).toHaveLength(2);
    });
  });
});
