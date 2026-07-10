import type { Result } from '@l1dder/core';
import { err, ok } from '@l1dder/core';
import { parse as yamlParse } from 'yaml';

import { L1dderDocument } from './document.js';
import { YamlParseError, YamlValidationError } from './errors.js';

/**
 * Structural interface for any Zod-compatible schema.
 * Avoids a direct dependency on the `zod` package from `@l1dder/yaml`.
 */
export interface SafeParsable<T> {
  safeParse(data: unknown): SafeParseResult<T>;
}

/** Success/failure result of a safe parse operation. */
type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string; issues: readonly unknown[] } };

/**
 * Parse raw YAML into a round-trip L1dderDocument.
 *
 * Throws {@link YamlParseError} when the input contains YAML syntax errors
 * (detected via `eemeli/yaml` Document.errors).
 */
export function parseDocument(raw: string): L1dderDocument {
  const doc = L1dderDocument.fromString(raw);
  const errors = doc.doc.errors;
  if (errors.length > 0) {
    throw new YamlParseError(
      `Failed to parse YAML: ${errors.map((e) => e.message).join('; ')}`,
      errors,
    );
  }
  return doc;
}

/**
 * Parse raw YAML and validate against a Zod-compatible schema.
 *
 * Returns `Result<T, YamlParseError | YamlValidationError>`:
 * - `ok(value)` on success
 * - `err(YamlParseError)` if YAML syntax is invalid
 * - `err(YamlValidationError)` if data doesn't match the schema
 */
export function parseYaml<T>(
  raw: string,
  schema: SafeParsable<T>,
): Result<T, YamlParseError | YamlValidationError> {
  let data: unknown;
  try {
    data = yamlParse(raw);
  } catch (cause: unknown) {
    return err(
      new YamlParseError(
        `Failed to parse YAML: ${cause instanceof Error ? cause.message : String(cause)}`,
        cause,
      ),
    );
  }

  const result = schema.safeParse(data);
  if (!result.success) {
    return err(
      new YamlValidationError(
        `YAML validation failed: ${result.error.message}`,
        result.error.issues,
      ),
    );
  }

  return ok(result.data);
}
