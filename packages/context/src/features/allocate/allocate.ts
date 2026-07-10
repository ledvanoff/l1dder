/**
 * Budget allocation — phase 2 of ContextEngine pipeline (CE5).
 *
 * Three-tier strategy:
 * - comfortable (≤70%): all entries at original mode
 * - tight (70-90%): demote low-priority full→summary
 * - critical (>90%): exclude lowest priority, demote remaining
 */

import type { FileSystemPort } from '@l1dder/core';
import type { TokenCounterPort } from '../../ports/token-counter.js';
import type {
  ContextProfile,
  ContextEntry,
  TokenBudget,
  AllocatedEntry,
  AllocatedProfile,
} from '../../domain/types.js';
import type { IncludeMode } from '@l1dder/schemas';
import { estimateCategoryTokens } from '../../domain/constants.js';

const COMFORTABLE_THRESHOLD = 0.7;
const TIGHT_THRESHOLD = 0.9;

/**
 * Allocate token budget across resolved profile entries.
 *
 * Reads file sizes via FileSystemPort, then applies three-tier trimming:
 * priority 1-2 entries are never excluded (may be demoted to summary).
 */
export async function allocate(
  profile: ContextProfile,
  budget: TokenBudget,
  counter: TokenCounterPort,
  fs: FileSystemPort,
): Promise<AllocatedProfile> {
  if (profile.entries.length === 0) {
    return { entries: [], tier: 'comfortable', totalTokens: 0 };
  }

  const entries = await estimateEntries(profile.entries, counter, fs);
  const totalTokens = sumTokens(entries);

  const usage = totalTokens / budget.effective;

  if (usage <= COMFORTABLE_THRESHOLD) {
    return {
      entries: entries.map((e) => ({ ...e, allocatedMode: e.mode })),
      tier: 'comfortable',
      totalTokens,
    };
  }

  if (usage <= TIGHT_THRESHOLD) {
    return applyTightTrimming(entries, budget, totalTokens);
  }

  return applyCriticalTrimming(entries, budget, totalTokens);
}

interface EstimatedEntry extends ContextEntry {
  readonly estimatedTokens: number;
}

async function estimateEntries(
  entries: readonly ContextEntry[],
  counter: TokenCounterPort,
  fs: FileSystemPort,
): Promise<EstimatedEntry[]> {
  const results: EstimatedEntry[] = [];

  for (const entry of entries) {
    if (entry.mode === 'exclude') {
      results.push({ ...entry, estimatedTokens: 0 });
      continue;
    }

    let tokens: number;
    try {
      const content = await fs.readFile(entry.path);
      if (entry.mode === 'summary') {
        const summarySize = Math.ceil(content.length * 0.2);
        tokens = counter.count(content.slice(0, summarySize));
      } else {
        tokens = counter.count(content);
      }
    } catch {
      tokens = estimateCategoryTokens(entry.mode, entry.category);
    }

    results.push({ ...entry, estimatedTokens: tokens });
  }

  return results;
}

function sumTokens(entries: readonly EstimatedEntry[]): number {
  return entries.reduce((sum, e) => sum + e.estimatedTokens, 0);
}

/**
 * Tight tier: demote full→summary starting from highest priority number
 * (lowest importance). Priority 1-2 entries stay at original mode.
 */
function applyTightTrimming(
  entries: EstimatedEntry[],
  budget: TokenBudget,
  initialTotal: number,
): AllocatedProfile {
  const sorted = [...entries].sort((a, b) => b.priority - a.priority);
  const allocated: AllocatedEntry[] = entries.map((e) => ({
    ...e,
    allocatedMode: e.mode,
  }));
  let currentTotal = initialTotal;

  for (const entry of sorted) {
    if (currentTotal / budget.effective <= COMFORTABLE_THRESHOLD) break;
    if (entry.priority <= 2) continue;
    if (entry.mode !== 'full') continue;

    const idx = allocated.findIndex((e) => e.path === entry.path);
    if (idx === -1) continue;

    const summaryTokens = Math.ceil(entry.estimatedTokens * 0.2);
    const saved = entry.estimatedTokens - summaryTokens;
    currentTotal -= saved;

    const existing = allocated[idx];
    if (!existing) continue;
    const mode: IncludeMode = 'summary';
    allocated[idx] = { ...existing, allocatedMode: mode, estimatedTokens: summaryTokens };
  }

  return { entries: allocated, tier: 'tight', totalTokens: currentTotal };
}

/**
 * Critical tier: exclude entries with priority > 3, demote remaining
 * full→summary for priority > 2. Priority 1-2 never excluded.
 */
function applyCriticalTrimming(
  entries: EstimatedEntry[],
  budget: TokenBudget,
  initialTotal: number,
): AllocatedProfile {
  let currentTotal = initialTotal;
  const allocated: AllocatedEntry[] = [];

  for (const entry of entries) {
    if (entry.priority > 3 && entry.mode !== 'exclude') {
      const excludeMode: IncludeMode = 'exclude';
      allocated.push({ ...entry, allocatedMode: excludeMode, estimatedTokens: 0 });
      currentTotal -= entry.estimatedTokens;
      continue;
    }

    if (entry.priority > 2 && entry.mode === 'full') {
      const summaryTokens = Math.ceil(entry.estimatedTokens * 0.2);
      currentTotal -= entry.estimatedTokens - summaryTokens;
      const summaryMode: IncludeMode = 'summary';
      allocated.push({ ...entry, allocatedMode: summaryMode, estimatedTokens: summaryTokens });
      continue;
    }

    allocated.push({ ...entry, allocatedMode: entry.mode });
  }

  return {
    entries: allocated,
    tier: 'critical',
    totalTokens: currentTotal,
    warning: 'Context budget critical: low-priority entries excluded or demoted',
  };
}
