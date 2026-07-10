import { stringify as yamlStringify } from 'yaml';

import type { L1dderDocument } from './document.js';

/** Serialize an L1dderDocument back to YAML (preserves comments and formatting). */
export function stringifyDocument(doc: L1dderDocument): string {
  return doc.toString();
}

/** Simple one-shot YAML serialization from a plain JS value (no comment preservation). */
export function stringifyYaml(data: unknown): string {
  return yamlStringify(data);
}
