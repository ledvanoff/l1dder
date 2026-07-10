/**
 * Profile resolution — phase 1 of ContextEngine pipeline (CE1).
 *
 * Determines WHAT files to include and at WHAT mode for a given
 * WorkflowPosition + Role + Config combination.
 */

import type { WorkflowPosition } from '@l1dder/core';
import type { ContextConfig, IncludeMode } from '@l1dder/schemas';
import type { ContextEntry, ContextProfile } from '../../domain/types.js';
import { mapPhaseToGroup } from '../../domain/phase-groups.js';
import { resolveBaseProfile } from '../../domain/profiles.js';
import { ROLE_OVERLAYS, matchesPattern } from '../../domain/role-overlays.js';
import { CATEGORY_ORDER } from '../../domain/constants.js';

/**
 * Resolve a full context profile for the given workflow position and role.
 *
 * Algorithm (CE3):
 * 1. Map phase → group
 * 2. Lookup BASE_PROFILES[group][stage] with "any" fallback
 * 3. Apply ROLE_OVERLAYS promote/demote
 * 4. Apply config.overrides (path → mode)
 * 5. Add config.extra_files
 * 6. Sort by zone (static first) → category → path
 */
export function resolveProfile(
  position: WorkflowPosition,
  role: string,
  config: ContextConfig,
): ContextProfile {
  const phaseGroup = mapPhaseToGroup(position.phase);
  const baseEntries = resolveBaseProfile(phaseGroup, position.stage);

  const withRole = applyRoleOverlay([...baseEntries], role);
  const withConfig = applyConfigOverrides(withRole, config);
  const withExtra = addExtraFiles(withConfig, config.extra_files);
  const sorted = sortEntries(withExtra);

  return { entries: sorted };
}

function applyRoleOverlay(entries: ContextEntry[], role: string): ContextEntry[] {
  const overlay = ROLE_OVERLAYS[role];
  if (!overlay) return entries;

  return entries.map(entry => {
    for (const pattern of overlay.promote) {
      if (matchesPattern(entry.path, pattern) && entry.mode === 'summary') {
        const mode: IncludeMode = 'full';
        return { ...entry, mode };
      }
    }
    for (const pattern of overlay.demote) {
      if (matchesPattern(entry.path, pattern) && entry.mode === 'full') {
        const mode: IncludeMode = 'summary';
        return { ...entry, mode };
      }
    }
    return entry;
  });
}

function applyConfigOverrides(
  entries: ContextEntry[],
  config: ContextConfig,
): ContextEntry[] {
  if (Object.keys(config.overrides).length === 0) {
    return entries;
  }

  return entries.map(entry => {
    const overrideMode = config.overrides[entry.path];
    if (overrideMode) {
      return { ...entry, mode: overrideMode };
    }
    return entry;
  });
}

function addExtraFiles(
  entries: ContextEntry[],
  extraFiles: readonly string[],
): ContextEntry[] {
  if (extraFiles.length === 0) return entries;

  const extra: ContextEntry[] = extraFiles.map(path => ({
    category: 'knowledge' as const,
    path,
    mode: 'full' as const,
    priority: 3,
    zone: 'static' as const,
  }));

  return [...entries, ...extra];
}

function sortEntries(entries: ContextEntry[]): ContextEntry[] {
  return [...entries].sort((a, b) => {
    const zoneOrder = (a.zone === 'static' ? 0 : 1) - (b.zone === 'static' ? 0 : 1);
    if (zoneOrder !== 0) return zoneOrder;

    const catOrder = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
    if (catOrder !== 0) return catOrder;

    return a.path.localeCompare(b.path);
  });
}
