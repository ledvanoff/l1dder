import { DependenciesNotMetError, err, ok } from '@l1dder/core';
import type { Result } from '@l1dder/core';

interface GraphNode {
  readonly id: string;
  readonly depends_on: readonly string[];
}

/** Task row shape needed to enforce depends_on before completion. */
export interface CompletableTaskNode extends GraphNode {
  readonly status: string;
}

/**
 * Ids whose status satisfies a depends_on edge (`done` or `skipped`).
 *
 * @param tasks - Task rows with status
 */
export function satisfiedDependencyIds(
  tasks: ReadonlyArray<{ readonly id: string; readonly status: string }>,
): ReadonlySet<string> {
  return new Set(
    tasks
      .filter((task) => task.status === 'done' || task.status === 'skipped')
      .map((task) => task.id),
  );
}

/**
 * Ensure every `depends_on` entry of `taskId` is `done` or `skipped`.
 *
 * Domain guard for markdown-first `task complete` (and any caller that must
 * enforce the same rule without going through {@link TaskManager.startTask}).
 * Unknown `taskId` is treated as having no unmet deps — callers handle
 * not-found separately.
 *
 * @param tasks - Task rows (id, depends_on, status)
 * @param taskId - Task being completed
 */
export function ensureDependenciesMetForComplete(
  tasks: ReadonlyArray<CompletableTaskNode>,
  taskId: string,
): Result<void, DependenciesNotMetError> {
  const task = tasks.find((entry) => entry.id === taskId);
  if (task === undefined) {
    return ok(undefined);
  }

  const completedIds = satisfiedDependencyIds(tasks);
  const graph = new DependencyGraph(tasks);
  if (graph.canStart(taskId, completedIds)) {
    return ok(undefined);
  }

  const unmet = task.depends_on.filter((dep) => !completedIds.has(dep));
  return err(new DependenciesNotMetError(taskId, unmet));
}

/**
 * First pending task in topological order whose `depends_on` are all satisfied.
 *
 * Single source for "what can be started next", shared by `TaskManager` and the
 * workflow projection so both cannot drift apart.
 *
 * @param tasks - Task rows (id, depends_on, status)
 * @returns task id, or `null` when the list is empty or nothing is startable
 */
export function resolveNextAvailableTaskId(
  tasks: ReadonlyArray<CompletableTaskNode>,
): Result<string | null, DependenciesNotMetError> {
  if (tasks.length === 0) {
    return ok(null);
  }

  const graph = new DependencyGraph(tasks);
  const sorted = graph.topologicalSort();
  if (!sorted.ok) {
    return err(sorted.error);
  }

  const completedIds = satisfiedDependencyIds(tasks);
  const byId = new Map(tasks.map((task) => [task.id, task]));

  for (const id of sorted.value) {
    const task = byId.get(id);
    if (task?.status === 'pending' && graph.canStart(id, completedIds)) {
      return ok(id);
    }
  }

  return ok(null);
}

/**
 * Dependency graph for tasks with topological sort and cycle detection (Kahn's algorithm).
 */
export class DependencyGraph {
  private readonly nodes: ReadonlyMap<string, readonly string[]>;

  constructor(tasks: ReadonlyArray<GraphNode>) {
    const map = new Map<string, readonly string[]>();
    for (const task of tasks) {
      map.set(task.id, task.depends_on);
    }
    this.nodes = map;
  }

  /**
   * Topological sort via Kahn's algorithm.
   * Returns ordered task IDs or error if a cycle is detected.
   */
  topologicalSort(): Result<string[], DependenciesNotMetError> {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const [id] of this.nodes) {
      inDegree.set(id, 0);
      adjacency.set(id, []);
    }

    for (const [id, deps] of this.nodes) {
      for (const dep of deps) {
        if (!this.nodes.has(dep)) continue;
        adjacency.get(dep)?.push(id);
        inDegree.set(id, (inDegree.get(id) ?? 0) + 1);
      }
    }

    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    const sorted: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift() as string;
      sorted.push(current);

      for (const neighbor of adjacency.get(current) ?? []) {
        const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }

    if (sorted.length !== this.nodes.size) {
      const cycleNodes = [...this.nodes.keys()].filter(
        (id) => !sorted.includes(id),
      );
      return err(
        new DependenciesNotMetError(
          cycleNodes[0] ?? 'unknown',
          cycleNodes,
          `Circular dependency detected among tasks: ${cycleNodes.join(', ')}`,
        ),
      );
    }

    return ok(sorted);
  }

  /**
   * Check whether a task can start given a set of completed task IDs.
   * A task can start when ALL its dependencies are in the completed set.
   */
  canStart(taskId: string, completedTaskIds: ReadonlySet<string>): boolean {
    const deps = this.nodes.get(taskId);
    if (deps === undefined) return false;
    return deps.every((dep) => completedTaskIds.has(dep));
  }

  /**
   * Check whether the graph contains any cycles.
   */
  hasCycle(): boolean {
    return !this.topologicalSort().ok;
  }
}
