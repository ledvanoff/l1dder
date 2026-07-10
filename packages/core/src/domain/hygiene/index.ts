/**
 * @l1dder/core domain/hygiene — pure structural drift detection for Hygiene Sessions (Iteration 6).
 *
 * DEC-6-1: this module produces mechanically-verifiable FACTS only (missing
 * sections, stale timestamps, size gaps, broken cross-refs). Semantic judgment
 * (does as-is still *mean* the same thing as to-be?) is out of scope — that is
 * the `hygiene-audit` skill's job, consuming `l1dder doctor --deep --json`.
 *
 * @packageDocumentation
 */

export type { DriftLevel, DriftFinding } from './drift-types.js';
export type { KnowledgeDoc, StructuralDriftOptions } from './structural-drift.js';
export { detectStructuralDrift } from './structural-drift.js';
