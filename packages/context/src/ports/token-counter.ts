/**
 * Port for token counting — abstracts the estimation strategy.
 *
 * Production: CharBasedTokenCounter (ratio 3.0 chars/token).
 * Future: tiktoken adapter for exact counts (P2+).
 */
export interface TokenCounterPort {
  /** Estimate token count for given text. */
  count(text: string): number;
}
