import type { FileSystemPort, LoggerPort, SlashCommandRegistry } from '@l1dder/core';
import type { ParsedSlashCommand } from '@l1dder/core';
import type { Result } from '@l1dder/core';
import { ok, err } from '@l1dder/core';
import { join } from 'node:path';

import { LoadError } from '../errors.js';
import { InMemorySlashCommandRegistry } from '../in-memory-slash-command-registry.js';
import { parseSlashCommand } from './slash-command-parser.js';

/** Dependencies for SlashCommandLoader. */
export interface SlashCommandLoaderDeps {
  readonly fs: FileSystemPort;
  readonly logger: LoggerPort;
  readonly projectRoot: string;
}

const BUILTIN_DIR = 'commands/built-in';
const CUSTOM_DIR = 'commands/custom';

/**
 * Loads, parses, and merges L1DDER slash command files into a SlashCommandRegistry.
 *
 * Three-stage pipeline: load (readDir) → parse (frontmatter + Zod) → merge
 * (built-in + custom overrides on id match).
 * Follows the same pattern as `SkillLoader`.
 */
export class SlashCommandLoader {
  private readonly fs: FileSystemPort;
  private readonly logger: LoggerPort;
  private readonly projectRoot: string;

  constructor(deps: SlashCommandLoaderDeps) {
    this.fs = deps.fs;
    this.logger = deps.logger;
    this.projectRoot = deps.projectRoot;
  }

  /** Load built-in slash commands from `commands/built-in/*.md`. */
  async loadBuiltIn(dir?: string): Promise<Result<ParsedSlashCommand[], LoadError>> {
    return this.loadFromDir(dir ?? BUILTIN_DIR);
  }

  /** Load custom slash commands from `commands/custom/*.md`. */
  async loadCustom(dir?: string): Promise<Result<ParsedSlashCommand[], LoadError>> {
    return this.loadFromDir(dir ?? CUSTOM_DIR);
  }

  /**
   * Load all commands (built-in + custom), merge on id conflict, return registry.
   *
   * Resolution: built-in → custom (custom wins on id match, P0 strategy: replace).
   */
  async loadAll(
    builtInDir?: string,
    customDir?: string,
  ): Promise<Result<SlashCommandRegistry, LoadError>> {
    const registry = new InMemorySlashCommandRegistry();

    const builtinResult = await this.loadBuiltIn(builtInDir);
    if (!builtinResult.ok) return err(builtinResult.error);

    for (const command of builtinResult.value) {
      registry.register(command);
    }

    const customResult = await this.loadCustom(customDir);
    if (!customResult.ok) return err(customResult.error);

    for (const customCommand of customResult.value) {
      registry.register(customCommand);
    }

    this.logger.debug(
      `Loaded ${String(registry.getAll().length)} slash commands ` +
      `(${String(builtinResult.value.length)} built-in, ${String(customResult.value.length)} custom)`,
    );

    return ok(registry);
  }

  private async loadFromDir(
    dir: string,
  ): Promise<Result<ParsedSlashCommand[], LoadError>> {
    const dirPath = join(this.projectRoot, dir);

    const dirExists = await this.fs.exists(dirPath);
    if (!dirExists) {
      return ok([]);
    }

    let entries: readonly string[];
    try {
      entries = await this.fs.readDir(dirPath);
    } catch (cause) {
      return err(new LoadError(dirPath, 'Failed to read commands directory', cause));
    }

    const mdFiles = entries.filter((e) => e.endsWith('.md')).sort();
    const commands: ParsedSlashCommand[] = [];

    for (const fileName of mdFiles) {
      const relPath = join(dir, fileName);
      const fullPath = join(this.projectRoot, relPath);

      let content: string;
      try {
        content = await this.fs.readFile(fullPath);
      } catch (cause) {
        return err(new LoadError(relPath, 'Failed to read command file', cause));
      }

      const parseResult = parseSlashCommand(relPath, content);
      if (!parseResult.ok) {
        return err(new LoadError(relPath, parseResult.error.details));
      }

      commands.push(parseResult.value);
    }

    return ok(commands);
  }
}
