import type { DriftFinding } from './drift-types.js';

/**
 * Snapshot of a single knowledge document, as read by the caller.
 *
 * Pure domain functions never perform I/O — `@l1dder/cli` reads `content` via
 * `FileSystemPort` and `committedAt` via `ShellPort` (git log), then passes
 * both in here.
 */
export interface KnowledgeDoc {
  /** Path of the document, used to label findings (typically project-relative). */
  readonly path: string;
  readonly content: string;
  /** ISO 8601 last-commit timestamp, if known. Freshness check is skipped without it. */
  readonly committedAt?: string;
}

/** Options controlling structural drift sensitivity. */
export interface StructuralDriftOptions {
  /**
   * Design files known to exist (e.g. `["design/skills.md"]`), used to validate
   * `design/<name>.md` cross-refs found in either document. Cross-ref checking
   * is skipped entirely when omitted.
   */
  readonly existingDesignFiles?: readonly string[];
  /**
   * Fraction (0-1) of size shrinkage from to-be to as-is that triggers a size-gap
   * finding. Default `0.6` — flags when as-is is smaller than 40% of to-be's length.
   */
  readonly maxSizeGapRatio?: number;
}

const SECTION_HEADING = /^##\s+(.+)$/gm;
const DESIGN_CROSS_REF = /design\/[\w-]+\.md/g;
const DEFAULT_MAX_SIZE_GAP_RATIO = 0.6;

/**
 * Pure structural drift detector comparing an as-is/to-be knowledge document pair
 * for mechanically-verifiable mismatches (DEC-6-1: facts only, no semantic judgment
 * of whether the *meaning* of as-is still matches to-be — that is the job of the
 * `hygiene-audit` skill).
 *
 * Findings produced (independent checks, any subset may fire):
 * 1. **Missing section** — a `## Heading` present in to-be but absent from as-is.
 * 2. **Freshness** — as-is was last committed strictly before to-be's last commit,
 *    suggesting as-is may not reflect the newer to-be. Skipped unless both
 *    `committedAt` timestamps are provided.
 * 3. **Size gap** — as-is content is much smaller than to-be's (possible
 *    under-documentation), per `maxSizeGapRatio`.
 * 4. **Cross-ref** — a `design/<name>.md` reference in either document that is
 *    not present in `options.existingDesignFiles`. Skipped unless that list is provided.
 *
 * Deterministic and side-effect free: same inputs always produce the same findings.
 */
export function detectStructuralDrift(
  asIs: KnowledgeDoc,
  toBe: KnowledgeDoc,
  options: StructuralDriftOptions = {},
): DriftFinding[] {
  const findings: DriftFinding[] = [];
  const maxSizeGapRatio = options.maxSizeGapRatio ?? DEFAULT_MAX_SIZE_GAP_RATIO;

  const asIsSections = extractSections(asIs.content);
  const toBeSections = extractSections(toBe.content);
  for (const section of toBeSections) {
    if (!asIsSections.has(section)) {
      findings.push({
        level: 'warn',
        reason: `Section "${section}" present in to-be but missing from as-is`,
        file: asIs.path,
      });
    }
  }

  if (
    asIs.committedAt !== undefined &&
    toBe.committedAt !== undefined &&
    asIs.committedAt < toBe.committedAt
  ) {
    findings.push({
      level: 'warn',
      reason: `as-is last committed ${asIs.committedAt}, but to-be was updated more recently (${toBe.committedAt}) — as-is may be stale`,
      file: asIs.path,
    });
  }

  if (toBe.content.length > 0) {
    const ratio = asIs.content.length / toBe.content.length;
    if (ratio < 1 - maxSizeGapRatio) {
      findings.push({
        level: 'info',
        reason: `as-is (${String(asIs.content.length)} chars) is much smaller than to-be (${String(toBe.content.length)} chars) — possible under-documentation`,
        file: asIs.path,
      });
    }
  }

  if (options.existingDesignFiles) {
    const existing = new Set(options.existingDesignFiles);
    const refs = new Set([
      ...extractCrossRefs(asIs.content),
      ...extractCrossRefs(toBe.content),
    ]);
    for (const ref of refs) {
      if (!existing.has(ref)) {
        findings.push({
          level: 'warn',
          reason: `Cross-ref to non-existent file: ${ref}`,
          file: asIs.path,
        });
      }
    }
  }

  return findings;
}

function extractSections(content: string): ReadonlySet<string> {
  const sections = new Set<string>();
  for (const match of content.matchAll(SECTION_HEADING)) {
    const heading = match[1]?.trim();
    if (heading) sections.add(heading);
  }
  return sections;
}

function extractCrossRefs(content: string): ReadonlySet<string> {
  return new Set(content.match(DESIGN_CROSS_REF) ?? []);
}
