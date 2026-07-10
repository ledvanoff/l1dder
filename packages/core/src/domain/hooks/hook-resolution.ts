import type { HookDefinition, HookProfile } from '@l1dder/schemas';
import { HookProfileSchema } from '@l1dder/schemas';

/**
 * Environment overrides for hook resolution.
 *
 * Typically read from process.env at the CLI boundary and passed in here,
 * keeping this function pure and testable.
 */
export interface HookEnvOverrides {
  /** L1DDER_HOOK_PROFILE — overrides config profile. */
  readonly profile?: string | undefined;
  /**
   * L1DDER_DISABLED_HOOKS — comma-separated hook IDs to disable.
   * Merged with config disabled list (union).
   */
  readonly disabledHooks?: string | undefined;
  /**
   * L1DDER_HOOKS — set to "off" to disable all hooks globally.
   */
  readonly hooksGlobal?: string | undefined;
}

/**
 * Options for resolving active hooks.
 */
export interface HookResolutionOptions {
  /** Active profile from config (default: 'standard'). */
  readonly profile: HookProfile;
  /** Hook IDs disabled in config. */
  readonly disabled: readonly string[];
  /** Environment variable overrides (env takes priority over config). */
  readonly env: HookEnvOverrides;
}

/**
 * Resolve the set of active hook definitions for the current context.
 *
 * Resolution order (highest priority first):
 * 1. `L1DDER_HOOKS=off` → return empty (all hooks disabled).
 * 2. `L1DDER_HOOK_PROFILE` env → override profile.
 * 3. `L1DDER_DISABLED_HOOKS` env → extend disabled list.
 * 4. Filter definitions by effective profile membership and disabled list.
 *
 * This function is pure — no I/O, no side-effects.
 */
export function resolveActiveHooks(
  definitions: readonly HookDefinition[],
  options: HookResolutionOptions,
): readonly HookDefinition[] {
  const { env } = options;

  // Global kill-switch.
  if (env.hooksGlobal?.toLowerCase() === 'off') {
    return [];
  }

  // Effective profile: env > config; fallback to 'standard' if env value is invalid.
  const effectiveProfile = resolveProfile(env.profile, options.profile);

  // Effective disabled set: union of config + env.
  const effectiveDisabled = new Set<string>([
    ...options.disabled,
    ...parseDisabledHooks(env.disabledHooks),
  ]);

  return definitions.filter((def) => {
    if (effectiveDisabled.has(def.id)) return false;
    return def.profiles.includes(effectiveProfile);
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolve effective profile from env override and config value.
 * Falls back to config value (or 'standard') if env value is invalid.
 */
function resolveProfile(
  envValue: string | undefined,
  configValue: HookProfile,
): HookProfile {
  if (!envValue) return configValue;
  const parsed = HookProfileSchema.safeParse(envValue.toLowerCase());
  return parsed.success ? parsed.data : configValue;
}

/**
 * Parse comma-separated hook IDs from env string.
 * Returns empty array for undefined/empty input.
 */
function parseDisabledHooks(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}
