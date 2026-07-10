import type { InstallState } from '@l1dder/schemas';

import type {
  InstallPlan,
  InstallPlanItem,
  TransformedInstallFile,
} from './install-types.js';

/**
 * Build an install plan by diffing transformed files against previous install-state.
 *
 * Pure function — no I/O. Orphan entries exist in state but not in transformed output.
 */
export function planInstall(
  transformed: readonly TransformedInstallFile[],
  prevState: InstallState,
  targetId: string,
): InstallPlan {
  const prevEntries = prevState.targets[targetId] ?? [];
  const prevByPath = new Map(prevEntries.map((entry) => [entry.path, entry]));
  const transformedPaths = new Set<string>();
  const items: InstallPlanItem[] = [];

  for (const file of transformed) {
    transformedPaths.add(file.path);
    const prev = prevByPath.get(file.path);

    let action: InstallPlanItem['action'];
    if (prev === undefined) {
      action = 'create';
    } else if (prev.hash === file.hash) {
      action = 'skip';
    } else {
      action = 'update';
    }

    items.push({
      path: file.path,
      action,
      target: file.target,
      source: file.source,
      hash: file.hash,
    });
  }

  for (const entry of prevEntries) {
    if (!transformedPaths.has(entry.path)) {
      items.push({
        path: entry.path,
        action: 'orphan',
        target: entry.target,
        source: entry.source,
        hash: entry.hash,
      });
    }
  }

  return { items };
}

/** Count plan items grouped by action — useful for CLI reporting. */
export function summarizePlan(plan: InstallPlan): Record<InstallPlanItem['action'], number> {
  const summary = { create: 0, update: 0, skip: 0, orphan: 0 };
  for (const item of plan.items) {
    summary[item.action] += 1;
  }
  return summary;
}
