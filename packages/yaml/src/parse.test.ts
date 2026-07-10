import { isErr, isOk } from '@l1dder/core';
import { describe, expect, it } from 'vitest';

import { parseDocument, parseYaml } from './parse.js';
import type { SafeParsable } from './parse.js';
import { YamlParseError, YamlValidationError } from './errors.js';

/**
 * Minimal test schema that accepts { name: string, value: number }.
 * Structural conformance to SafeParsable<T> — no zod dependency needed.
 */
function createTestSchema(): SafeParsable<{ name: string; value: number }> {
  return {
    safeParse(data: unknown) {
      if (
        typeof data === 'object' &&
        data !== null &&
        'name' in data &&
        typeof (data as Record<string, unknown>)['name'] === 'string' &&
        'value' in data &&
        typeof (data as Record<string, unknown>)['value'] === 'number'
      ) {
        return {
          success: true,
          data: data as { name: string; value: number },
        };
      }
      return {
        success: false,
        error: {
          message: 'Validation failed: expected { name: string, value: number }',
          issues: [{ path: [], message: 'Invalid shape' }],
        },
      };
    },
  };
}

function createSchemaWithDefaults(): SafeParsable<{ name: string; enabled: boolean }> {
  return {
    safeParse(data: unknown) {
      if (
        typeof data === 'object' &&
        data !== null &&
        'name' in data &&
        typeof (data as Record<string, unknown>)['name'] === 'string'
      ) {
        const obj = data as Record<string, unknown>;
        return {
          success: true,
          data: {
            name: obj['name'] as string,
            enabled: typeof obj['enabled'] === 'boolean' ? obj['enabled'] : true,
          },
        };
      }
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: [{ path: [], message: 'name is required' }],
        },
      };
    },
  };
}

const testSchema = createTestSchema();
const schemaWithDefaults = createSchemaWithDefaults();

describe('parseDocument', () => {
  it('returns L1dderDocument from valid YAML', () => {
    const doc = parseDocument('name: test\nvalue: 42\n');
    expect(doc.get('name')).toBe('test');
    expect(doc.get('value')).toBe(42);
  });

  it('preserves comments through round-trip', () => {
    const yaml = '# header\nname: test # inline\nvalue: 42\n';
    const doc = parseDocument(yaml);
    const output = doc.toString();
    expect(output).toContain('# header');
    expect(output).toContain('# inline');
  });
});

describe('parseYaml', () => {
  it('returns ok with parsed data on valid YAML + schema', () => {
    const result = parseYaml('name: hello\nvalue: 123\n', testSchema);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.name).toBe('hello');
      expect(result.value.value).toBe(123);
    }
  });

  it('returns err(YamlParseError) on invalid YAML syntax', () => {
    const result = parseYaml('{ invalid yaml: [', testSchema);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(YamlParseError);
      expect(result.error.code).toBe('YAML_PARSE');
    }
  });

  it('returns err(YamlValidationError) on valid YAML but invalid schema', () => {
    const result = parseYaml('name: hello\nvalue: not-a-number\n', testSchema);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(YamlValidationError);
      expect(result.error.code).toBe('YAML_VALIDATION');
    }
  });

  it('returns err(YamlValidationError) on missing required fields', () => {
    const result = parseYaml('name: hello\n', testSchema);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(YamlValidationError);
    }
  });

  it('works with schemas that have default values', () => {
    const result = parseYaml('name: test\n', schemaWithDefaults);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.enabled).toBe(true);
    }
  });
});
