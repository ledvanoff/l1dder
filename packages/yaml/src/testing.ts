/**
 * @l1dder/yaml/testing — test utilities for YAML operations.
 *
 * @packageDocumentation
 */

import { L1dderDocument } from './document.js';

/** Create an L1dderDocument from a plain object — convenience for tests. */
export function createDocument(data: Record<string, unknown>): L1dderDocument {
  return L1dderDocument.fromObject(data);
}
