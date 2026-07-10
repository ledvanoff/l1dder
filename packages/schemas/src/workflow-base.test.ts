import { describe, it, expect } from 'vitest';

import { WorkflowBaseSchema } from './workflow-base.js';

describe('WorkflowBaseSchema', () => {
  it('parses workflow with session_discipline flags', () => {
    const result = WorkflowBaseSchema.safeParse({
      meta: {
        format_version: 1,
        description: 'L1DDER workflow',
        last_updated: '2026-05-09',
      },
      session_discipline: {
        discovery_use_plan_mode: true,
        mark_recommended_option: true,
        two_session_types: true,
      },
      language_policy: { code: 'en' },
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.session_discipline?.discovery_use_plan_mode).toBe(true);
    expect(result.data.session_discipline?.mark_recommended_option).toBe(true);
  });

  it('parses workflow without session_discipline', () => {
    const result = WorkflowBaseSchema.safeParse({
      meta: {
        format_version: 1,
        description: 'Test',
        last_updated: '2026-01-01',
      },
    });
    expect(result.success).toBe(true);
  });
});
