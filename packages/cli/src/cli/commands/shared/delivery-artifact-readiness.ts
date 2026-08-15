import { join } from 'node:path';

import type { FileSystemPort } from '@l1dder/core';
import { Phase } from '@l1dder/core';

import { DEFAULT_TASKS_RELATIVE_PATH } from './default-tasks-path.js';

/** Readiness status of a single delivery artifact on disk. */
export type DeliveryArtifactStatus = 'missing' | 'in_progress' | 'ready';

/** One delivery artifact readiness row for helpme / JSON output. */
export interface DeliveryArtifactReadiness {
  readonly id: string;
  readonly path: string;
  readonly status: DeliveryArtifactStatus;
  readonly label: string;
}

/**
 * Classify delivery-phase artifact readiness from on-disk content.
 *
 * Rules (kept deliberately simple and honest):
 * - `missing` — file absent, unreadable, or empty / whitespace-only
 * - `in_progress` — present but still contains unresolved `{{PLACEHOLDER}}`
 *   markers (`{{…}}`) or `<!-- TODO` comments
 * - `ready` — present and free of those unfinished markers
 *
 * This is presentation-layer guidance for `l1dder helpme`, not a gate.
 * It intentionally does **not** reuse {@link import('@l1dder/state').DeliveryCriteriaChecker}
 * skeleton heuristics (those are discovery-oriented Summary-length checks).
 *
 * @param content - File contents, or `null` when the file is absent
 */
export function classifyArtifactContent(
  content: string | null,
): DeliveryArtifactStatus {
  if (content === null) return 'missing';
  if (content.trim().length === 0) return 'missing';
  if (/\{\{[A-Z0-9_]+\}\}/.test(content)) return 'in_progress';
  if (/<!--\s*TODO\b/i.test(content)) return 'in_progress';
  return 'ready';
}

/** Specs relative paths used by delivery phases. */
const SPEC_ARTIFACTS: Readonly<
  Record<string, { id: string; path: string; label: string }>
> = {
  [Phase.SPECIFY]: {
    id: 'spec',
    path: 'specs/current/spec.md',
    label: 'spec.md',
  },
  [Phase.PLAN]: {
    id: 'plan',
    path: 'specs/current/plan.md',
    label: 'plan.md',
  },
  [Phase.TASKS]: {
    id: 'tasks',
    path: DEFAULT_TASKS_RELATIVE_PATH,
    label: 'tasks.md',
  },
};

/** As-is knowledge files inspected during UPDATE_ASIS. */
const AS_IS_ARTIFACTS: readonly { id: string; path: string; label: string }[] = [
  {
    id: 'as_is_architecture',
    path: 'knowledge/as-is/architecture.md',
    label: 'as-is/architecture.md',
  },
  {
    id: 'as_is_erd',
    path: 'knowledge/as-is/erd.md',
    label: 'as-is/erd.md',
  },
  {
    id: 'as_is_usecases',
    path: 'knowledge/as-is/usecases.md',
    label: 'as-is/usecases.md',
  },
  {
    id: 'as_is_integrations',
    path: 'knowledge/as-is/integrations.md',
    label: 'as-is/integrations.md',
  },
];

/**
 * Phases for which helpme reports delivery-artifact readiness.
 */
export function isDeliveryArtifactPhase(phase: string): boolean {
  return (
    phase === Phase.SPECIFY ||
    phase === Phase.PLAN ||
    phase === Phase.TASKS ||
    phase === Phase.UPDATE_ASIS
  );
}

/**
 * Evaluate delivery-artifact readiness for the current phase.
 *
 * Returns an empty list for phases that do not have a mapped artifact.
 *
 * @param fs - Filesystem port
 * @param projectRoot - Project root directory
 * @param phase - Current workflow phase
 */
export async function evaluateDeliveryArtifactReadiness(
  fs: FileSystemPort,
  projectRoot: string,
  phase: string,
): Promise<readonly DeliveryArtifactReadiness[]> {
  const single = SPEC_ARTIFACTS[phase];
  const defs =
    phase === Phase.UPDATE_ASIS
      ? AS_IS_ARTIFACTS
      : single !== undefined
        ? [single]
        : [];

  const results: DeliveryArtifactReadiness[] = [];
  for (const def of defs) {
    const abs = join(projectRoot, def.path);
    let content: string | null = null;
    try {
      if (await fs.exists(abs)) {
        content = await fs.readFile(abs);
      }
    } catch {
      content = null;
    }
    results.push({
      id: def.id,
      path: def.path,
      label: def.label,
      status: classifyArtifactContent(content),
    });
  }
  return results;
}

/**
 * Whether the primary artifact for the phase is ready.
 *
 * For UPDATE_ASIS (multiple files), all listed as-is files must be `ready`.
 */
export function isPhaseArtifactReady(
  artifacts: readonly DeliveryArtifactReadiness[],
): boolean {
  if (artifacts.length === 0) return false;
  return artifacts.every((a) => a.status === 'ready');
}
