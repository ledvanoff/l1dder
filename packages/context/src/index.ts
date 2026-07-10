/**
 * @l1dder/context — Context Injection Engine: profile resolution,
 * budget allocation, prompt rendering, Project Brief, Session Handoff.
 *
 * @packageDocumentation
 */

// ─── ContextEngine (facade) ───

export { ContextEngine } from './context-engine.js';
export type { ContextEngineDeps } from './context-engine.js';

// ─── Domain types ───

export type {
  ContextCategory,
  ContextZone,
  ContextEntry,
  ContextProfile,
  BudgetTier,
  TokenBudget,
  AllocatedEntry,
  AllocatedProfile,
  ContextMetadata,
  RenderedContext,
  BriefSection,
  BriefResult,
  HandoffValidation,
  HandoffDetection,
  ContextInspection,
} from './domain/types.js';

// ─── Phase groups ───

export { mapPhaseToGroup } from './domain/phase-groups.js';
export type { PhaseGroup } from './domain/phase-groups.js';

// ─── Profiles ───

export { BASE_PROFILES, resolveBaseProfile } from './domain/profiles.js';
export { ROLE_OVERLAYS, matchesPattern } from './domain/role-overlays.js';
export type { RoleOverlay } from './domain/role-overlays.js';

// ─── Ports ───

export type { TokenCounterPort } from './ports/token-counter.js';

// ─── Adapters ───

export { CharBasedTokenCounter } from './adapters/char-based-token-counter.js';

// ─── Pipeline features ───

export { resolveProfile } from './features/resolve/resolve.js';
export { allocate } from './features/allocate/allocate.js';
export { renderContext } from './features/render/renderer.js';
export { buildBrief } from './features/brief/brief-builder.js';
export { detectHandoff, validateHandoff } from './features/handoff/handoff-detector.js';
export { generateHandoff } from './features/handoff/handoff-generator.js';
export type { GenerateHandoffOptions, GenerateHandoffResult } from './features/handoff/handoff-generator.js';
