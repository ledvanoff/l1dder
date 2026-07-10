import { describe, it, expect } from 'vitest';
import { CharBasedTokenCounter } from './char-based-token-counter.js';

describe('CharBasedTokenCounter', () => {
  it('counts tokens with default ratio 3.0', () => {
    const counter = new CharBasedTokenCounter();
    const text = 'a'.repeat(300);
    expect(counter.count(text)).toBe(100);
  });

  it('counts tokens with custom ratio 2.5', () => {
    const counter = new CharBasedTokenCounter(2.5);
    const text = 'a'.repeat(250);
    expect(counter.count(text)).toBe(100);
  });

  it('returns 0 for empty string', () => {
    const counter = new CharBasedTokenCounter();
    expect(counter.count('')).toBe(0);
  });

  it('rounds up (ceiling)', () => {
    const counter = new CharBasedTokenCounter(3.0);
    const text = 'a'.repeat(301);
    expect(counter.count(text)).toBe(101);
  });

  it('handles single character', () => {
    const counter = new CharBasedTokenCounter(3.0);
    expect(counter.count('x')).toBe(1);
  });

  it('handles ratio 1.0 (1 char = 1 token)', () => {
    const counter = new CharBasedTokenCounter(1.0);
    expect(counter.count('hello')).toBe(5);
  });
});
