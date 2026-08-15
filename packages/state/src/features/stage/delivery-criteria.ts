import type { FileSystemPort } from '@l1dder/core';
import type { Config } from '@l1dder/schemas';

/**
 * Per-criterion result for a single discovery milestone check.
 */
export interface CriterionResult {
  readonly id: string;
  /** Display order (1 = first milestone). */
  readonly order: number;
  readonly label: string;
  readonly met: boolean;
  /** Human-readable explanation of why the criterion passed or failed. */
  readonly detail: string;
}

/** Full evaluation result: array of per-criterion results for all enabled milestones. */
export type DeliveryCriteriaResult = readonly CriterionResult[];

/**
 * Determine whether a file qualifies as a "skeleton" (not yet meaningfully authored).
 *
 * A file is a skeleton if:
 * - Its ## Summary section is absent or shorter than 200 characters.
 * - Its ## Summary contains any of: TODO, TBD, placeholder, skeleton.
 *
 * Relied upon by knowledge scaffolding and doctor deep-mode — do not weaken.
 */
export function isSkeletonFile(content: string): boolean {
  const m = content.match(/## Summary\n([\s\S]*?)(?=\n## |\n---|$)/);
  if (!m) return true;
  const summary = m[1] ?? '';
  if (summary.trim().length < 200) return true;
  return ['TODO', 'TBD', 'placeholder', 'skeleton'].some((marker) =>
    summary.includes(marker),
  );
}

/**
 * File-based evidence helper for discovery artifacts.
 *
 * **Not the readiness checklist.** The ordered IDEA→READY checklist and
 * readiness score come from {@link import('../discovery/discovery-orchestrator.js').DiscoveryOrchestrator}
 * / {@link import('../projection/workflow-projection-service.js').WorkflowProjectionService}.
 * This checker only inspects on-disk evidence paths that may accompany milestones
 * (e.g. product ↔ usecases.md). Roadmap is intentionally omitted (DEC-HARD-01).
 */
export class DeliveryCriteriaChecker {
  /**
   * Evaluate file evidence for discovery artifacts that still map to milestones.
   *
   * Ids use the canonical 7-milestone vocabulary (`product` not `usecases`,
   * `data` not `data_model`). Missing files produce a failed criterion with a
   * descriptive `detail` (no crash).
   *
   * @param fs - FileSystemPort for reading project files
   * @param projectRoot - Absolute path to the project root directory
   * @param config - Project configuration
   */
  async evaluate(
    fs: FileSystemPort,
    projectRoot: string,
    config: Config,
  ): Promise<DeliveryCriteriaResult> {
    const dc = config.stage.delivery_criteria;
    const root = projectRoot.endsWith('/') ? projectRoot.slice(0, -1) : projectRoot;
    const results: CriterionResult[] = [];

    const readSafe = async (relPath: string): Promise<string | null> => {
      try {
        return await fs.readFile(`${root}/${relPath}`);
      } catch {
        return null;
      }
    };

    // idea ← knowledge/idea.md
    if (dc.require_idea_not_skeleton) {
      const content = await readSafe('knowledge/idea.md');
      if (content === null) {
        results.push({
          id: 'idea',
          order: 1,
          label: 'Idea (knowledge/idea.md)',
          met: false,
          detail: 'File not found — create knowledge/idea.md',
        });
      } else if (isSkeletonFile(content)) {
        results.push({
          id: 'idea',
          order: 1,
          label: 'Idea (knowledge/idea.md)',
          met: false,
          detail:
            'File is a skeleton — flesh out the ## Summary (min 200 chars, no TODO/TBD)',
        });
      } else {
        results.push({
          id: 'idea',
          order: 1,
          label: 'Idea (knowledge/idea.md)',
          met: true,
          detail: 'Present and non-skeleton',
        });
      }
    }

    // product ← knowledge/to-be/usecases.md (legacy usecases flag)
    if (dc.require_usecases_not_skeleton) {
      const content = await readSafe('knowledge/to-be/usecases.md');
      if (content === null) {
        results.push({
          id: 'product',
          order: 2,
          label: 'Product (to-be/usecases.md)',
          met: false,
          detail: 'File not found — create knowledge/to-be/usecases.md',
        });
      } else if (isSkeletonFile(content)) {
        results.push({
          id: 'product',
          order: 2,
          label: 'Product (to-be/usecases.md)',
          met: false,
          detail: 'File is a skeleton — document the key use cases',
        });
      } else {
        results.push({
          id: 'product',
          order: 2,
          label: 'Product (to-be/usecases.md)',
          met: true,
          detail: 'Present and non-skeleton',
        });
      }
    }

    // architecture
    if (dc.require_architecture_not_skeleton) {
      const content = await readSafe('knowledge/to-be/architecture.md');
      if (content === null) {
        results.push({
          id: 'architecture',
          order: 3,
          label: 'Architecture (to-be/architecture.md)',
          met: false,
          detail: 'File not found — create knowledge/to-be/architecture.md',
        });
      } else if (isSkeletonFile(content)) {
        results.push({
          id: 'architecture',
          order: 3,
          label: 'Architecture (to-be/architecture.md)',
          met: false,
          detail:
            'File is a skeleton — flesh out the architecture (min 200 chars, no TODO/TBD)',
        });
      } else if (!content.includes('## Details')) {
        results.push({
          id: 'architecture',
          order: 3,
          label: 'Architecture (to-be/architecture.md)',
          met: false,
          detail:
            'Missing ## Details section — document the architectural decisions',
        });
      } else {
        results.push({
          id: 'architecture',
          order: 3,
          label: 'Architecture (to-be/architecture.md)',
          met: true,
          detail: 'Present, non-skeleton, and has ## Details',
        });
      }
    }

    // data ← erd (legacy require_erd_not_skeleton)
    if (dc.require_erd_not_skeleton) {
      const content = await readSafe('knowledge/to-be/erd.md');
      if (content === null) {
        results.push({
          id: 'data',
          order: 5,
          label: 'Data (to-be/erd.md)',
          met: false,
          detail:
            'File not found — create knowledge/to-be/erd.md with an erDiagram block',
        });
      } else if (!content.includes('erDiagram')) {
        results.push({
          id: 'data',
          order: 5,
          label: 'Data (to-be/erd.md)',
          met: false,
          detail:
            'No erDiagram block found — add a Mermaid erDiagram to document the data model',
        });
      } else {
        results.push({
          id: 'data',
          order: 5,
          label: 'Data (to-be/erd.md)',
          met: true,
          detail: 'Present and contains erDiagram',
        });
      }
    }

    // Note: integrations, standards, ready have no dedicated file flags in config yet.
    // Roadmap is intentionally not a readiness criterion (DEC-HARD-01).

    return results;
  }

  /**
   * Returns true when all criteria in the result are met.
   */
  allMet(criteria: DeliveryCriteriaResult): boolean {
    return criteria.every((c) => c.met);
  }
}
