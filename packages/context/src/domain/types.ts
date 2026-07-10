/**
 * Domain types for @l1dder/context — Context Injection Engine.
 *
 * All types from CE10 §4: profile entries, allocation results,
 * rendered output, budget tiers, and inspection data.
 */

import type { IncludeMode } from '@l1dder/schemas';

// ─── Context Categories & Zones ───

/** Logical category of a context file — determines zone and rendering order. */
export type ContextCategory =
  | 'persona'
  | 'standards'
  | 'templates'
  | 'knowledge'
  | 'specs'
  | 'state'
  | 'handoff';

/** Zone classification for prompt caching: static content vs per-call dynamic. */
export type ContextZone = 'static' | 'dynamic';

// ─── Profile Resolution ───

/** Single entry in a resolved context profile. */
export interface ContextEntry {
  /** Logical category of the file. */
  readonly category: ContextCategory;
  /** Relative path from project root. */
  readonly path: string;
  /** How to include: full content, summary section only, or skip. */
  readonly mode: IncludeMode;
  /** Priority rank (1 = highest). Used for budget trimming. */
  readonly priority: number;
  /** Which zone: static (cacheable) or dynamic (changes per call). */
  readonly zone: ContextZone;
}

/** Resolved profile — ordered list of entries before budget allocation. */
export interface ContextProfile {
  readonly entries: readonly ContextEntry[];
}

// ─── Budget Allocation ───

/** Budget tier after allocation: indicates how aggressively content was trimmed. */
export type BudgetTier = 'comfortable' | 'tight' | 'critical';

/** Token budget configuration (effective = total - reserved). */
export interface TokenBudget {
  /** Total available tokens for context (excluding user message). */
  readonly total: number;
  /** Reserved for user message + response generation. */
  readonly reserved: number;
  /** Effective budget = total - reserved. */
  readonly effective: number;
}

/** Single entry after budget allocation — tracks both original and allocated mode. */
export interface AllocatedEntry {
  /** Logical category of the file. */
  readonly category: ContextCategory;
  /** Relative path from project root. */
  readonly path: string;
  /** Original mode from profile resolution. */
  readonly mode: IncludeMode;
  /** Mode after budget allocation (may differ from mode if demoted/excluded). */
  readonly allocatedMode: IncludeMode;
  /** Priority rank (1 = highest). */
  readonly priority: number;
  /** Which zone: static or dynamic. */
  readonly zone: ContextZone;
  /** Estimated token count for this entry at allocatedMode. */
  readonly estimatedTokens: number;
}

/** Profile after budget allocation — entries trimmed to fit token budget. */
export interface AllocatedProfile {
  readonly entries: readonly AllocatedEntry[];
  readonly tier: BudgetTier;
  readonly totalTokens: number;
  readonly warning?: string;
}

// ─── Rendering ───

/** Metadata attached to a rendered context. */
export interface ContextMetadata {
  readonly phase: string;
  readonly role: string;
  readonly stage: string;
  readonly tier: BudgetTier;
  readonly totalTokens: number;
  readonly generatedAt: string;
}

/** Final rendered context output from the pipeline. */
export interface RenderedContext {
  /** Full rendered context string. */
  readonly content: string;
  /** SHA-256 hash of static zone content (for LLM cache hint). */
  readonly staticHash: string;
  /** Character offset (JS string index) where dynamic zone starts. */
  readonly dynamicOffset: number;
  /** Attached metadata. */
  readonly metadata: ContextMetadata;
}

// ─── Project Brief ───

/** Section in a generated project brief. */
export interface BriefSection {
  readonly title: string;
  readonly content: string;
}

/** Result of project brief generation. */
export interface BriefResult {
  /** Full brief content string. */
  readonly content: string;
  /** Estimated token count. */
  readonly tokenEstimate: number;
  /** Individual sections that compose the brief. */
  readonly sections: readonly BriefSection[];
}

// ─── Handoff Detection ───

/** Result of handoff file validation. */
export interface HandoffValidation {
  readonly valid: boolean;
  readonly missing: readonly string[];
}

/** Result of handoff file detection and validation. */
export interface HandoffDetection {
  readonly exists: boolean;
  readonly valid: boolean;
  readonly path: string;
  readonly summary?: string;
  readonly missing?: readonly string[];
}

// ─── Inspection (no file I/O) ───

/** Inspection result — what would be included without reading files. */
export interface ContextInspection {
  readonly entries: readonly ContextEntry[];
  readonly estimatedTotalTokens: number;
  readonly phase: string;
  readonly role: string;
  readonly stage: string;
}
