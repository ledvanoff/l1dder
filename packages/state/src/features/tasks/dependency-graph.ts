import { DependenciesNotMetError, err, ok } from '@l1dder/core';
import type { Result } from '@l1dder/core';

interface GraphNode {
  readonly id: string;
  readonly depends_on: readonly string[];
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
