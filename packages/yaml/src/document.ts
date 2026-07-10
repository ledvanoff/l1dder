import { Document, parseDocument as yamlParseDoc, type ParsedNode } from 'yaml';

/**
 * Round-trip YAML document wrapper over `eemeli/yaml` Document API.
 *
 * Preserves comments, anchors, and formatting on read→modify→write cycles.
 * Path notation is dot-separated: `"project.name"`, `"workflow.current_phase"`.
 */
export class L1dderDocument {
  constructor(public readonly doc: Document<ParsedNode>) {}

  /**
   * Get a value by dot-separated path.
   * Returns `undefined` if the path does not exist.
   */
  get(path: string): unknown {
    const segments = path.split('.');
    const node = this.doc.getIn(segments);
    if (node === undefined || node === null) return undefined;
    return typeof node === 'object' && 'toJSON' in node
      ? (node as { toJSON: () => unknown }).toJSON()
      : node;
  }

  /**
   * Set a value by dot-separated path.
   * Creates intermediate nodes as needed.
   */
  set(path: string, value: unknown): void {
    const segments = path.split('.');
    this.doc.setIn(segments, value);
  }

  /** Check if a path exists in the document. */
  has(path: string): boolean {
    const segments = path.split('.');
    return this.doc.hasIn(segments);
  }

  /** Delete a node at the given path. Returns true if it existed. */
  delete(path: string): boolean {
    const segments = path.split('.');
    return this.doc.deleteIn(segments);
  }

  /** Convert the document to a plain JS object. */
  toJS(): Record<string, unknown> {
    return this.doc.toJS() as Record<string, unknown>;
  }

  /** Serialize back to YAML string (round-trip: preserves comments). */
  toString(): string {
    return this.doc.toString();
  }

  /**
   * Create an L1dderDocument from a raw YAML string.
   * This is the primary entry point for round-trip editing.
   */
  static fromString(raw: string): L1dderDocument {
    const doc = yamlParseDoc(raw);
    return new L1dderDocument(doc);
  }

  /** Create an L1dderDocument from a plain JS object (no comments preserved). */
  static fromObject(data: Record<string, unknown>): L1dderDocument {
    const doc = new Document(data);
    return new L1dderDocument(doc as Document<ParsedNode>);
  }
}
