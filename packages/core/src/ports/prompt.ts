/**
 * Port for interactive user prompts.
 *
 * Used by CLI commands that require user input (init wizard, stage advance, etc.).
 * Implementations: @inquirer/prompts adapter (production), stub (testing/CI).
 */
export interface PromptPort {
  /** Ask a yes/no confirmation question. */
  confirm(message: string): Promise<boolean>;

  /** Ask for free-text input. */
  input(message: string, defaultValue?: string): Promise<string>;

  /** Ask user to select one option from a list. */
  select<T extends string>(message: string, choices: readonly PromptChoice<T>[]): Promise<T>;
}

/** A single choice in a select prompt. */
export interface PromptChoice<T extends string = string> {
  readonly value: T;
  readonly label: string;
  readonly description?: string;
}
