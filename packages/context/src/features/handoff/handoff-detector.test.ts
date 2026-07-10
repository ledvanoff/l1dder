import { describe, expect, it } from 'vitest';
import { detectHandoff, validateHandoff } from './handoff-detector.js';
import { InMemoryContextFs } from '../../testing.js';

const VALID_HANDOFF_RU = [
  '# Handoff',
  '',
  '## Контекст сессии',
  'Работали над AS-12.',
  '',
  '## Текущее состояние',
  'Реализован resolve pipeline.',
  '',
  '## Следующие шаги',
  '- T-12: BudgetAllocator',
].join('\n');

const VALID_HANDOFF_EN = [
  '# Handoff',
  '',
  '## Session Context',
  'Worked on AS-12.',
  '',
  '## Current State',
  'Resolve pipeline implemented.',
  '',
  '## Next Steps',
  '- T-12: BudgetAllocator',
].join('\n');

const MIXED_HANDOFF = [
  '# Handoff',
  '',
  '## Session Context',
  'Worked on AS-12.',
  '',
  '## Текущее состояние',
  'Resolve pipeline implemented.',
  '',
  '## Next Steps',
  '- T-12: BudgetAllocator',
].join('\n');

describe('detectHandoff', () => {
  it('detects existing valid handoff file (RU)', async () => {
    const fs = new InMemoryContextFs({
      '.l1dder/handoff.md': VALID_HANDOFF_RU,
    });

    const result = await detectHandoff(fs, '');

    expect(result.exists).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.summary).toBeTruthy();
  });

  it('detects existing invalid handoff (missing sections)', async () => {
    const fs = new InMemoryContextFs({
      '.l1dder/handoff.md': '# Handoff\n\n## Контекст сессии\nOnly this section.',
    });

    const result = await detectHandoff(fs, '');

    expect(result.exists).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('Current State');
    expect(result.missing).toContain('Next Steps');
  });

  it('returns not exists when no handoff file', async () => {
    const fs = new InMemoryContextFs();

    const result = await detectHandoff(fs, '');

    expect(result.exists).toBe(false);
    expect(result.valid).toBe(false);
  });

  it('handles project root path', async () => {
    const fs = new InMemoryContextFs({
      'my-project/.l1dder/handoff.md': VALID_HANDOFF_EN,
    });

    const result = await detectHandoff(fs, 'my-project');

    expect(result.exists).toBe(true);
    expect(result.valid).toBe(true);
  });
});

describe('validateHandoff', () => {
  it('accepts English section headings', () => {
    const result = validateHandoff(VALID_HANDOFF_EN);

    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('accepts Russian section headings', () => {
    const result = validateHandoff(VALID_HANDOFF_RU);

    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('accepts mixed RU+EN headings', () => {
    const result = validateHandoff(MIXED_HANDOFF);

    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('reports missing sections', () => {
    const result = validateHandoff('# Handoff\nNo sections here.');

    expect(result.valid).toBe(false);
    expect(result.missing).toHaveLength(3);
    expect(result.missing).toContain('Session Context');
    expect(result.missing).toContain('Current State');
    expect(result.missing).toContain('Next Steps');
  });
});
