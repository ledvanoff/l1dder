import type { PromptPort, PromptChoice } from '@l1dder/core';

/**
 * Interactive prompt adapter using @inquirer/prompts (CL6).
 *
 * Delegates to per-function imports from @inquirer/prompts.
 * Only used when TTY is available and --no-prompt is not set.
 */
export class InquirerAdapter implements PromptPort {
  async confirm(message: string): Promise<boolean> {
    const { confirm } = await import('@inquirer/prompts');
    return confirm({ message });
  }

  async input(message: string, defaultValue?: string): Promise<string> {
    const { input } = await import('@inquirer/prompts');
    return input({ message, default: defaultValue });
  }

  async select<T extends string>(
    message: string,
    choices: readonly PromptChoice<T>[],
  ): Promise<T> {
    const { select } = await import('@inquirer/prompts');
    return select({
      message,
      choices: choices.map((c) => {
        const choice: { name: string; value: T; description?: string } = {
          name: c.label,
          value: c.value,
        };
        if (c.description) {
          choice.description = c.description;
        }
        return choice;
      }),
    });
  }
}
