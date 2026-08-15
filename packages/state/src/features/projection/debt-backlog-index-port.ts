import type { BacklogItem, DebtItem } from '@l1dder/schemas';

/**
 * Read-only index of the roadmap parking lots (`DEBT-*` / `BL-*`).
 *
 * Real registry-backed adapter lands in HARD-4. Until then callers inject a
 * stub (see {@link EmptyDebtBacklogIndex}).
 *
 * Candidates surfaced through this port are **advisory only**:
 * - a {@link import('./workflow-projection-service.js').WorkflowProjection}
 *   never nominates, schedules, or mutates pooled items;
 * - `approved` on every candidate is always `false` in a projection;
 * - promoting a `BL-*` item into Delivery requires an explicit Feature
 *   Discovery session after human approval — never an automatic planner.
 */
export interface DebtBacklogIndexPort {
  /** Open technical-debt cards eligible for advisory planning. */
  listOpenDebt(): Promise<readonly DebtItem[]>;
  /** Open long-term backlog cards eligible for advisory planning. */
  listOpenBacklog(): Promise<readonly BacklogItem[]>;
}

/**
 * Advisory planning candidate derived from an open `DEBT-*` / `BL-*` item.
 *
 * Projection never writes a nomination: {@link PlanningCandidate.approved} is
 * always `false`. Scheduling requires a later explicit human approval path.
 */
export interface PlanningCandidate {
  readonly id: string;
  readonly kind: 'debt' | 'backlog';
  readonly title: string;
  /** `severity` for debt, `priority` for backlog. */
  readonly weight: string;
  readonly source: string;
  readonly links: readonly string[];
  /** Always false in a projection: nomination requires explicit human approval. */
  readonly approved: false;
}

/**
 * Default adapter used until HARD-4: yields no open debt or backlog items.
 */
export class EmptyDebtBacklogIndex implements DebtBacklogIndexPort {
  /**
   * @returns Always an empty list.
   */
  listOpenDebt(): Promise<readonly DebtItem[]> {
    return Promise.resolve([]);
  }

  /**
   * @returns Always an empty list.
   */
  listOpenBacklog(): Promise<readonly BacklogItem[]> {
    return Promise.resolve([]);
  }
}
