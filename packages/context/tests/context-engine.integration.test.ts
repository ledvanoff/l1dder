/**
 * Integration tests for ContextEngine — full pipeline: resolve → allocate → render.
 * Covers comfortable/tight/critical tiers, brief, handoff, and inspect.
 */

import { describe, expect, it } from 'vitest';
import {
  createTestContextEngine,
  InMemoryContextFs,
  IMPLEMENT_DELIVERY,
  SPECIFY_DISCOVERY,
  IDLE_DELIVERY,
} from '../src/testing.js';

function makeFs(files: Record<string, string>): InMemoryContextFs {
  return new InMemoryContextFs(files);
}

function smallKnowledgeFiles(): Record<string, string> {
  return {
    'knowledge/idea.md': '## Summary\n\nProject idea summary.\n\n## Details\n\nFull idea.',
    'knowledge/roadmap.md': '## Summary\n\nRoadmap summary.\n\n## Details\n\nFull roadmap.',
    'knowledge/to-be/architecture.md': '## Summary\n\nTarget arch.\n\n## Details\n\nFull arch.',
    'knowledge/to-be/erd.md': '## Summary\n\nTarget ERD.\n\n## Details\n\nFull ERD.',
    'knowledge/to-be/usecases.md': '## Summary\n\nTarget UCs.\n\n## Details\n\nFull UCs.',
    'knowledge/to-be/integrations.md': '## Summary\n\nTarget ints.\n\n## Details\n\nFull ints.',
    'knowledge/as-is/architecture.md': '## Summary\n\nCurrent arch.\n\n## Details\n\nFull arch.',
    'knowledge/as-is/erd.md': '## Summary\n\nCurrent ERD.',
    'knowledge/as-is/usecases.md': '## Summary\n\nCurrent UCs.',
    'knowledge/as-is/integrations.md': '## Summary\n\nCurrent ints.',
    'standards/conventions.md': '## Summary\n\nConventions.\n\n## Details\n\nFull conventions.',
    'specs/current/spec.md': '## Summary\n\nSpec.\n\n## Details\n\nFull spec.',
    'specs/current/plan.md': '## Summary\n\nPlan.\n\n## Details\n\nFull plan.',
    'specs/current/tasks.md': '## Summary\n\nTasks.\n\n## Details\n\nFull tasks.',
  };
}

describe('ContextEngine Integration', () => {
  describe('full pipeline — comfortable tier', () => {
    it('renders all entries at original mode with staticHash present', async () => {
      const fs = makeFs(smallKnowledgeFiles());
      const engine = createTestContextEngine({ fs });

      const result = await engine.render(IMPLEMENT_DELIVERY, 'developer');

      expect(result.metadata.tier).toBe('comfortable');
      expect(result.staticHash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.content).toContain('Target arch.');
      expect(result.content).toContain('Conventions.');
      expect(result.metadata.phase).toBe('implement');
      expect(result.metadata.role).toBe('developer');
      expect(result.metadata.stage).toBe('delivery');
    });
  });

  describe('full pipeline — critical tier with warning', () => {
    it('excludes low-priority entries when budget exceeded', async () => {
      const largeContent = 'x'.repeat(300_000);
      const files: Record<string, string> = {};
      for (const [path, _] of Object.entries(smallKnowledgeFiles())) {
        files[path] = largeContent;
      }
      const fs = makeFs(files);
      const engine = createTestContextEngine({
        fs,
        config: {
          token_budget: 50_000,
          reserved_tokens: 10_000,
          chars_per_token: 3.0,
          overrides: {},
          extra_files: [],
        },
      });

      const result = await engine.render(IMPLEMENT_DELIVERY, 'developer');

      expect(result.metadata.tier).toBe('critical');
    });
  });

  describe('full pipeline — tight tier', () => {
    it('demotes low-priority entries', async () => {
      const mediumContent = 'x'.repeat(60_000);
      const files = smallKnowledgeFiles();
      for (const key of Object.keys(files)) {
        files[key] = mediumContent;
      }
      const fs = makeFs(files);
      const engine = createTestContextEngine({
        fs,
        config: {
          token_budget: 200_000,
          reserved_tokens: 30_000,
          chars_per_token: 3.0,
          overrides: {},
          extra_files: [],
        },
      });

      const result = await engine.render(IMPLEMENT_DELIVERY, 'developer');

      expect(['tight', 'critical']).toContain(result.metadata.tier);
    });
  });

  describe('handoff detection', () => {
    it('detects valid handoff file', async () => {
      const fs = makeFs({
        '.l1dder/handoff.md': [
          '# Handoff',
          '',
          '## Session Context',
          'Context here.',
          '',
          '## Current State',
          'State here.',
          '',
          '## Next Steps',
          'Steps here.',
        ].join('\n'),
      });
      const engine = createTestContextEngine({ fs });

      const result = await engine.detectHandoff();

      expect(result.exists).toBe(true);
      expect(result.valid).toBe(true);
    });

    it('reports missing handoff', async () => {
      const fs = makeFs({});
      const engine = createTestContextEngine({ fs });

      const result = await engine.detectHandoff();

      expect(result.exists).toBe(false);
      expect(result.valid).toBe(false);
    });
  });

  describe('brief generation', () => {
    it('produces compact output from knowledge files', async () => {
      const fs = makeFs({
        ...smallKnowledgeFiles(),
        '.l1dder/state.yml': [
          'project:',
          '  stage: delivery',
          'workflow:',
          '  current_phase: implement',
          '  current_status: in_progress',
          '  mode: main',
          '  iteration: 3',
        ].join('\n'),
      });
      const engine = createTestContextEngine({ fs });

      const result = await engine.brief();

      expect(result.content.length).toBeLessThan(10_000);
      expect(result.sections.length).toBeGreaterThan(0);
      expect(result.tokenEstimate).toBeGreaterThan(0);
      expect(result.content).toContain('Project idea summary.');
    });
  });

  describe('inspect', () => {
    it('returns entry list without file I/O', () => {
      const engine = createTestContextEngine();

      const inspection = engine.inspect(IMPLEMENT_DELIVERY, 'developer');

      expect(inspection.entries.length).toBeGreaterThan(0);
      expect(inspection.estimatedTotalTokens).toBeGreaterThan(0);
      expect(inspection.phase).toBe('implement');
      expect(inspection.role).toBe('developer');
      expect(inspection.stage).toBe('delivery');
    });
  });

  describe('resolve', () => {
    it('resolves different profiles for different phases', () => {
      const engine = createTestContextEngine();

      const implement = engine.resolve(IMPLEMENT_DELIVERY, 'developer');
      const specify = engine.resolve(SPECIFY_DISCOVERY, 'architect');
      const idle = engine.resolve(IDLE_DELIVERY, 'developer');

      expect(implement.entries.length).toBeGreaterThan(idle.entries.length);
      expect(specify.entries.length).toBeGreaterThan(0);
    });
  });

  describe('barrel exports', () => {
    it('all public types importable', async () => {
      const { ContextEngine, resolveProfile, allocate, renderContext, buildBrief, detectHandoff, validateHandoff, CharBasedTokenCounter, mapPhaseToGroup, BASE_PROFILES, ROLE_OVERLAYS } = await import('../src/index.js');

      expect(ContextEngine).toBeDefined();
      expect(resolveProfile).toBeDefined();
      expect(allocate).toBeDefined();
      expect(renderContext).toBeDefined();
      expect(buildBrief).toBeDefined();
      expect(detectHandoff).toBeDefined();
      expect(validateHandoff).toBeDefined();
      expect(CharBasedTokenCounter).toBeDefined();
      expect(mapPhaseToGroup).toBeDefined();
      expect(BASE_PROFILES).toBeDefined();
      expect(ROLE_OVERLAYS).toBeDefined();
    });
  });
});
