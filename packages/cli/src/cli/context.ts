import { join } from 'node:path';

import type {
  FileSystemPort,
  ClockPort,
  LoggerPort,
  ShellPort,
} from '@l1dder/core';
import type { PromptPort } from '@l1dder/core';
import { ConfigSchema } from '@l1dder/schemas';
import type { ContextConfig } from '@l1dder/schemas';
import { StateManager, StateReader } from '@l1dder/state';
import type { StateManagerDeps } from '@l1dder/state';
import { SoloApprover } from '@l1dder/state';
import { KnowledgeReader } from '@l1dder/knowledge';
import { ContextEngine } from '@l1dder/context';
import { GitDriftChecker } from './adapters/drift-checker.js';

/** `ContextConfig` defaults used when `config.yml` is missing or unreadable. */
const DEFAULT_CONTEXT_CONFIG: ContextConfig = ConfigSchema.parse({}).context;

import type { Globals } from './globals.js';
import type { OutputFormatter } from './output/formatter.js';
import type { ColorPalette } from './output/colors.js';

/**
 * DI container for CLI commands (CL1).
 *
 * All domain services are created via lazy factories —
 * `state()` and `contextEngine()` initialize on first call.
 * This allows `init` to work without an existing `.l1dder/` directory.
 */
export interface CliContext {
  readonly cwd: string;
  readonly output: OutputFormatter;
  readonly colors: ColorPalette;
  readonly prompt: PromptPort;
  readonly logger: LoggerPort;
  readonly globals: Globals;
  readonly fs: FileSystemPort;
  readonly clock: ClockPort;
  readonly shell: ShellPort | undefined;
  state(): Promise<StateManager>;
  knowledge(): KnowledgeReader;
  /**
   * Lazily builds the `ContextEngine`, configured from the project's
   * `context:` section in `.l1dder/config.yml` when present (falling back to
   * schema defaults if the project isn't initialized yet or the file can't
   * be read) — P2 tech debt: previously always used hardcoded defaults,
   * ignoring any user customization of `token_budget`/`overrides`/etc.
   */
  contextEngine(): Promise<ContextEngine>;
}

/** Partial overrides for testing and e2e scenarios. */
export interface CliContextOverrides {
  readonly fs?: FileSystemPort | undefined;
  readonly clock?: ClockPort | undefined;
  readonly logger?: LoggerPort | undefined;
  readonly prompt?: PromptPort | undefined;
  readonly shell?: ShellPort | undefined;
  readonly output?: OutputFormatter | undefined;
  readonly colors?: ColorPalette | undefined;
}

/**
 * Build a CliContext from parsed globals and optional overrides.
 *
 * Production creates real Node adapters; tests inject in-memory mocks.
 */
export function buildContext(
  globals: Globals,
  adapters: {
    fs: FileSystemPort;
    clock: ClockPort;
    logger: LoggerPort;
    prompt: PromptPort;
    output: OutputFormatter;
    colors: ColorPalette;
    shell?: ShellPort;
  },
  overrides?: CliContextOverrides,
): CliContext {
  const fs = overrides?.fs ?? adapters.fs;
  const clock = overrides?.clock ?? adapters.clock;
  const logger = overrides?.logger ?? adapters.logger;
  const prompt = overrides?.prompt ?? adapters.prompt;
  const output = overrides?.output ?? adapters.output;
  const colors = overrides?.colors ?? adapters.colors;
  const shell = overrides?.shell ?? adapters.shell;

  let cachedState: StateManager | undefined;
  let cachedKnowledge: KnowledgeReader | undefined;
  let cachedContextEngine: ContextEngine | undefined;

  return {
    cwd: globals.cwd,
    output,
    colors,
    prompt,
    logger,
    globals,
    fs,
    clock,
    shell,

    async state(): Promise<StateManager> {
      if (cachedState) return cachedState;

      const deps: StateManagerDeps = {
        fs,
        clock,
        logger,
        approver: new SoloApprover(clock),
        ...(shell ? { driftChecker: new GitDriftChecker(shell, globals.cwd) } : {}),
      };

      const result = await StateManager.create(deps, { projectDir: globals.cwd });
      if (!result.ok) throw result.error;
      cachedState = result.value;
      return cachedState;
    },

    knowledge(): KnowledgeReader {
      if (cachedKnowledge) return cachedKnowledge;
      cachedKnowledge = new KnowledgeReader({ fs, projectRoot: globals.cwd });
      return cachedKnowledge;
    },

    async contextEngine(): Promise<ContextEngine> {
      if (cachedContextEngine) return cachedContextEngine;

      const configPath = join(globals.cwd, '.l1dder', 'config.yml');
      const configResult = await new StateReader({ fs, logger }).readConfig(configPath);
      const contextConfig = configResult.ok
        ? configResult.value.config.context
        : DEFAULT_CONTEXT_CONFIG;

      cachedContextEngine = ContextEngine.create({
        fs,
        clock,
        config: contextConfig,
        projectRoot: globals.cwd,
      });
      return cachedContextEngine;
    },
  };
}
