import { describe, expect, it } from 'vitest';

import { err, isErr, isOk, ok } from './result.js';
import type { Result } from './result.js';

describe('Result', () => {
  describe('ok()', () => {
    it('wraps a value in success Result', () => {
      const result = ok(42);
      expect(result.ok).toBe(true);
      expect(isOk(result) && result.value).toBe(42);
    });

    it('works with complex objects', () => {
      const data = { name: 'test', items: [1, 2, 3] };
      const result = ok(data);
      expect(result.ok).toBe(true);
      expect(isOk(result) && result.value).toBe(data);
    });
  });

  describe('err()', () => {
    it('wraps an error in failure Result', () => {
      const result = err('fail');
      expect(result.ok).toBe(false);
      expect(isErr(result) && result.error).toBe('fail');
    });

    it('works with error objects', () => {
      const error = new Error('something went wrong');
      const result = err(error);
      expect(result.ok).toBe(false);
      expect(isErr(result) && result.error).toBe(error);
    });
  });

  describe('isOk()', () => {
    it('returns true for success Result', () => {
      expect(isOk(ok(1))).toBe(true);
    });

    it('returns false for failure Result', () => {
      expect(isOk(err('x'))).toBe(false);
    });
  });

  describe('isErr()', () => {
    it('returns true for failure Result', () => {
      expect(isErr(err('x'))).toBe(true);
    });

    it('returns false for success Result', () => {
      expect(isErr(ok(1))).toBe(false);
    });
  });

  describe('type narrowing', () => {
    it('narrows to value on isOk', () => {
      const result: Result<number, string> = ok(42);
      if (isOk(result)) {
        const value: number = result.value;
        expect(value).toBe(42);
      }
    });

    it('narrows to error on isErr', () => {
      const result: Result<number, string> = err('bad');
      if (isErr(result)) {
        const error: string = result.error;
        expect(error).toBe('bad');
      }
    });
  });
});
