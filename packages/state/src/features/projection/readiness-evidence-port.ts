/** Stable code for a structured READY gap. */
export type ReadinessGapCode = 'MVP_COVERAGE_MISSING' | 'REGISTRY_INCONSISTENT';

/** One structured gap blocking the READY milestone. */
export interface ReadinessGap {
  readonly code: ReadinessGapCode;
  /** Referenced entity, e.g. `FEAT-001`, `UC-001-02`, or a registry anchor. */
  readonly ref: string;
  readonly message: string;
}

/** Result of collecting READY evidence. */
export interface ReadinessEvidence {
  /**
   * `false` when no registry-backed source is wired yet (default until HARD-4):
   * gaps are then unknown, NOT proven absent.
   */
  readonly available: boolean;
  readonly gaps: readonly ReadinessGap[];
}

/**
 * Port that collects MVP-coverage / registry-consistency evidence for READY.
 *
 * Real registry-backed adapter lands in HARD-4. Until then callers inject
 * {@link EmptyReadinessEvidence}.
 */
export interface ReadinessEvidencePort {
  /** Collect READY evidence (or report that none is available). */
  collect(): Promise<ReadinessEvidence>;
}

/**
 * Default adapter until HARD-4: reports no verified evidence and no gaps.
 *
 * `available: false` means gaps are unknown — never claim verification that
 * did not happen. With zero gaps, milestone closure alone drives `ready`.
 */
export class EmptyReadinessEvidence implements ReadinessEvidencePort {
  /**
   * @returns Unverified empty evidence (`available: false`, no gaps).
   */
  collect(): Promise<ReadinessEvidence> {
    return Promise.resolve({ available: false, gaps: [] });
  }
}
