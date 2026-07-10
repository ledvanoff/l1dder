import type { FileSystemPort } from '@l1dder/core';
import { ok, err } from '@l1dder/core';
import type { Result } from '@l1dder/core';
import { join } from 'node:path';

import { ReadError } from './errors.js';
import { extractSummary } from './features/knowledge/summary.js';

/**
 * Category of a knowledge file for context profiling.
 *
 * `listKnowledge()` below only ever returns `idea`/`roadmap`/`to-be`/`as-is`
 * entries — specs are discovered separately via glob (OQ-iter3-3, see
 * `@l1dder/context`'s own `specs` category), not through this fixed list.
 * P2 tech debt: a `specs` value previously existed here but was never
 * produced by this reader, making it a dead, misleading union member.
 */
export type KnowledgeCategory = 'idea' | 'roadmap' | 'to-be' | 'as-is';

/** Descriptor for a discoverable knowledge file. */
export interface KnowledgeFileEntry {
  readonly path: string;
  readonly category: KnowledgeCategory;
}

/** Dependencies for KnowledgeReader (Hexagonal Lite). */
export interface KnowledgeReaderDeps {
  readonly fs: FileSystemPort;
  readonly projectRoot: string;
}

const TO_BE_FILES = [
  'architecture.md',
  'erd.md',
  'usecases.md',
  'integrations.md',
];

const AS_IS_FILES = [
  'architecture.md',
  'erd.md',
  'usecases.md',
  'integrations.md',
];

/**
 * Generic reader for L1DDER knowledge files.
 *
 * Composition root for the `@l1dder/knowledge` package.
 * Reads files relative to project root via FileSystemPort.
 */
export class KnowledgeReader {
  private readonly fs: FileSystemPort;
  private readonly projectRoot: string;

  constructor(deps: KnowledgeReaderDeps) {
    this.fs = deps.fs;
    this.projectRoot = deps.projectRoot;
  }

  /** Read a single file relative to project root. */
  async read(relativePath: string): Promise<Result<string, ReadError>> {
    const fullPath = join(this.projectRoot, relativePath);
    try {
      const content = await this.fs.readFile(fullPath);
      return ok(content);
    } catch (cause) {
      return err(new ReadError(relativePath, cause));
    }
  }

  /** Read multiple files. Stops on first error. */
  async readMany(paths: string[]): Promise<Result<Map<string, string>, ReadError>> {
    const result = new Map<string, string>();
    for (const p of paths) {
      const r = await this.read(p);
      if (!r.ok) return err(r.error);
      result.set(p, r.value);
    }
    return ok(result);
  }

  /** Check whether a file exists relative to project root. */
  async exists(relativePath: string): Promise<boolean> {
    const fullPath = join(this.projectRoot, relativePath);
    return this.fs.exists(fullPath);
  }

  /**
   * Return the fixed list of discoverable knowledge files (by convention).
   *
   * OQ-iter3-3: fixed list, glob only for specs and skills.
   */
  listKnowledge(): KnowledgeFileEntry[] {
    const entries: KnowledgeFileEntry[] = [
      { path: 'knowledge/idea.md', category: 'idea' },
      { path: 'knowledge/roadmap.md', category: 'roadmap' },
    ];

    for (const f of TO_BE_FILES) {
      entries.push({ path: `knowledge/to-be/${f}`, category: 'to-be' });
    }

    for (const f of AS_IS_FILES) {
      entries.push({ path: `knowledge/as-is/${f}`, category: 'as-is' });
    }

    return entries;
  }

  /**
   * Extract the `## Summary` section from Markdown content.
   *
   * Static utility — delegates to summary.ts.
   */
  static extractSummary(content: string): string {
    return extractSummary(content);
  }
}
