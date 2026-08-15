import type { FileSystemPort, LoggerPort } from '@l1dder/core';
import { loadRegistryBundle } from '@l1dder/knowledge';
import type {
  DeliveryRailIndexPort,
  DeliveryRailSession,
} from '@l1dder/state';

/** Dependencies for {@link RegistryDeliveryRailIndex}. */
export interface RegistryDeliveryRailIndexDeps {
  readonly fs: FileSystemPort;
  readonly projectRoot: string;
  readonly logger: LoggerPort;
}

/**
 * CLI-only diagnostic for the most recent {@link RegistryDeliveryRailIndex.load}.
 *
 * Kept off {@link DeliveryRailIndexPort} so domain projection/guards stay
 * fail-closed on `[]` without caring why the index was empty.
 */
export type DeliveryRailsLoadDiagnostic =
  | { readonly kind: 'ok'; readonly sessionCount: number }
  | { readonly kind: 'manifest_missing' }
  | {
      readonly kind: 'manifest_unloadable';
      readonly code: string;
      readonly message: string;
    };

/**
 * Registry-backed {@link DeliveryRailIndexPort}.
 *
 * Reads `knowledge/project-registry.yml` via {@link loadRegistryBundle} and
 * flattens `iterations[].sessions[]` into {@link DeliveryRailSession} records
 * in declaration order. A missing or unloadable manifest yields an empty list
 * (rails unknown) — never throws. Call {@link lastLoadDiagnostic} after
 * {@link load} for CLI copy that distinguishes those cases.
 */
export class RegistryDeliveryRailIndex implements DeliveryRailIndexPort {
  private readonly fs: FileSystemPort;
  private readonly projectRoot: string;
  private readonly logger: LoggerPort;
  private diagnostic: DeliveryRailsLoadDiagnostic = { kind: 'manifest_missing' };

  /**
   * @param deps - filesystem, project root, and logger
   */
  constructor(deps: RegistryDeliveryRailIndexDeps) {
    this.fs = deps.fs;
    this.projectRoot = deps.projectRoot;
    this.logger = deps.logger;
  }

  /**
   * Load flattened delivery-rail sessions, or `[]` when rails are unknown.
   */
  async load(): Promise<readonly DeliveryRailSession[]> {
    const loaded = await loadRegistryBundle({
      fs: this.fs,
      projectRoot: this.projectRoot,
    });

    if (!loaded.ok) {
      this.logger.debug('Delivery rails unavailable; treating as unknown', {
        code: loaded.error.code,
        message: loaded.error.message,
      });
      if (loaded.error.code === 'REGISTRY_MANIFEST_MISSING') {
        this.diagnostic = { kind: 'manifest_missing' };
      } else {
        this.diagnostic = {
          kind: 'manifest_unloadable',
          code: loaded.error.code,
          message: loaded.error.message,
        };
      }
      return [];
    }

    const sessions: DeliveryRailSession[] = [];
    for (const iteration of loaded.value.registry.iterations) {
      for (const session of iteration.sessions) {
        sessions.push({
          iteration: iteration.id,
          session: session.id,
          title: session.title,
          status: session.status,
          profile: session.profile,
          dependsOn: [...session.depends_on],
        });
      }
    }
    this.diagnostic = { kind: 'ok', sessionCount: sessions.length };
    return sessions;
  }

  /**
   * Why the most recent {@link load} produced its result.
   *
   * Concrete-adapter surface for CLI commands only — not part of the port.
   */
  lastLoadDiagnostic(): DeliveryRailsLoadDiagnostic {
    return this.diagnostic;
  }
}
