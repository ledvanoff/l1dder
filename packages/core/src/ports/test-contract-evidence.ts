/**
 * Port for indexing `@tc` test-contract evidence markers in package tests.
 *
 * Markers annotate specific `it`/`test` cases that prove a declared TC-*
 * contract. Global IDs are NOT assigned to every test — only marked cases
 * become evidence.
 */

/**
 * One evidence hit linking a TC id to a concrete test case.
 */
export interface TestContractEvidence {
  /** Stable contract id (`TC-NNN-MM-L`). */
  readonly contractId: string;
  /** Repo-relative test file path (POSIX separators). */
  readonly file: string;
  /** First-argument string title of the nearest following `it`/`test`. */
  readonly title: string;
  /** 1-based line number of the `it`/`test` call. */
  readonly line: number;
}

/**
 * A `@tc` marker that could not be fully resolved into evidence.
 *
 * Used for invalid ids or markers without a following `it`/`test` call.
 */
export interface TestContractMarkerWarning {
  /** Repo-relative test file path (POSIX separators). */
  readonly file: string;
  /** 1-based line number of the `@tc` marker. */
  readonly line: number;
  /** Raw marker line text (trimmed). */
  readonly raw: string;
  /** English, actionable description. */
  readonly message: string;
}

/**
 * Result of scanning package test files for `@tc` markers.
 */
export interface TestContractEvidenceIndex {
  /** Evidence rows, sorted by file then line. */
  readonly evidence: readonly TestContractEvidence[];
  /** Unresolved / invalid markers (sorted by file then line). */
  readonly markerWarnings: readonly TestContractMarkerWarning[];
  /** Number of `*.test.ts` / `*.spec.ts` files scanned. */
  readonly scannedFiles: number;
  /** Number of `@tc` marker lines encountered (valid or not). */
  readonly markerCount: number;
}

/**
 * Indexes `@tc` evidence markers under workspace package test trees.
 */
export interface TestContractEvidencePort {
  /**
   * Scan package `src` trees for `*.test.ts` / `*.spec.ts` `@tc` markers.
   *
   * Never throws for ordinary missing/unreadable files — skip and continue.
   *
   * @param projectRoot - Absolute project root
   * @returns Evidence index (may be empty)
   */
  index(projectRoot: string): Promise<TestContractEvidenceIndex>;
}
