import { HookPayloadSchema, HookEventSchema, ConfigSchema } from '@l1dder/schemas';
import type { HookPayload, HookResult, HookDefinition } from '@l1dder/schemas';
import {
  getBuiltinHooks,
  resolveActiveHooks,
  matchesHook,
} from '@l1dder/core';
import type { HookEnvOverrides } from '@l1dder/core';
import type { ShellPort, FileSystemPort } from '@l1dder/core';

import type { HookHandler, HookHandlerDeps } from './hook-handler.js';
import { preCommitGuardHandler } from './handlers/pre-commit-guard.js';
import { docFileGuardHandler } from './handlers/doc-file-guard.js';
import { formatAfterEditHandler } from './handlers/format-after-edit.js';
import { strategicCompactReminderHandler } from './handlers/strategic-compact-reminder.js';
import { precompactHandoffSaveHandler } from './handlers/precompact-handoff-save.js';
import { sessionStartBoundedContextHandler } from './handlers/session-start-bounded-context.js';
import { sessionClosureReminderHandler } from './handlers/session-closure-reminder.js';

// ─── Handler registry ─────────────────────────────────────────────────────────

const HOOK_HANDLERS: Readonly<Record<string, HookHandler>> = {
  'pre-commit-guard': preCommitGuardHandler,
  'doc-file-guard': docFileGuardHandler,
  'format-after-edit': formatAfterEditHandler,
  'strategic-compact-reminder': strategicCompactReminderHandler,
  'precompact-handoff-save': precompactHandoffSaveHandler,
  'session-start-bounded-context': sessionStartBoundedContextHandler,
  'session-closure-reminder': sessionClosureReminderHandler,
};

// ─── Dispatcher dependencies ──────────────────────────────────────────────────

/** Dependencies for the hook dispatcher. */
export interface RunHookDeps {
  readonly projectRoot: string;
  readonly shell: ShellPort;
  readonly fs: FileSystemPort;
}

// ─── Main dispatcher ──────────────────────────────────────────────────────────

/**
 * Read raw stdin JSON and normalise it into a HookPayload.
 *
 * Cursor sends a JSON object on stdin. We normalise field names from Cursor's
 * snake_case contract to our camelCase payload schema.
 *
 * On any parse error, returns a minimal payload with just the event.
 */
export function parseStdinPayload(
  eventName: string,
  stdinRaw: string,
): HookPayload {
  const eventResult = HookEventSchema.safeParse(eventName);
  const event = eventResult.success ? eventResult.data : 'Stop' as const;

  let raw: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(stdinRaw || '{}');
    if (typeof parsed === 'object' && parsed !== null) {
      raw = parsed as Record<string, unknown>;
    }
  } catch {
    // Malformed stdin — return minimal payload.
    return { event, raw: {} };
  }

  const normalised = {
    event,
    command: raw['command'] ?? (raw['args'] as Record<string, unknown> | undefined)?.['command'],
    filePath:
      raw['path'] ??
      raw['file'] ??
      (raw['args'] as Record<string, unknown> | undefined)?.['filePath'],
    prompt: raw['prompt'] ?? raw['content'] ?? raw['message'],
    output: raw['output'] ?? raw['result'],
    conversationId: raw['conversation_id'],
    workspaceRoots: raw['workspace_roots'],
    raw,
  };

  const result = HookPayloadSchema.safeParse(normalised);
  return result.success ? result.data : { event, raw };
}

/**
 * Read env overrides for hook resolution.
 *
 * Called at the CLI boundary so domain code stays pure.
 */
export function readEnvOverrides(): HookEnvOverrides {
  return {
    hooksGlobal: process.env['L1DDER_HOOKS'],
    profile: process.env['L1DDER_HOOK_PROFILE'],
    disabledHooks: process.env['L1DDER_DISABLED_HOOKS'],
  };
}

/**
 * Read `L1DDER_SESSION_START_MAX_CHARS` from env.
 *
 * Returns undefined if the variable is absent or not a positive integer.
 * Priority: env > config (applied at call site).
 */
export function readSessionStartMaxCharsEnv(): number | undefined {
  const raw = process.env['L1DDER_SESSION_START_MAX_CHARS'];
  if (!raw) return undefined;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * Load hook config from config.yml if available, with safe fallback to defaults.
 */
async function loadHookConfig(
  projectRoot: string,
  fs: FileSystemPort,
): Promise<{ profile: 'minimal' | 'standard' | 'strict'; disabled: string[]; sessionStartMaxChars: number }> {
  try {
    const raw = await fs.readFile(`${projectRoot}/.l1dder/config.yml`);
    const { parseYaml } = await import('@l1dder/yaml');
    const result = parseYaml(raw, ConfigSchema);
    if (result.ok) {
      return {
        profile: result.value.hooks.profile,
        disabled: result.value.hooks.disabled,
        sessionStartMaxChars: result.value.hooks.session_start_max_chars,
      };
    }
  } catch {
    // config.yml missing or unreadable — use defaults.
  }
  return { profile: 'standard', disabled: [], sessionStartMaxChars: 8000 };
}

/**
 * Aggregate multiple HookResults into a single worst-case result.
 *
 * Priority: block > warn > allow.
 */
function aggregateResults(results: readonly HookResult[]): HookResult {
  const messages: string[] = [];
  let outcome: HookResult['outcome'] = 'allow';

  for (const r of results) {
    messages.push(...r.messages);
    if (r.outcome === 'block') outcome = 'block';
    else if (r.outcome === 'warn' && outcome !== 'block') outcome = 'warn';
  }

  return { outcome, messages };
}

/**
 * Run the hook dispatcher for the given canonical event.
 *
 * Flow: stdin JSON → HookPayload → resolve active hooks → execute handlers →
 * aggregate → write output (echo stdin / stderr / exit-code).
 *
 * Returns the exit code (0 for allow/warn, 2 for block).
 */
export async function runHook(
  eventName: string,
  stdinRaw: string,
  deps: RunHookDeps,
  envOverrides?: HookEnvOverrides,
): Promise<number> {
  const env = envOverrides ?? readEnvOverrides();

  // Global kill-switch: no-op pass-through.
  if (env.hooksGlobal?.toLowerCase() === 'off') {
    process.stdout.write(stdinRaw || '{}');
    return 0;
  }

  const payload = parseStdinPayload(eventName, stdinRaw);

  const hookConfig = await loadHookConfig(deps.projectRoot, deps.fs);
  const definitions: readonly HookDefinition[] = getBuiltinHooks();
  const activeForEvent = resolveActiveHooks(definitions, {
    profile: hookConfig.profile,
    disabled: hookConfig.disabled,
    env,
  }).filter((def) => def.event === payload.event && matchesHook(def.matcher, payload));

  if (activeForEvent.length === 0) {
    process.stdout.write(stdinRaw || '{}');
    return 0;
  }

  // Env overrides session_start_max_chars (T-08: env > config).
  const sessionStartMaxChars = readSessionStartMaxCharsEnv() ?? hookConfig.sessionStartMaxChars;

  const handlerDeps: HookHandlerDeps = {
    projectRoot: deps.projectRoot,
    shell: deps.shell,
    fs: deps.fs,
    sessionStartMaxChars,
  };

  const results: HookResult[] = [];
  for (const def of activeForEvent) {
    const handler = HOOK_HANDLERS[def.id];
    if (!handler) continue;
    try {
      const result = await handler(payload, handlerDeps);
      results.push(result);
      // Short-circuit on first block.
      if (result.outcome === 'block') break;
    } catch {
      // Handler errors must not crash the dispatcher — treat as allow.
    }
  }

  const final = aggregateResults(results);

  // Emit messages to stderr (warn/block).
  if (final.messages.length > 0) {
    for (const msg of final.messages) {
      process.stderr.write(`[L1DDER] ${msg}\n`);
    }
  }

  if (final.outcome === 'block') {
    return 2;
  }

  // Cursor `stop` expects optional `{ followup_message }` JSON on stdout
  // (see Cursor hooks docs). Echoing stdin would break that contract.
  if (payload.event === 'Stop') {
    if (final.outcome === 'warn' && final.messages.length > 0) {
      process.stdout.write(
        `${JSON.stringify({ followup_message: final.messages.join('\n\n') })}\n`,
      );
      return 0;
    }
    process.stdout.write('{}\n');
    return 0;
  }

  // allow / warn: pass-through stdin.
  process.stdout.write(stdinRaw || '{}');
  return 0;
}
