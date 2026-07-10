import { L1dderError } from '@l1dder/core';

/** Raised when raw YAML content cannot be parsed (syntax error). */
export class YamlParseError extends L1dderError {
  readonly code = 'YAML_PARSE' as const;

  /** The underlying parser error, if available. */
  readonly parseError: unknown;

  constructor(message: string, parseError?: unknown) {
    super(message);
    this.parseError = parseError;
  }
}

/** Raised when parsed YAML fails schema validation. */
export class YamlValidationError extends L1dderError {
  readonly code = 'YAML_VALIDATION' as const;

  /** Schema validation issues reported by the validator. */
  readonly issues: readonly unknown[];

  constructor(message: string, issues: readonly unknown[]) {
    super(message);
    this.issues = issues;
  }
}
