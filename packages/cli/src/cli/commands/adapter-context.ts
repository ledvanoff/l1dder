import { join } from 'node:path';

import { ClaudeAdapter } from '@l1dder/adapter-claude';
import { CursorAdapter } from '@l1dder/adapter-cursor';
import type { AdapterContext } from '@l1dder/core';
import { IdeAdapterRegistry, resolveAdapterTargets } from '@l1dder/core';
import { PersonaLoader, SlashCommandLoader, SkillLoader, StandardsParser } from '@l1dder/knowledge';
import { StateReader } from '@l1dder/state';

import type { CliContext } from '../context.js';

/** Lazily initialized adapter registry for CLI commands. */
let adapterRegistry: IdeAdapterRegistry | undefined;

/**
 * Parse repeated or comma-separated `--ai` flag values.
 */
export function parseAiFlagValues(values?: readonly string[]): readonly string[] {
  if (values === undefined || values.length === 0) {
    return [];
  }

  return values.flatMap((value) =>
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  );
}

/**
 * Get the shared IDE adapter registry with Cursor and Claude registered.
 */
export function getAdapterRegistry(ctx: CliContext): IdeAdapterRegistry {
  if (!adapterRegistry) {
    adapterRegistry = new IdeAdapterRegistry();
    adapterRegistry.register(new CursorAdapter({ fs: ctx.fs, logger: ctx.logger }));
    adapterRegistry.register(new ClaudeAdapter({ fs: ctx.fs, logger: ctx.logger }));
  }
  return adapterRegistry;
}

/** Supported adapter IDs derived from the registry. */
export function getSupportedAdapters(ctx: CliContext): readonly string[] {
  return getAdapterRegistry(ctx).ids();
}

/** Runtime guard for supported adapter IDs. */
export function validateAdapterId(ctx: CliContext, id: string): boolean {
  return getSupportedAdapters(ctx).includes(id);
}

/**
 * Resolve adapter target IDs: CLI flag > config.adapters > legacy adapter > default cursor.
 */
export async function resolveTargetAdapters(
  ctx: CliContext,
  flagValues?: readonly string[],
): Promise<readonly string[] | undefined> {
  const parsedFlag = parseAiFlagValues(flagValues);
  if (parsedFlag.length > 0) {
    return parsedFlag;
  }

  try {
    const reader = new StateReader({ fs: ctx.fs, logger: ctx.logger });
    const configPath = join(ctx.cwd, '.l1dder', 'config.yml');
    const result = await reader.readConfig(configPath);
    if (!result.ok) {
      return undefined;
    }
    return resolveAdapterTargets(result.value.config);
  } catch {
    return undefined;
  }
}

/**
 * Build a fully loaded adapter context from the current project.
 *
 * The helper keeps `init` and `sync` on the same loading path so adapter
 * generation always sees the same config, standards, commands, personas, and state.
 */
export async function buildAdapterContext(
  ctx: CliContext,
  projectRoot: string,
  options: {
    force?: boolean | undefined;
    dryRun?: boolean | undefined;
  } = {},
): Promise<AdapterContext> {
  const { fs, logger } = ctx;

  const personaLoader = new PersonaLoader({ fs, logger });
  const skillLoader = new SkillLoader({ fs, projectRoot });
  const slashLoader = new SlashCommandLoader({ fs, logger, projectRoot });
  const standardsParser = new StandardsParser({ fs, projectRoot });

  const [personasResult, skillsResult, commandsResult, standardsResult, stateManager] = await Promise.all([
    personaLoader.loadAll(join(projectRoot, 'agents')),
    skillLoader.loadAll(),
    slashLoader.loadAll(),
    standardsParser.loadStandards(),
    ctx.state(),
  ]);

  return {
    projectRoot,
    config: stateManager.configSnapshot(),
    skills: skillsResult.ok ? [...skillsResult.value.all()] : [],
    commands: commandsResult.ok ? [...commandsResult.value.getAll()] : [],
    personas: personasResult.ok ? personasResult.value : [],
    standards: (standardsResult.ok ? standardsResult.value : {}) as unknown as AdapterContext['standards'],
    state: stateManager.currentPosition(),
    force: options.force ?? false,
    dryRun: options.dryRun ?? false,
  };
}
