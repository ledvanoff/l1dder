import { describe, expect, it } from 'vitest';

import { createTestState } from '../../testing.js';
import { PhaseStatusManager } from './phase-status.js';

describe('PhaseStatusManager', () => {
  const manager = new PhaseStatusManager();

  describe('transitionStatus', () => {
    it('in_progress → awaiting_gate on gate_required', () => {
      const result = manager.transitionStatus('in_progress', 'gate_required');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe('awaiting_gate');
    });

    it('awaiting_gate → completed on gate_approved', () => {
      const result = manager.transitionStatus('awaiting_gate', 'gate_approved');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe('completed');
    });

    it('awaiting_gate → blocked on gate_rejected', () => {
      const result = manager.transitionStatus('awaiting_gate', 'gate_rejected');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe('blocked');
    });

    it('in_progress → completed on complete', () => {
      const result = manager.transitionStatus('in_progress', 'complete');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe('completed');
    });

    it('in_progress → interrupted on interrupt', () => {
      const result = manager.transitionStatus('in_progress', 'interrupt');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe('interrupted');
    });

    it('awaiting_gate → interrupted on interrupt', () => {
      const result = manager.transitionStatus('awaiting_gate', 'interrupt');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe('interrupted');
    });

    it('blocked → interrupted on interrupt', () => {
      const result = manager.transitionStatus('blocked', 'interrupt');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe('interrupted');
    });

    it('interrupted → in_progress on resume', () => {
      const result = manager.transitionStatus('interrupted', 'resume');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe('in_progress');
    });

    it('returns error for invalid transition', () => {
      const result = manager.transitionStatus('completed', 'gate_required');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('FORBIDDEN_TRANSITION');
      }
    });

    it('returns error for blocked + resume (not valid)', () => {
      const result = manager.transitionStatus('blocked', 'resume');
      expect(result.ok).toBe(false);
    });
  });

  describe('markInterrupted', () => {
    it('sets current_status to interrupted', () => {
      const state = createTestState({
        workflow: { current_status: 'in_progress' },
      });

      const result = manager.markInterrupted(state);
      expect(result.workflow.current_status).toBe('interrupted');
    });
  });

  describe('resumeFromInterrupted', () => {
    it('resumes interrupted to in_progress', () => {
      const state = createTestState({
        workflow: { current_status: 'interrupted', current_phase: 'specify' },
      });

      const result = manager.resumeFromInterrupted(state);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.workflow.current_status).toBe('in_progress');
      }
    });

    it('returns error when not interrupted', () => {
      const state = createTestState({
        workflow: { current_status: 'in_progress' },
      });

      const result = manager.resumeFromInterrupted(state);
      expect(result.ok).toBe(false);
    });
  });
});
