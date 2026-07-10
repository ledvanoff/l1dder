/**
 * Shared constants for @l1dder/context.
 *
 * Category ordering (CE6) and fallback token estimates.
 */

import type { ContextCategory } from './types.js';

/** Category ordering for deterministic sort (CE6): persona → standards → … → handoff. */
export const CATEGORY_ORDER: Readonly<Record<ContextCategory, number>> = {
  persona: 0,
  standards: 1,
  templates: 2,
  knowledge: 3,
  specs: 4,
  state: 5,
  handoff: 6,
};

/** Conservative token estimates per category (no I/O). */
export const CATEGORY_TOKEN_ESTIMATES: Readonly<Record<string, number>> = {
  persona: 1500,
  standards: 3000,
  templates: 2000,
  knowledge: 5000,
  specs: 4000,
  state: 500,
  handoff: 1000,
};

/** Estimate tokens for a category/mode combo without file I/O. */
export function estimateCategoryTokens(mode: string, category: string): number {
  const base = CATEGORY_TOKEN_ESTIMATES[category] ?? 2000;
  return mode === 'summary' ? Math.ceil(base * 0.2) : base;
}
