import type { LoggerPort, Result } from '@l1dder/core';
import type { CorruptedStateError } from '@l1dder/core';
import type { Config, State } from '@l1dder/schemas';
import type { L1dderDocument } from '@l1dder/yaml';
import { stringifyDocument, stringifyYaml } from '@l1dder/yaml';

import type { AtomicWriter } from './atomic-writer.js';

/**
 * Dependencies injected into StateWriter.
 */
export interface StateWriterDeps {
  readonly atomicWriter: AtomicWriter;
  readonly logger: LoggerPort;
}

/**
 * Writes `state.yml` and `config.yml` atomically with optional round-trip
 * comment preservation via L1dderDocument (SM5, PM8).
 *
 * When a document is provided, the writer mutates it in place (preserving
 * user comments and formatting) before serializing. Without a document,
 * plain YAML serialization is used.
 */
export class StateWriter {
  private readonly atomicWriter: AtomicWriter;
  private readonly logger: LoggerPort;

  constructor(deps: StateWriterDeps) {
    this.atomicWriter = deps.atomicWriter;
    this.logger = deps.logger;
  }

  /**
   * Write state to disk atomically.
   *
   * @param filePath - target file path
   * @param state - the State object to persist
   * @param document - optional L1dderDocument for round-trip comment preservation
   */
  async writeState(
    filePath: string,
    state: State,
    document?: L1dderDocument,
  ): Promise<Result<void, CorruptedStateError>> {
    const content = document
      ? this.applyToDocument(document, state)
      : stringifyYaml(state);

    this.logger.debug('Writing state', { filePath, roundTrip: !!document });
    return this.atomicWriter.write(filePath, content);
  }

  /**
   * Write config to disk atomically.
   *
   * @param filePath - target file path
   * @param config - the Config object to persist
   * @param document - optional L1dderDocument for round-trip comment preservation
   */
  async writeConfig(
    filePath: string,
    config: Config,
    document?: L1dderDocument,
  ): Promise<Result<void, CorruptedStateError>> {
    const content = document
      ? this.applyToDocument(document, config)
      : stringifyYaml(config);

    this.logger.debug('Writing config', { filePath, roundTrip: !!document });
    return this.atomicWriter.write(filePath, content);
  }

  /**
   * Merge data into an existing L1dderDocument, preserving comments,
   * then serialize to YAML string.
   */
  private applyToDocument(
    document: L1dderDocument,
    data: Record<string, unknown>,
  ): string {
    this.applyObjectToDoc(document, data, '');
    return stringifyDocument(document);
  }

  /**
   * Synchronize `data` into the document at `prefix`: delete keys absent from
   * `data` (DEC-HARD-12), then set present keys. Nested plain objects delete
   * recursively; values are written with `set` (whole subtree) to keep YAML
   * node types stable.
   */
  private applyObjectToDoc(
    document: L1dderDocument,
    data: Record<string, unknown>,
    prefix: string,
  ): void {
    this.deleteAbsentKeys(document, data, prefix);

    for (const [key, value] of Object.entries(data)) {
      const path = prefix ? `${prefix}.${key}` : key;
      document.set(path, value);
    }
  }

  /**
   * Remove document keys (and nested plain-object keys) that are missing from
   * the canonical data object so cleared optional fields do not ghost after save.
   */
  private deleteAbsentKeys(
    document: L1dderDocument,
    data: Record<string, unknown>,
    prefix: string,
  ): void {
    const existing = prefix === '' ? document.toJS() : document.get(prefix);
    if (!isPlainObject(existing)) return;

    for (const key of Object.keys(existing)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (!(key in data)) {
        document.delete(path);
        continue;
      }
      const nextData = data[key];
      const nextExisting = existing[key];
      if (isPlainObject(nextData) && isPlainObject(nextExisting)) {
        this.deleteAbsentKeys(document, nextData, path);
      }
    }
  }
}

/** True for non-null plain objects (not arrays). */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
