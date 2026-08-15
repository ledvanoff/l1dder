import { describe, expect, it } from 'vitest';

import { formatSchemaIssues, toSchemaIssueDetails } from './schema-issues.js';

describe('toSchemaIssueDetails', () => {
  it('formats Zod-like path arrays into dotted paths', () => {
    const details = toSchemaIssueDetails([
      {
        path: ['workflow', 'current_phase'],
        message: 'Invalid option',
        code: 'invalid_value',
      },
    ]);

    expect(details).toEqual([
      {
        path: 'workflow.current_phase',
        message: 'Invalid option',
        code: 'invalid_value',
      },
    ]);
  });

  it('omits raw received values from the detail', () => {
    const details = toSchemaIssueDetails([
      {
        path: ['project', 'name'],
        message: 'Required',
        received: 'SECRET_TOKEN',
      },
    ]);

    expect(details[0]).toEqual({ path: 'project.name', message: 'Required' });
    expect(JSON.stringify(details)).not.toContain('SECRET_TOKEN');
  });
});

describe('formatSchemaIssues', () => {
  it('joins path and message pairs', () => {
    expect(
      formatSchemaIssues([
        { path: ['workflow', 'current_phase'], message: 'Invalid option' },
        { path: ['schema_version'], message: 'Expected number' },
      ]),
    ).toBe(
      'workflow.current_phase: Invalid option; schema_version: Expected number',
    );
  });
});
