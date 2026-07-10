import type { PromptPort, PromptChoice } from '@l1dder/core';

/**
 * Non-interactive prompt adapter (--no-prompt / --json / non-TTY).
 *
 * Returns default values when available; throws when a required
 * prompt has no default configured.
 */
export class NonInteractiveAdapter implements PromptPort {
  private readonly yesMode: boolean;

  constructor(opts?: { yes?: boolean }) {
    this.yesMode = opts?.yes ?? false;
  }

  confirm(_message: string): Promise<boolean> {
    return Promise.resolve(this.yesMode ? true : true);
  }

  input(_message: string, defaultValue?: string): Promise<string> {
    if (defaultValue !== undefined) return Promise.resolve(defaultValue);
    return Promise.reject(new MissingPromptDefaultError(
      'Interactive prompt required but --no-prompt is active and no default value is available',
    ));
  }

  select<T extends string>(
    _message: string,
    choices: readonly PromptChoice<T>[],
  ): Promise<T> {
    const first = choices[0];
    if (first) return Promise.resolve(first.value);
    return Promise.reject(new MissingPromptDefaultError(
      'Interactive prompt required but --no-prompt is active and no choices available',
    ));
  }
}

/** Thrown when a prompt is required but no default is available in non-interactive mode. */
export class MissingPromptDefaultError extends Error {
  readonly code = 'MISSING_PROMPT_DEFAULT' as const;

  constructor(message: string) {
    super(message);
    this.name = 'MissingPromptDefaultError';
  }
}
