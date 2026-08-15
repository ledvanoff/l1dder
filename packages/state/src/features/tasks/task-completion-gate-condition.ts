import { err, ok } from '@l1dder/core';
import type { FileSystemPort, Result } from '@l1dder/core';

import type {
  GateConditionContext,
  GateConditionFailure,
  GateConditionPort,
} from '../../ports/gate-condition-port.js';
import { findTaskDocuments } from './tasks-source.js';

/** Gate id guarded by {@link TaskCompletionGateCondition}. */
const IMPLEMENTATION_GATE = 'implementation-gate';

/** Max incomplete task ids listed in a failure message before summarizing. */
const MAX_LISTED_INCOMPLETE = 5;

/**
 * Fail-closed condition for `implementation-gate` (DF-020 / DF-021).
 *
 * - Empty `state.tasks.items` while any task document exists →
 *   `TASKS_PROJECTION_EMPTY` (caller must run `l1dder task sync`).
 * - Any item not `done`/`skipped` → `TASKS_INCOMPLETE`.
 * - Any other gate id → ok.
 *
 * Task documents are resolved from the project, not from one hardcoded path:
 * the synced `tasks.source_path` and every `specs/<feature>/tasks.md` count, so
 * a non-default layout can no longer open the gate by looking empty (DEBT-005).
 */
export class TaskCompletionGateCondition implements GateConditionPort {
  private readonly fs: FileSystemPort;
  private readonly projectRoot: string;

  /**
   * @param fs - Filesystem used to detect existing task documents
   * @param projectRoot - Absolute project root the documents are resolved against
   */
  constructor(fs: FileSystemPort, projectRoot: string) {
    this.fs = fs;
    this.projectRoot = projectRoot;
  }

  /**
   * Evaluate the implementation-gate fail-closed rules.
   *
   * @param gateId - Gate under evaluation
   * @param context - Transition context carrying current state
   */
  async evaluate(
    gateId: string,
    context: GateConditionContext,
  ): Promise<Result<void, GateConditionFailure>> {
    if (gateId !== IMPLEMENTATION_GATE) {
      return ok(undefined);
    }

    const items = context.state.tasks.items;

    if (items.length === 0) {
      const documents = await findTaskDocuments(
        this.fs,
        this.projectRoot,
        context.state,
      );
      const first = documents[0];
      if (first !== undefined) {
        return err({
          code: 'TASKS_PROJECTION_EMPTY',
          message: `state.tasks.items is empty while ${first} exists — run \`l1dder task sync\` before advancing past implementation`,
        });
      }
      return ok(undefined);
    }

    const incomplete = items.filter(
      (task) => task.status !== 'done' && task.status !== 'skipped',
    );
    if (incomplete.length === 0) {
      return ok(undefined);
    }

    const listed = incomplete
      .slice(0, MAX_LISTED_INCOMPLETE)
      .map((task) => task.id);
    const remaining = incomplete.length - listed.length;
    const suffix =
      remaining > 0 ? ` (+${String(remaining)} more)` : '';

    return err({
      code: 'TASKS_INCOMPLETE',
      message: `implementation-gate blocked by incomplete tasks: ${listed.join(', ')}${suffix}`,
    });
  }
}
