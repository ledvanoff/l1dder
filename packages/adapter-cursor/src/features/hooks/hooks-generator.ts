import { getBuiltinHooks, resolveActiveHooks } from '@l1dder/core';
import type { AdapterManifest } from '@l1dder/core';
import type { HookEvent, HookProfile } from '@l1dder/schemas';
import { computeContentHash } from '../../domain/content-hasher.js';

/** Cursor IDE event name used as keys in .cursor/hooks.json. */
type CursorEvent = string;

/**
 * Mapping from canonical L1DDER hook events to Cursor IDE event names.
 *
 * Source: references/ECC/.cursor/hooks.json (MIT, Affaan Mustafa).
 */
const CANONICAL_TO_CURSOR: Record<HookEvent, CursorEvent> = {
  PreToolUse: 'beforeShellExecution',
  PostToolUse: 'afterFileEdit',
  UserPromptSubmit: 'beforeSubmitPrompt',
  Stop: 'stop',
  SessionStart: 'sessionStart',
  SessionEnd: 'sessionEnd',
  PreCompact: 'preCompact',
};

/** A single hook entry in .cursor/hooks.json. */
interface CursorHookEntry {
  readonly command: string;
  readonly event: string;
  readonly description: string;
}

/** The structure of .cursor/hooks.json as expected by Cursor IDE. */
interface CursorHooksJson {
  readonly version: 1;
  readonly hooks: Record<string, CursorHookEntry[]>;
}

/** Input for the hooks generator. */
export interface HooksGeneratorInput {
  /** Active profile from config.yml (hooks.profile). */
  readonly profile: HookProfile;
  /** Hook IDs explicitly disabled in config.yml (hooks.disabled). */
  readonly disabled: readonly string[];
}

/** Result produced by generateHooks. */
export interface HooksGenerateResult {
  /** Path relative to project root. */
  readonly relativePath: string;
  /** JSON file content (deterministic, pretty-printed). */
  readonly content: string;
  /** SHA-256 content hash (first 12 hex chars). */
  readonly hash: string;
}

/**
 * Generate `.cursor/hooks.json` from active built-in hook definitions (T-06).
 *
 * Groups active hooks (filtered by profile + disabled list) by their canonical
 * event, maps canonical events to Cursor event names, and produces a
 * deterministic JSON output that Cursor IDE can consume.
 *
 * Canonical → Cursor mapping is defined by `CANONICAL_TO_CURSOR`.
 * No environment overrides are applied here — this runs at sync time, not at
 * hook dispatch time; env overrides are applied by the CLI dispatcher.
 */
export function generateHooks(
  input: HooksGeneratorInput,
  manifest: AdapterManifest,
): HooksGenerateResult {
  const dir = manifest.outputs.hooks?.directory ?? '.cursor';
  const file = manifest.outputs.hooks?.file ?? 'hooks.json';
  const relativePath = `${dir}/${file}`;

  const allHooks = getBuiltinHooks();
  const activeHooks = resolveActiveHooks(allHooks, {
    profile: input.profile,
    disabled: [...input.disabled],
    env: {},
  });

  const hookMap: Record<string, CursorHookEntry[]> = {};

  for (const hook of activeHooks) {
    const cursorEvent = CANONICAL_TO_CURSOR[hook.event];
    if (!cursorEvent) continue;

    if (!hookMap[cursorEvent]) {
      hookMap[cursorEvent] = [];
    }

    hookMap[cursorEvent].push({
      command: `l1dder hook ${hook.event}`,
      event: cursorEvent,
      description: hook.description,
    });
  }

  const output: CursorHooksJson = {
    version: 1,
    hooks: hookMap,
  };

  const content = `${JSON.stringify(output, null, 2)}\n`;
  const hash = computeContentHash(content);

  return { relativePath, content, hash };
}
