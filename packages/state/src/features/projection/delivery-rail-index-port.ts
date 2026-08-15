import type { WorkflowProfileId } from '@l1dder/schemas';

/**
 * One Agent Session row from the delivery rails index.
 *
 * Flattened across iterations for guard / projection consumers. The
 * registry-backed adapter lives in the CLI composition root — this package
 * only defines the port.
 */
export interface DeliveryRailSession {
  readonly iteration: string;
  readonly session: string;
  readonly title: string;
  readonly status: 'pending' | 'in_progress' | 'done' | 'skipped';
  readonly profile: WorkflowProfileId;
  readonly dependsOn: readonly string[];
}

/**
 * Read-only index of Delivery Plan rails (iterations → sessions).
 *
 * Real registry-backed adapter lands in the CLI work package. Until then
 * callers inject a stub (see {@link EmptyDeliveryRailIndex}).
 */
export interface DeliveryRailIndexPort {
  /**
   * Load all delivery sessions in declaration order (iteration order, then
   * session order within each iteration).
   */
  load(): Promise<readonly DeliveryRailSession[]>;
}

/**
 * Default adapter used until the registry is backfilled: yields no rails.
 *
 * An empty index means "rails unknown" — guards must not brick the CLI.
 */
export class EmptyDeliveryRailIndex implements DeliveryRailIndexPort {
  /**
   * @returns Always an empty list.
   */
  load(): Promise<readonly DeliveryRailSession[]> {
    return Promise.resolve([]);
  }
}
