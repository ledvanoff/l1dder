import type { Command } from 'commander';

/**
 * Canonical Global options help block — single source for every command.
 *
 * Keep descriptions here only; do not duplicate flag text on individual commands.
 */
export const GLOBAL_OPTIONS_HELP = `
Global options:
  --cwd <path>       working directory
  --json             output in JSON format
  --no-color         disable ANSI colors
  -q, --quiet        one-line summary (phase + Primary Action); errors/warnings kept
  -v, --verbose      debug-level / full human disclosure
  --no-prompt        disable interactive prompts
  --no-recover       skip crash recovery prompt
`;

/**
 * Attach {@link GLOBAL_OPTIONS_HELP} to a command and every nested subcommand.
 *
 * New commands registered on the tree receive the section automatically when
 * this helper runs after registration (walk, not a hard-coded name list).
 */
export function attachGlobalOptionsHelp(root: Command): void {
  const visit = (cmd: Command): void => {
    cmd.addHelpText('after', GLOBAL_OPTIONS_HELP);
    for (const sub of cmd.commands) {
      visit(sub);
    }
  };
  visit(root);
}
