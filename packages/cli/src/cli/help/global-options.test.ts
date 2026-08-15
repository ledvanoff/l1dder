import { describe, it, expect } from 'vitest';
import type { Command } from 'commander';

import { createProgram } from '../program.js';
import { createColorPalette } from '../output/colors.js';
import { createFormatter } from '../output/formatter.js';
import { parseGlobals } from '../globals.js';
import { GLOBAL_OPTIONS_HELP, attachGlobalOptionsHelp } from './global-options.js';

/**
 * Capture full help including `addHelpText('after', …)` blocks.
 *
 * `helpInformation()` omits after-text; `outputHelp()` renders it (and may
 * throw via `exitOverride` — that is expected).
 */
function captureHelp(cmd: Command): string {
  let out = '';
  cmd.configureOutput({
    writeOut: (str: string) => {
      out += str;
    },
    writeErr: (str: string) => {
      out += str;
    },
  });
  try {
    cmd.outputHelp();
  } catch {
    // exitOverride / helpDisplayed
  }
  return out;
}

function collectCommands(root: Command): Command[] {
  const out: Command[] = [];
  const visit = (cmd: Command): void => {
    out.push(cmd);
    for (const sub of cmd.commands) visit(sub);
  };
  visit(root);
  return out;
}

describe('Global options help (DF-032)', () => {
  it('given --help on any registered command, expect Global options section', () => {
    const globals = parseGlobals({});
    const colors = createColorPalette(false);
    const output = createFormatter('human', colors);
    const program = createProgram(globals, output, colors);

    const commands = collectCommands(program).filter((c) => c.name() !== 'help');
    expect(commands.length).toBeGreaterThan(5);

    for (const cmd of commands) {
      const help = captureHelp(cmd);
      expect(help, `missing Global options on ${cmd.name()}`).toContain(
        'Global options:',
      );
      expect(help).toContain('--json');
      expect(help).toContain('--quiet');
      expect(help).toContain('--no-recover');
      expect(help).toContain('--verbose');
    }
  });

  it('given a newly registered command, attachGlobalOptionsHelp adds the section automatically', () => {
    const globals = parseGlobals({});
    const colors = createColorPalette(false);
    const output = createFormatter('human', colors);
    const program = createProgram(globals, output, colors);

    const newbie = program.command('brand-new-cmd').description('probe');
    attachGlobalOptionsHelp(program);

    const help = captureHelp(newbie);
    expect(help).toContain('Global options:');
    expect(help).toContain('--cwd');
    expect(GLOBAL_OPTIONS_HELP).toContain('--json');
  });
});
