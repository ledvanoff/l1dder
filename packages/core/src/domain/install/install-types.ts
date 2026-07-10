import type { Config } from '@l1dder/schemas';

/** Install action computed by the planner for a single managed file. */
export type InstallAction = 'create' | 'update' | 'skip' | 'orphan';

/**
 * A transformed IDE output file ready for install planning.
 *
 * Produced by `AIIdeAdapter.transformForInstall()` — contains content and
 * provenance metadata but performs no I/O.
 */
export interface TransformedInstallFile {
  readonly path: string;
  readonly hash: string;
  readonly source: string;
  readonly content: string;
  readonly profile: string | null;
  readonly target: string;
}

/** A single planned install operation for one file. */
export interface InstallPlanItem {
  readonly path: string;
  readonly action: InstallAction;
  readonly target: string;
  readonly source: string;
  readonly hash: string;
}

/** Full install plan for one adapter target. */
export interface InstallPlan {
  readonly items: readonly InstallPlanItem[];
}

/**
 * Resolve the ordered list of adapter IDs to install.
 *
 * Priority: CLI flag > `config.adapters` > legacy `config.adapter` > default `cursor`.
 */
export function resolveAdapterTargets(
  config: Config,
  flagAdapters?: readonly string[],
): readonly string[] {
  if (flagAdapters !== undefined && flagAdapters.length > 0) {
    return [...flagAdapters];
  }
  if (config.adapters.length > 0) {
    return [...config.adapters];
  }
  if (config.adapter !== undefined) {
    return [config.adapter];
  }
  return ['cursor'];
}

/**
 * Normalize legacy single `adapter` field into `adapters[]`.
 *
 * Does not mutate the input config — returns a new array.
 */
export function normalizeAdapters(config: Config): readonly string[] {
  if (config.adapters.length > 0) {
    return [...config.adapters];
  }
  if (config.adapter !== undefined) {
    return [config.adapter];
  }
  return [];
}
