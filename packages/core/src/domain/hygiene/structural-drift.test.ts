import { describe, expect, it } from 'vitest';

import { detectStructuralDrift } from './structural-drift.js';

describe('detectStructuralDrift', () => {
  // @tc TC-015-01-A
  it('flags a section present in to-be but missing from as-is', () => {
    const asIs = { path: 'knowledge/as-is/architecture.md', content: '## Summary\ntext\n' };
    const toBe = {
      path: 'knowledge/to-be/architecture.md',
      content: '## Summary\ntext\n## Details\nmore\n',
    };

    const findings = detectStructuralDrift(asIs, toBe);
    const finding = findings.find((f) => f.reason.includes('Details'));

    expect(finding?.level).toBe('warn');
  });

  it('flags freshness drift when as-is was committed before to-be', () => {
    const asIs = {
      path: 'knowledge/as-is/architecture.md',
      content: '## Summary\ntext\n',
      committedAt: '2026-01-01T00:00:00.000Z',
    };
    const toBe = {
      path: 'knowledge/to-be/architecture.md',
      content: '## Summary\ntext\n',
      committedAt: '2026-02-01T00:00:00.000Z',
    };

    const findings = detectStructuralDrift(asIs, toBe);
    const finding = findings.find((f) => f.reason.includes('stale'));

    expect(finding?.level).toBe('warn');
  });

  it('does not flag freshness when timestamps are absent', () => {
    const asIs = { path: 'knowledge/as-is/architecture.md', content: '## Summary\ntext\n' };
    const toBe = { path: 'knowledge/to-be/architecture.md', content: '## Summary\ntext\n' };

    const findings = detectStructuralDrift(asIs, toBe);

    expect(findings.some((f) => f.reason.includes('stale'))).toBe(false);
  });

  it('produces no findings for identical structure', () => {
    const content = '## Summary\nsame text on both sides\n';
    const asIs = { path: 'knowledge/as-is/architecture.md', content };
    const toBe = { path: 'knowledge/to-be/architecture.md', content };

    expect(detectStructuralDrift(asIs, toBe)).toEqual([]);
  });

  it('flags a cross-ref to a design file that does not exist', () => {
    const asIs = {
      path: 'knowledge/as-is/architecture.md',
      content: '## Summary\nSee design/missing-spec.md for details\n',
    };
    const toBe = {
      path: 'knowledge/to-be/architecture.md',
      content: '## Summary\nSee design/missing-spec.md for details\n',
    };

    const findings = detectStructuralDrift(asIs, toBe, {
      existingDesignFiles: ['design/skills.md'],
    });
    const finding = findings.find((f) => f.reason.includes('design/missing-spec.md'));

    expect(finding?.level).toBe('warn');
  });

  it('does not flag a cross-ref that resolves to an existing design file', () => {
    const asIs = {
      path: 'knowledge/as-is/architecture.md',
      content: '## Summary\nSee design/skills.md for details\n',
    };
    const toBe = { path: 'knowledge/to-be/architecture.md', content: '## Summary\ntext\n' };

    const findings = detectStructuralDrift(asIs, toBe, {
      existingDesignFiles: ['design/skills.md'],
    });

    expect(findings.some((f) => f.reason.includes('Cross-ref'))).toBe(false);
  });

  it('skips cross-ref checking when existingDesignFiles is not provided', () => {
    const asIs = {
      path: 'knowledge/as-is/architecture.md',
      content: '## Summary\nSee design/anything.md\n',
    };
    const toBe = { path: 'knowledge/to-be/architecture.md', content: '## Summary\ntext\n' };

    expect(detectStructuralDrift(asIs, toBe)).toEqual([]);
  });

  it('flags a large size gap between as-is and to-be as an info finding', () => {
    const asIs = { path: 'knowledge/as-is/architecture.md', content: '## Summary\nshort\n' };
    const toBe = {
      path: 'knowledge/to-be/architecture.md',
      content: `## Summary\n${'x'.repeat(1000)}\n`,
    };

    const findings = detectStructuralDrift(asIs, toBe);
    const finding = findings.find((f) => f.reason.includes('under-documentation'));

    expect(finding?.level).toBe('info');
  });
});
