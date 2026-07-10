import { describe, expect, it } from 'vitest';

import { IdempotencyChecker } from './idempotency.js';

describe('IdempotencyChecker', () => {
  const checker = new IdempotencyChecker();

  it('returns noop when current === target', () => {
    const result = checker.check('specify', 'specify');
    expect(result.isNoop).toBe(true);
  });

  it('returns not-noop when phases differ', () => {
    const result = checker.check('specify', 'plan');
    expect(result.isNoop).toBe(false);
  });

  it('returns noop for idle === idle', () => {
    const result = checker.check('idle', 'idle');
    expect(result.isNoop).toBe(true);
  });

  it('returns not-noop for idle → specify', () => {
    const result = checker.check('idle', 'specify');
    expect(result.isNoop).toBe(false);
  });
});
