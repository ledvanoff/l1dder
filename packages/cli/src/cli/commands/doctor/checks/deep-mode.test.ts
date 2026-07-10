import { describe, expect, it } from 'vitest';
import type { State } from '@l1dder/schemas';

import { runDeepMode } from './deep-mode.js';
import type { DoctorSection } from '../types.js';

function section(id: string, checks: DoctorSection['checks']): DoctorSection {
  return { id, label: id, checks };
}

describe('runDeepMode', () => {
  describe('production-audit', () => {
    it('passes when there are no fails, no in-flight marker, and clean git', async () => {
      const sections = [section('knowledge', [{ id: 'k', level: 'pass', message: 'ok' }])];
      const result = await runDeepMode('production-audit', sections, undefined);

      expect(result.id).toBe('mode');
      expect(result.checks.every((c) => c.level !== 'fail')).toBe(true);
      expect(result.checks.find((c) => c.id === 'audit-no-fail')?.level).toBe('pass');
    });

    it('fails audit-no-fail when any section has a fail-level check', async () => {
      const sections = [section('skills', [{ id: 's', level: 'fail', message: 'bad' }])];
      const result = await runDeepMode('production-audit', sections, undefined);

      const check = result.checks.find((c) => c.id === 'audit-no-fail');
      expect(check?.level).toBe('fail');
      expect(check?.message).toContain('1 fail-level check');
    });

    it('warns on a lingering in-flight transition marker', async () => {
      const state = { _in_flight_transition: { from: 'idle', to: 'specify' } } as unknown as State;
      const result = await runDeepMode('production-audit', [], state);

      expect(result.checks.find((c) => c.id === 'audit-in-flight')?.level).toBe('warn');
    });

    it('warns when git working tree is not clean', async () => {
      const shell = {
        exec: () => Promise.resolve({ stdout: ' M knowledge/roadmap.md\n', stderr: '', exitCode: 0 }),
      };
      const result = await runDeepMode('production-audit', [], undefined, { shell, projectRoot: '/project' });

      const check = result.checks.find((c) => c.id === 'audit-git-clean');
      expect(check?.level).toBe('warn');
      expect(check?.message).toContain('1 uncommitted change(s)');
    });

    it('passes when git working tree is clean', async () => {
      const shell = { exec: () => Promise.resolve({ stdout: '', stderr: '', exitCode: 0 }) };
      const result = await runDeepMode('production-audit', [], undefined, { shell, projectRoot: '/project' });

      expect(result.checks.find((c) => c.id === 'audit-git-clean')?.level).toBe('pass');
    });
  });

  describe('verification-loop', () => {
    it('produces a single fail check when any fail-level check exists', async () => {
      const sections = [section('drift', [{ id: 'd', level: 'fail', message: 'bad' }])];
      const result = await runDeepMode('verification-loop', sections, undefined);

      expect(result.checks).toHaveLength(1);
      expect(result.checks[0]?.level).toBe('fail');
    });

    it('produces a warn check when only warn-level checks exist', async () => {
      const sections = [section('drift', [{ id: 'd', level: 'warn', message: 'meh' }])];
      const result = await runDeepMode('verification-loop', sections, undefined);

      expect(result.checks[0]?.level).toBe('warn');
    });

    it('produces a pass check when everything passes', async () => {
      const sections = [section('drift', [{ id: 'd', level: 'pass', message: 'ok' }])];
      const result = await runDeepMode('verification-loop', sections, undefined);

      expect(result.checks[0]?.level).toBe('pass');
    });
  });
});
