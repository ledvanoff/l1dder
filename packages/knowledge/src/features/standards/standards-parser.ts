import type { FileSystemPort, Result } from '@l1dder/core';
import { ok, err } from '@l1dder/core';
import { WorkflowBaseSchema } from '@l1dder/schemas';
import { join } from 'node:path';
import { parseDocument } from '@l1dder/yaml';

import { LoadError } from '../../errors.js';
import type {
  ConventionsBase,
  WorkflowBase,
  MergedStandards,
  OverrideEntry,
  BaseMeta,
} from './types.js';

/** Dependencies for StandardsParser (Hexagonal Lite). */
export interface StandardsParserDeps {
  readonly fs: FileSystemPort;
  readonly projectRoot: string;
}

const CONVENTIONS_BASE_PATH = 'standards/.base/conventions.base.yml';
const WORKFLOW_BASE_PATH = 'standards/.base/workflow.base.yml';
const CONVENTIONS_USER_PATH = 'standards/conventions.md';
const WORKFLOW_USER_PATH = 'standards/workflow.md';

const OVERRIDES_HEADING = /^## Overrides\s*$/im;
const TABLE_ROW = /^\|([^|]+)\|([^|]+)\|([^|]+)\|$/;

/**
 * Loads framework base standards and user overrides.
 *
 * Base: `standards/.base/conventions.base.yml` + `standards/.base/workflow.base.yml`
 * User: `## Overrides` table in `standards/conventions.md` + `standards/workflow.md`
 */
export class StandardsParser {
  private readonly fs: FileSystemPort;
  private readonly projectRoot: string;

  constructor(deps: StandardsParserDeps) {
    this.fs = deps.fs;
    this.projectRoot = deps.projectRoot;
  }

  /** Load and validate base conventions YAML. */
  async loadBaseConventions(): Promise<Result<ConventionsBase, LoadError>> {
    return this.loadBase<ConventionsBase>(CONVENTIONS_BASE_PATH);
  }

  /** Load and validate base workflow YAML via WorkflowBaseSchema. */
  async loadBaseWorkflow(): Promise<Result<WorkflowBase, LoadError>> {
    const fullPath = join(this.projectRoot, WORKFLOW_BASE_PATH);

    let content: string;
    try {
      content = await this.fs.readFile(fullPath);
    } catch (cause) {
      return err(new LoadError(WORKFLOW_BASE_PATH, 'File not found', cause));
    }

    let parsed: unknown;
    try {
      const doc = parseDocument(content);
      parsed = doc.toJS();
    } catch (cause) {
      return err(new LoadError(WORKFLOW_BASE_PATH, 'Invalid YAML syntax', cause));
    }

    const result = WorkflowBaseSchema.safeParse(parsed);
    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join('; ');
      return err(new LoadError(WORKFLOW_BASE_PATH, message));
    }

    return ok(result.data);
  }

  /**
   * Parse `## Overrides` Markdown table from user standards file.
   *
   * Expected format:
   * ```
   * ## Overrides
   * | Key | Value | Reason |
   * |-----|-------|--------|
   * | naming.files | snake_case | Legacy convention |
   * ```
   */
  parseUserOverrides(mdContent: string): Map<string, OverrideEntry> {
    const overrides = new Map<string, OverrideEntry>();

    const headingMatch = OVERRIDES_HEADING.exec(mdContent);
    if (!headingMatch) return overrides;

    const afterHeading = mdContent.slice(headingMatch.index + headingMatch[0].length);
    const lines = afterHeading.split('\n');

    let headerSeen = false;
    let separatorSeen = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        if (separatorSeen) break;
        continue;
      }

      if (!headerSeen && trimmed.includes('Key') && trimmed.includes('Value')) {
        headerSeen = true;
        continue;
      }

      if (headerSeen && !separatorSeen && /^\|[-|: ]+\|$/.test(trimmed)) {
        separatorSeen = true;
        continue;
      }

      if (separatorSeen) {
        const match = TABLE_ROW.exec(trimmed);
        if (match && match[1] && match[2] && match[3]) {
          const key = match[1].trim();
          const value = match[2].trim();
          const reason = match[3].trim();
          if (key && value) {
            overrides.set(key, { key, value, reason });
          }
        } else {
          break;
        }
      }
    }

    return overrides;
  }

  /** Load all standards: both bases + user overrides. */
  async loadStandards(): Promise<Result<MergedStandards, LoadError>> {
    const convResult = await this.loadBaseConventions();
    if (!convResult.ok) return err(convResult.error);

    const wfResult = await this.loadBaseWorkflow();
    if (!wfResult.ok) return err(wfResult.error);

    const convOverrides = await this.loadUserOverrides(CONVENTIONS_USER_PATH);
    const wfOverrides = await this.loadUserOverrides(WORKFLOW_USER_PATH);

    return ok({
      conventions: { base: convResult.value, overrides: convOverrides },
      workflow: { base: wfResult.value, overrides: wfOverrides },
    });
  }

  private async loadBase<T extends { meta: BaseMeta }>(
    relativePath: string,
  ): Promise<Result<T, LoadError>> {
    const fullPath = join(this.projectRoot, relativePath);

    let content: string;
    try {
      content = await this.fs.readFile(fullPath);
    } catch (cause) {
      return err(new LoadError(relativePath, 'File not found', cause));
    }

    let parsed: unknown;
    try {
      const doc = parseDocument(content);
      parsed = doc.toJS();
    } catch (cause) {
      return err(new LoadError(relativePath, 'Invalid YAML syntax', cause));
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return err(new LoadError(relativePath, 'Expected YAML object'));
    }

    const record = parsed as Record<string, unknown>;
    if (!record['meta'] || typeof record['meta'] !== 'object') {
      return err(new LoadError(relativePath, 'Missing meta section'));
    }

    const meta = record['meta'] as Record<string, unknown>;
    if (typeof meta['format_version'] !== 'number') {
      return err(new LoadError(relativePath, 'meta.format_version must be a number'));
    }

    return ok(parsed as T);
  }

  private async loadUserOverrides(
    relativePath: string,
  ): Promise<Map<string, OverrideEntry>> {
    const fullPath = join(this.projectRoot, relativePath);
    try {
      const content = await this.fs.readFile(fullPath);
      return this.parseUserOverrides(content);
    } catch {
      return new Map();
    }
  }
}
