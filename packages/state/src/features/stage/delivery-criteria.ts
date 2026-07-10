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
 * Evaluates semantic delivery readiness criteria by reading project artifacts
 * via FileSystemPort.
 *
 * Discovery milestones in order: idea → roadmap → architecture → data model → usecases.
 * Additionally checks design/ file count and absence of skeleton markers.
 */
export class DeliveryCriteriaChecker {
  /**
   * Evaluate all enabled delivery criteria against actual project files.
   *
   * Only criteria enabled in `config.stage.delivery_criteria` are returned.
   * Missing files produce a failed criterion with a descriptive `detail` (no crash).
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

    // Milestone 1: idea
    if (dc.require_idea_not_skeleton) {
      const content = await readSafe('knowledge/idea.md');
      if (content === null) {
        results.push({ id: 'idea', order: 1, label: 'Idea (knowledge/idea.md)', met: false, detail: 'File not found — create knowledge/idea.md' });
      } else if (isSkeletonFile(content)) {
        results.push({ id: 'idea', order: 1, label: 'Idea (knowledge/idea.md)', met: false, detail: 'File is a skeleton — flesh out the ## Summary (min 200 chars, no TODO/TBD)' });
      } else {
        results.push({ id: 'idea', order: 1, label: 'Idea (knowledge/idea.md)', met: true, detail: 'Present and non-skeleton' });
      }
    }

    // Milestone 2: roadmap
    if (dc.require_roadmap) {
      const content = await readSafe('knowledge/roadmap.md');
      if (content === null) {
        results.push({ id: 'roadmap', order: 2, label: 'Roadmap (knowledge/roadmap.md)', met: false, detail: 'File not found — run plan-roadmap skill to create it' });
      } else if (isSkeletonFile(content)) {
        results.push({ id: 'roadmap', order: 2, label: 'Roadmap (knowledge/roadmap.md)', met: false, detail: 'File is a skeleton — work out the roadmap (scope + discovery sessions to MVP)' });
      } else {
        results.push({ id: 'roadmap', order: 2, label: 'Roadmap (knowledge/roadmap.md)', met: true, detail: 'Present and non-skeleton' });
      }
    }

    // Milestone 3: architecture
    if (dc.require_architecture_not_skeleton) {
      const content = await readSafe('knowledge/to-be/architecture.md');
      if (content === null) {
        results.push({ id: 'architecture', order: 3, label: 'Architecture (to-be/architecture.md)', met: false, detail: 'File not found — create knowledge/to-be/architecture.md' });
      } else if (isSkeletonFile(content)) {
        results.push({ id: 'architecture', order: 3, label: 'Architecture (to-be/architecture.md)', met: false, detail: 'File is a skeleton — flesh out the architecture (min 200 chars, no TODO/TBD)' });
      } else if (!content.includes('## Details')) {
        results.push({ id: 'architecture', order: 3, label: 'Architecture (to-be/architecture.md)', met: false, detail: 'Missing ## Details section — document the architectural decisions' });
      } else {
        results.push({ id: 'architecture', order: 3, label: 'Architecture (to-be/architecture.md)', met: true, detail: 'Present, non-skeleton, and has ## Details' });
      }
    }

    // Milestone 4: data model (erd)
    if (dc.require_erd_not_skeleton) {
      const content = await readSafe('knowledge/to-be/erd.md');
      if (content === null) {
        results.push({ id: 'data_model', order: 4, label: 'Data model (to-be/erd.md)', met: false, detail: 'File not found — create knowledge/to-be/erd.md with an erDiagram block' });
      } else if (!content.includes('erDiagram')) {
        results.push({ id: 'data_model', order: 4, label: 'Data model (to-be/erd.md)', met: false, detail: 'No erDiagram block found — add a Mermaid erDiagram to document the data model' });
      } else {
        results.push({ id: 'data_model', order: 4, label: 'Data model (to-be/erd.md)', met: true, detail: 'Present and contains erDiagram' });
      }
    }

    // Milestone 5: usecases
    if (dc.require_usecases_not_skeleton) {
      const content = await readSafe('knowledge/to-be/usecases.md');
      if (content === null) {
        results.push({ id: 'usecases', order: 5, label: 'Use cases (to-be/usecases.md)', met: false, detail: 'File not found — create knowledge/to-be/usecases.md' });
      } else if (isSkeletonFile(content)) {
        results.push({ id: 'usecases', order: 5, label: 'Use cases (to-be/usecases.md)', met: false, detail: 'File is a skeleton — document the key use cases' });
      } else {
        results.push({ id: 'usecases', order: 5, label: 'Use cases (to-be/usecases.md)', met: true, detail: 'Present and non-skeleton' });
      }
    }

    // Design files check
    if (dc.min_design_files > 0) {
      let designFiles: readonly string[] = [];
      try {
        const entries = await fs.readDir(`${root}/design`);
        designFiles = entries.filter((e) => e.endsWith('.md'));
      } catch {
        designFiles = [];
      }
      const met = designFiles.length >= dc.min_design_files;
      results.push({
        id: 'design',
        order: 6,
        label: `Design specs (design/*.md ≥ ${String(dc.min_design_files)})`,
        met,
        detail: met
          ? `${String(designFiles.length)} design file(s) found`
          : `Only ${String(designFiles.length)} design file(s) found — add at least ${String(dc.min_design_files)} spec(s) in design/`,
      });
    }

    // Skeleton markers in ## Summary (aggregate check across idea/roadmap/architecture)
    if (dc.check_skeleton_markers) {
      const filesToCheck = [
        'knowledge/idea.md',
        'knowledge/roadmap.md',
        'knowledge/to-be/architecture.md',
      ];
      const skeletonFiles: string[] = [];
      for (const relPath of filesToCheck) {
        const content = await readSafe(relPath);
        if (content !== null && isSkeletonFile(content)) {
          skeletonFiles.push(relPath);
        }
      }
      const met = skeletonFiles.length === 0;
      results.push({
        id: 'no_skeleton_markers',
        order: 7,
        label: 'No skeleton markers in core docs',
        met,
        detail: met
          ? 'No TODO/TBD/placeholder markers found in core document summaries'
          : `Skeleton markers found in: ${skeletonFiles.join(', ')}`,
      });
    }

    return results;
  }

  /**
   * Returns true when all criteria in the result are met.
   */
  allMet(criteria: DeliveryCriteriaResult): boolean {
    return criteria.every((c) => c.met);
  }
}
