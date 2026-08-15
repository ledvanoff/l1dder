/**
 * Registry test-contract evidence checks against a `@tc` index.
 */

import type {
  TestContractEvidence,
  TestContractEvidenceIndex,
} from '@l1dder/core';
import type { ProjectRegistry } from '@l1dder/schemas';

/** Stable codes for test-contract evidence findings. */
export type RegistryTestContractIssueCode =
  | 'REGISTRY_TC_EVIDENCE_MISSING'
  | 'REGISTRY_TC_UNKNOWN_REF'
  | 'REGISTRY_TC_MARKER_INVALID';

/** Test-contract finding (merged into {@link RegistryIssue} by the validator). */
export interface RegistryTestContractIssue {
  readonly code: RegistryTestContractIssueCode;
  readonly ref: string;
  readonly message: string;
  readonly path?: string;
  readonly severity: 'error' | 'warning';
}

/**
 * Compare manifest `test_contracts` to indexed `@tc` evidence.
 *
 * - required TC without evidence → error
 * - optional TC without evidence → warning
 * - marker referencing unknown TC → error
 * - invalid marker / missing following test → warning
 *
 * Never throws.
 *
 * @param registry - Schema-valid project registry
 * @param index - Evidence index from {@link TestContractEvidencePort}
 * @returns Issues (may include warnings)
 */
export function collectTestContractIssues(
  registry: ProjectRegistry,
  index: TestContractEvidenceIndex,
): RegistryTestContractIssue[] {
  const issues: RegistryTestContractIssue[] = [];

  const evidenceById = new Map<string, TestContractEvidence[]>();
  for (const hit of index.evidence) {
    const list = evidenceById.get(hit.contractId) ?? [];
    list.push(hit);
    evidenceById.set(hit.contractId, list);
  }

  const knownIds = new Set(registry.test_contracts.map((tc) => tc.id));

  for (const tc of registry.test_contracts) {
    const hits = evidenceById.get(tc.id) ?? [];
    if (hits.length > 0) continue;

    if (tc.required) {
      issues.push({
        code: 'REGISTRY_TC_EVIDENCE_MISSING',
        ref: tc.id,
        message: `Required test contract ${tc.id} has no @tc evidence in package tests`,
        severity: 'error',
      });
    } else {
      issues.push({
        code: 'REGISTRY_TC_EVIDENCE_MISSING',
        ref: tc.id,
        message: `Optional test contract ${tc.id} has no @tc evidence in package tests`,
        severity: 'warning',
      });
    }
  }

  const unknownRefs = new Set<string>();
  for (const hit of index.evidence) {
    if (!knownIds.has(hit.contractId)) {
      unknownRefs.add(hit.contractId);
    }
  }

  for (const id of [...unknownRefs].sort()) {
    const hits = evidenceById.get(id) ?? [];
    const first = hits[0];
    issues.push({
      code: 'REGISTRY_TC_UNKNOWN_REF',
      ref: id,
      message:
        first === undefined
          ? `Test marker references unknown contract ${id}`
          : `Test marker references unknown contract ${id} at ${first.file}:${String(first.line)}`,
      ...(first !== undefined ? { path: first.file } : {}),
      severity: 'error',
    });
  }

  for (const warning of index.markerWarnings) {
    issues.push({
      code: 'REGISTRY_TC_MARKER_INVALID',
      ref: warning.raw,
      message: warning.message,
      path: warning.file,
      severity: 'warning',
    });
  }

  return issues;
}
