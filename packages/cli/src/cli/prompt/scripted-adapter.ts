import type { PromptPort, PromptChoice } from '@l1dder/core';

/**
 * Scripted prompt adapter for e2e and integration tests.
 *
 * Pre-configured responses are consumed in order of calls.
 * Throws if a prompt is invoked without a pre-configured answer.
 */
export class ScriptedAdapter implements PromptPort {
  private readonly responses: Map<string, unknown>;

  constructor(responses: Record<string, unknown>) {
    this.responses = new Map(Object.entries(responses));
  }

  confirm(message: string): Promise<boolean> {
    try {
      return Promise.resolve(this.consume(message) as boolean);
    } catch (e) {
      return Promise.reject(e instanceof Error ? e : new Error(String(e)));
    }
  }

  input(message: string, _defaultValue?: string): Promise<string> {
    try {
      return Promise.resolve(this.consume(message) as string);
    } catch (e) {
      return Promise.reject(e instanceof Error ? e : new Error(String(e)));
    }
  }

  select<T extends string>(
    message: string,
    _choices: readonly PromptChoice<T>[],
  ): Promise<T> {
    try {
      return Promise.resolve(this.consume(message) as T);
    } catch (e) {
      return Promise.reject(e instanceof Error ? e : new Error(String(e)));
    }
  }

  private consume(message: string): unknown {
    for (const [key, value] of this.responses) {
      if (message.includes(key)) {
        this.responses.delete(key);
        return value;
      }
    }
    throw new Error(
      `ScriptedAdapter: no pre-configured response for prompt "${message}"`,
    );
  }
}
