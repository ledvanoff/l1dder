import type { TokenCounterPort } from '../ports/token-counter.js';

/**
 * Character-based token counter (CE4).
 *
 * Approximates tokens as `Math.ceil(text.length / charsPerToken)`.
 * Default ratio 3.0 — balanced for mixed Russian/English/code content.
 * Configurable via `config.yml` → `context.chars_per_token`.
 */
export class CharBasedTokenCounter implements TokenCounterPort {
  private readonly charsPerToken: number;

  constructor(charsPerToken: number = 3.0) {
    this.charsPerToken = charsPerToken;
  }

  count(text: string): number {
    if (text.length === 0) return 0;
    return Math.ceil(text.length / this.charsPerToken);
  }
}
