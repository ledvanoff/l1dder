import { describe, it, expect } from 'vitest';
import { generateRule } from './rule-generator.js';
import { claudeManifest } from '../../claude-manifest.js';

describe('generateRule (Claude)', () => {
  const baseInput = {
    projectName: 'demo-project',
    projectStage: 'discovery',
    config: {
      language: { docs: 'en' as const, chat: 'en' as const },
    },
    conventions: { meta: { format_version: 1, description: '', last_updated: '' } },
    workflow: { meta: { format_version: 1, description: '', last_updated: '' } },
    knowledgeFiles: ['knowledge/roadmap.md'],
    manifest: claudeManifest,
  };

  it('writes CLAUDE.md at project root', () => {
    const result = generateRule(baseInput);
    expect(result.relativePath).toBe('CLAUDE.md');
  });

  it('produces plain markdown without Cursor mdc frontmatter', () => {
    const result = generateRule(baseInput);
    expect(result.content).not.toContain('alwaysApply');
    expect(result.content).toContain('# L1DDER Rules — demo-project');
    expect(result.content).toContain('## Language');
    expect(result.content).toContain('## Protected Directories');
  });

  it('adds L1DDER:MANAGED marker', () => {
    const result = generateRule(baseInput);
    expect(result.content).toMatch(/^<!-- L1DDER:MANAGED hash:[0-9a-f]{12} -->/);
    expect(result.hash).toHaveLength(12);
  });
});
