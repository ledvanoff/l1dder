import type { FileSystemPort, Result } from '@l1dder/core';
import { err, ok, toSchemaIssueDetails } from '@l1dder/core';
import {
  ProjectRegistrySchema,
  type ProjectRegistry,
} from '@l1dder/schemas';
import { parseYaml, YamlValidationError } from '@l1dder/yaml';
import type { YamlParseError } from '@l1dder/yaml';
import { join } from 'node:path';

import { ParseError, ReadError } from '../../errors.js';

/** Relative path of the canonical traceability manifest. */
export const REGISTRY_MANIFEST_PATH = 'knowledge/project-registry.yml';

/** Dependencies for {@link RegistryReader} (Hexagonal Lite). */
export interface RegistryReaderDeps {
  readonly fs: FileSystemPort;
  readonly projectRoot: string;
}

/**
 * Reads and schema-validates `knowledge/project-registry.yml`.
 *
 * IO errors become {@link ReadError}; YAML/schema failures become
 * {@link ParseError}. Never throws.
 */
export class RegistryReader {
  private readonly fs: FileSystemPort;
  private readonly projectRoot: string;

  constructor(deps: RegistryReaderDeps) {
    this.fs = deps.fs;
    this.projectRoot = deps.projectRoot;
  }

  /**
   * Whether the registry manifest file exists under the project root.
   *
   * Greenfield projects may omit the manifest until HARD registry backfill.
   */
  async exists(): Promise<boolean> {
    const fullPath = join(this.projectRoot, REGISTRY_MANIFEST_PATH);
    return this.fs.exists(fullPath);
  }

  /**
   * Read and validate the project registry manifest.
   *
   * @returns Parsed {@link ProjectRegistry}, or a typed read/parse error
   */
  async read(): Promise<Result<ProjectRegistry, ReadError | ParseError>> {
    const fullPath = join(this.projectRoot, REGISTRY_MANIFEST_PATH);

    let raw: string;
    try {
      raw = await this.fs.readFile(fullPath);
    } catch (cause) {
      return err(new ReadError(REGISTRY_MANIFEST_PATH, cause));
    }

    const parsed = parseYaml(raw, ProjectRegistrySchema);
    if (!parsed.ok) {
      return err(toParseError(parsed.error));
    }

    return ok(parsed.value);
  }
}

/**
 * Map YAML parse/validation failures onto the package {@link ParseError}.
 *
 * @param error - Error from {@link parseYaml}
 * @returns ParseError with actionable details (includes first issue path)
 */
function toParseError(error: YamlParseError | YamlValidationError): ParseError {
  if (error instanceof YamlValidationError) {
    const details = toSchemaIssueDetails(error.issues);
    const first = details[0];
    const detail =
      first === undefined
        ? error.message
        : first.path.length > 0
          ? `${first.path}: ${first.message}`
          : first.message;
    return new ParseError(REGISTRY_MANIFEST_PATH, detail, error);
  }

  return new ParseError(REGISTRY_MANIFEST_PATH, error.message, error);
}
