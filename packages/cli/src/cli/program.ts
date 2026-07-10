import { Command } from 'commander';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import type { FileSystemPort, ClockPort } from '@l1dder/core';

import { ExitCode, mapErrorToExitCode, errorToCode, errorToHint } from './output/exit-codes.js';
import { createColorPalette, shouldEnableColor } from './output/colors.js';
import { createFormatter } from './output/formatter.js';
import type { OutputFormatter } from './output/formatter.js';
import type { CommandResult, CommandError } from './output/formatter.js';
import type { ColorPalette } from './output/colors.js';
import { parseGlobals, UsageError } from './globals.js';
import type { Globals } from './globals.js';
import { ConsoleLogger } from './logger/console-logger.js';
import { InquirerAdapter } from './prompt/inquirer-adapter.js';
import { NonInteractiveAdapter } from './prompt/non-interactive-adapter.js';
import { buildContext } from './context.js';
import type { CliContext, CliContextOverrides } from './context.js';
import { checkCrashRecovery } from './middleware/crash-recovery.js';
import { NodeShell } from './adapters/shell.js';
import { createNodeFs } from './adapters/node-fs.js';

/** Commands that skip crash recovery check. */
const SKIP_RECOVERY_COMMANDS = new Set(['init', 'help']);

/**
 * Commander collector for repeatable `--ai` flags (also splits comma-separated values).
 */
function collectAiAdapter(value: string, previous: string[]): string[] {
  return previous.concat(
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  );
}

/**
 * Create and configure the Commander program.
 *
 * Exported for testing — `runCli()` is the main entry point.
 */
function createProgram(
  globals: Globals,
  output: OutputFormatter,
  colors: ColorPalette,
  overrides?: CliContextOverrides,
): Command {
  const program = new Command();

  const pkgVersion = readPkgVersion();
  program
    .name('l1dder')
    .description('L1DDER — AI-driven development workflow framework')
    .version(pkgVersion, '-V, --version')
    .option('--cwd <path>', 'working directory')
    .option('--json', 'output in JSON format')
    .option('--no-color', 'disable ANSI colors')
    .option('-q, --quiet', 'only critical errors')
    .option('-v, --verbose', 'debug-level output')
    .option('--no-prompt', 'disable interactive prompts')
    .option('--no-recover', 'skip crash recovery prompt');

  const ctx = buildCliContext(globals, output, colors, overrides);

  registerInitCommand(program, ctx);
  registerStatusCommand(program, ctx);
  registerHelpmeCommand(program, ctx);
  registerContextCommand(program, ctx);
  registerStageCommand(program, ctx);
  registerTransitionCommand(program, ctx);
  registerCheckCommand(program, ctx);
  registerDoctorCommand(program, ctx);
  registerQuickCommand(program, ctx);
  registerFastCommand(program, ctx);
  registerSyncCommand(program, ctx);
  registerHookCommand(program, ctx);

  program.hook('preAction', async (thisCommand) => {
    const commandName = thisCommand.args[0] ?? thisCommand.name();
    if (!SKIP_RECOVERY_COMMANDS.has(commandName)) {
      await checkCrashRecovery(ctx);
    }
  });

  return program;
}

function registerInitCommand(program: Command, ctx: CliContext): void {
  program
    .command('init')
    .description('Initialize a new L1DDER project')
    .option('--existing', 'brownfield mode')
    .option('--name <project>', 'project name')
    .option('--force', 'overwrite existing .l1dder/')
    .option('--ai <adapter>', 'generate AI IDE integration (repeatable: cursor, claude)', collectAiAdapter, [])
    .option('--lang <code>', 'documentation & chat language (en | ru)')
    .option('--profile <name>', 'install an optional skill profile (supported: engineering)')
    .action(async (opts: { existing?: boolean; name?: string; force?: boolean; ai?: string[]; lang?: string; profile?: string }) => {
      const { executeInit } = await import('./commands/init/init.js');
      const result = await executeInit(ctx, opts);
      renderResult(ctx, 'init', result);
    });
}

function registerStatusCommand(program: Command, ctx: CliContext): void {
  program
    .command('status')
    .description('Show current project status')
    .action(async () => {
      const { executeStatus } = await import('./commands/status.js');
      const result = await executeStatus(ctx);
      renderResult(ctx, 'status', result);
    });
}

function registerHelpmeCommand(program: Command, ctx: CliContext): void {
  const handler = async (): Promise<void> => {
    const { executeHelpme } = await import('./commands/helpme/helpme.js');
    const result = await executeHelpme(ctx);
    renderResult(ctx, 'helpme', result);
  };

  program
    .command('helpme')
    .description('Contextual navigator: position, discovery checklist, phase guidance, transitions')
    .action(handler);

  program
    .command('now')
    .description('Alias for helpme — what to do next')
    .action(handler);
}

function registerStageCommand(program: Command, ctx: CliContext): void {
  program
    .command('stage [subcommand]')
    .description('Manage project stage (discovery → delivery → maintenance)')
    .option('--to <stage>', 'Target stage for advance/set')
    .option('--force', 'Force advance bypassing readiness checks')
    .option('--reason <reason>', 'Reason for stage change')
    .option('--yes', 'Non-interactive confirmation')
    .action(async (subcommand: string | undefined, opts: Record<string, unknown>) => {
      const { executeStage } = await import('./commands/stage/stage.js');
      const result = await executeStage(ctx, subcommand, {
        to: opts['to'] as string | undefined,
        force: opts['force'] as boolean | undefined,
        reason: opts['reason'] as string | undefined,
        yes: opts['yes'] as boolean | undefined,
      });
      renderResult(ctx, 'stage', result);
    });
}

function registerContextCommand(program: Command, ctx: CliContext): void {
  program
    .command('context')
    .description('Output project context brief or full rendered context')
    .option('--copy', 'copy to clipboard')
    .option('--file [path]', 'save to file (default: .l1dder/context-brief.md)')
    .option('--full', 'full rendered context (not just brief)')
    .option('--role <role>', 'override role for full mode')
    .option('--phase <phase>', 'override phase for preview')
    .action(async (opts: { copy?: boolean; file?: boolean | string; full?: boolean; role?: string; phase?: string }) => {
      const { executeContext } = await import('./commands/context.js');
      const result = await executeContext(ctx, opts);
      renderResult(ctx, 'context', result);
    });
}

function registerTransitionCommand(program: Command, ctx: CliContext): void {
  program
    .command('transition')
    .description('Execute a phase transition')
    .requiredOption('--to <phase>', 'target phase')
    .option('--trigger-source <kind>', 'trigger kind: cli, slash, auto, recovery', 'cli')
    .option('--slash-command <id>', 'slash command id (when trigger-source=slash)')
    .option('--actor-role <role>', 'actor role', 'user')
    .option('--reason <text>', 'reason for transition')
    .option('--force', 'bypass guards')
    .option('--dry-run', 'validate without writing')
    .action(async (opts: {
      to?: string;
      triggerSource?: string;
      slashCommand?: string;
      actorRole?: string;
      reason?: string;
      force?: boolean;
      dryRun?: boolean;
    }) => {
      const { executeTransition } = await import('./commands/transition.js');
      const result = await executeTransition(ctx, opts);
      renderResult(ctx, 'transition', result);
    });
}

function registerCheckCommand(program: Command, ctx: CliContext): void {
  program
    .command('check')
    .description('Advisory validation of standards and configuration')
    .action(async () => {
      const { executeCheck } = await import('./commands/check.js');
      const result = await executeCheck(ctx);
      renderResult(ctx, 'check', result);
    });
}

function registerDoctorCommand(program: Command, ctx: CliContext): void {
  program
    .command('doctor')
    .description('Run diagnostic checks on project health')
    .option('--section <name>', 'run only a specific section')
    .option('--fix', 'auto-fix fixable issues')
    .option('--deep', 'run deep diagnostics: structural as-is/to-be drift, orphan git-diff, SK10, skills/ide sections')
    .option('--mode <mode>', 'deep-diagnostic sub-mode (requires --deep): production-audit | verification-loop')
    .action(async (opts: { section?: string; fix?: boolean; deep?: boolean; mode?: string }) => {
      const { executeDoctor } = await import('./commands/doctor/doctor.js');
      const result = await executeDoctor(ctx, opts);
      renderResult(ctx, 'doctor', result);
    });
}

function registerQuickCommand(program: Command, ctx: CliContext): void {
  program
    .command('quick [description]')
    .description('Start or finish a quick task (QUICK_PLAN → QUICK_IMPLEMENT → IDLE)')
    .option('--finish', 'complete the active quick task')
    .action(async (description: string | undefined, opts: { finish?: boolean }) => {
      const { executeQuick } = await import('./commands/quick.js');
      const result = await executeQuick(ctx, 'quick', description, opts);
      renderResult(ctx, 'quick', result);
    });
}

function registerFastCommand(program: Command, ctx: CliContext): void {
  program
    .command('fast [description]')
    .description('Start or finish a fast task (FAST_IMPLEMENT → IDLE)')
    .option('--finish', 'complete the active fast task')
    .action(async (description: string | undefined, opts: { finish?: boolean }) => {
      const { executeQuick } = await import('./commands/quick.js');
      const result = await executeQuick(ctx, 'fast', description, opts);
      renderResult(ctx, 'quick', result);
    });
}

function registerSyncCommand(program: Command, ctx: CliContext): void {
  program
    .command('sync')
    .description('Regenerate AI IDE integration files')
    .option('--ai <adapter>', 'adapter target(s) to use (repeatable: cursor, claude)', collectAiAdapter, [])
    .option('--force', 'force overwrite all generated files')
    .option('--dry-run', 'report changes without writing')
    .option('--prune', 'remove orphaned managed files')
    .action(async (opts: { ai?: string[]; force?: boolean; dryRun?: boolean; prune?: boolean }) => {
      const { executeSync } = await import('./commands/sync.js');
      const result = await executeSync(ctx, opts);
      renderResult(ctx, 'sync', result);
    });
}

function registerHookCommand(program: Command, ctx: CliContext): void {
  program
    .command('hook <event>')
    .description('Dispatch a lifecycle hook event (called by IDE, not intended for direct use)')
    .action(async (event: string) => {
      const { runHook } = await import('./commands/hook/run-hook.js');
      const { NodeShell } = await import('./adapters/shell.js');

      const stdinRaw = await readStdin();
      const shell = ctx.shell ?? new NodeShell();
      const exitCode = await runHook(event, stdinRaw, {
        projectRoot: ctx.cwd,
        shell,
        fs: ctx.fs,
      });

      // hook command uses raw exit codes — bypass renderResult.
      _capturedExitCode = exitCode as typeof ExitCode[keyof typeof ExitCode];
    });
}

/** Read all data from stdin as a string. */
async function readStdin(): Promise<string> {
  return new Promise<string>((resolve) => {
    let data = '';
    if (process.stdin.isTTY) {
      resolve('{}');
      return;
    }
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk: string) => { data += chunk; });
    process.stdin.on('end', () => { resolve(data); });
    process.stdin.on('error', () => { resolve('{}'); });
  });
}

/** Captured exit code from the last command action (reset per runCli invocation). */
let _capturedExitCode: ExitCode = ExitCode.SUCCESS;

function renderResult(
  ctx: CliContext,
  command: string,
  result: { exitCode: number; data?: unknown; humanText?: string; error?: { code: string; message: string; hint?: string } },
): void {
  _capturedExitCode = result.exitCode as ExitCode;

  // Discriminate on `error` presence, not on exit code: commands like
  // `doctor`/`check` legitimately return a non-zero exit code alongside a
  // full `data`/`humanText` report (checks found issues — not a crash), and
  // that report must still reach the user in both human and JSON mode.
  if (result.error) {
    const cmdErr: CommandError = {
      command,
      exitCode: result.exitCode,
      code: result.error.code,
      message: result.error.message,
    };
    if (result.error.hint) {
      (cmdErr as { hint: string }).hint = result.error.hint;
    }
    ctx.output.error(cmdErr);
    return;
  }

  const cmdResult: CommandResult = { command, data: result.data };
  if (result.humanText) {
    (cmdResult as { humanText: string }).humanText = result.humanText;
  }
  ctx.output.render(cmdResult);
}

function buildCliContext(
  globals: Globals,
  output: OutputFormatter,
  colors: ColorPalette,
  overrides?: CliContextOverrides,
): CliContext {
  const fs: FileSystemPort = overrides?.fs ?? createNodeFs();
  const clock: ClockPort = overrides?.clock ?? { now: () => new Date().toISOString() };
  const logger = overrides?.logger ?? new ConsoleLogger({ quiet: globals.quiet, verbose: globals.verbose, json: globals.json });
  const prompt = overrides?.prompt ?? (globals.noPrompt ? new NonInteractiveAdapter() : new InquirerAdapter());
  const shell = overrides?.shell ?? new NodeShell();

  return buildContext(globals, {
    fs,
    clock,
    logger,
    prompt,
    output: overrides?.output ?? output,
    colors: overrides?.colors ?? colors,
    shell,
  });
}

function readPkgVersion(): string {
  try {
    // Walk up from the current module looking for the nearest package.json.
    // This resolves correctly both from bundled `dist/cli.js` (one level below
    // the package root) and from source `src/cli/program.ts` (two levels below)
    // as well as from an installed `node_modules/l1dder/dist/cli.js`.
    let dir = dirname(fileURLToPath(import.meta.url));
    let prev = '';
    while (dir !== prev) {
      const pkgPath = join(dir, 'package.json');
      if (existsSync(pkgPath)) {
        const parsed: unknown = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        if (typeof parsed === 'object' && parsed !== null && 'version' in parsed) {
          const version: unknown = (parsed as Record<string, unknown>)['version'];
          return typeof version === 'string' ? version : '0.0.0';
        }
        return '0.0.0';
      }
      prev = dir;
      dir = dirname(dir);
    }
    return '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Main CLI entry point.
 *
 * Parses argv, creates program, executes command, returns exit code.
 * Used by bin entry and e2e tests.
 */
export async function runCli(
  argv: string[],
  overrides?: CliContextOverrides,
): Promise<number> {
  let globals: Globals;
  try {
    const rawOpts = parseRawGlobals(argv);
    globals = parseGlobals(rawOpts);
  } catch (e) {
    if (e instanceof UsageError) {
      process.stderr.write(`Error: ${e.message}\n`);
      return ExitCode.USAGE_ERROR;
    }
    process.stderr.write(`Error: ${(e as Error).message}\n`);
    return ExitCode.GENERIC_ERROR;
  }

  const colorEnabled = shouldEnableColor({ noColor: !globals.color, json: globals.json });
  const colors = createColorPalette(colorEnabled);
  const mode = globals.json ? 'json' as const : 'human' as const;
  const output = createFormatter(mode, colors);

  _capturedExitCode = ExitCode.SUCCESS;

  const program = createProgram(globals, output, colors, overrides);

  try {
    await program.parseAsync(argv);
    return _capturedExitCode;
  } catch (e) {
    const exitCode = e instanceof UsageError ? ExitCode.USAGE_ERROR : mapErrorToExitCode(e);
    const code = e instanceof UsageError ? 'USAGE_ERROR' : errorToCode(e);
    const message = e instanceof Error ? e.message : 'Unknown error';
    const hint = errorToHint(e);

    const cmdErr: CommandError = { command: 'unknown', exitCode, code, message };
    if (hint) {
      (cmdErr as { hint: string }).hint = hint;
    }
    output.error(cmdErr);
    return exitCode;
  }
}

/**
 * Quick parse of argv to extract global flags before Commander processes them.
 *
 * This allows us to build Globals (and detect conflicts) before
 * Commander triggers command actions.
 */
function parseRawGlobals(argv: string[]): Record<string, unknown> {
  const opts: Record<string, unknown> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--json':
        opts['json'] = true;
        break;
      case '--no-color':
        opts['noColor'] = true;
        break;
      case '-q':
      case '--quiet':
        opts['quiet'] = true;
        break;
      case '-v':
      case '--verbose':
        opts['verbose'] = true;
        break;
      case '--no-prompt':
        opts['noPrompt'] = true;
        break;
      case '--no-recover':
        opts['noRecover'] = true;
        break;
      case '--cwd':
        opts['cwd'] = argv[i + 1];
        i++;
        break;
    }
  }

  return opts;
}
