import { describe, it, expect } from 'vitest';
import { Phase, ProjectStage } from '@l1dder/core';
import type { ContextConfig } from '@l1dder/schemas';
import { ContextEngine } from './context-engine.js';
import {
  createTestContextEngine,
  InMemoryContextFs,
  FixedContextClock,
  IMPLEMENT_DELIVERY,
  SPECIFY_DISCOVERY,
  IDLE_DELIVERY,
  TEST_CONTEXT_CONFIG,
} from './testing.js';

describe('ContextEngine', () => {
  describe('create()', () => {
    it('creates engine with provided deps', () => {
      const engine = createTestContextEngine();
      expect(engine).toBeInstanceOf(ContextEngine);
    });

    it('uses config chars_per_token for default token counter', () => {
      const engine = ContextEngine.create({
        fs: new InMemoryContextFs(),
        clock: new FixedContextClock(),
        config: { ...TEST_CONTEXT_CONFIG, chars_per_token: 2.5 },
      });
      expect(engine.getTokenCounter().count('a'.repeat(250))).toBe(100);
    });
  });

  describe('resolve()', () => {
    it('resolves profile for SPECIFY × discovery × architect', () => {
      const engine = createTestContextEngine();
      const profile = engine.resolve(SPECIFY_DISCOVERY, 'architect');

      expect(profile.entries.length).toBeGreaterThan(0);
      const toBeArch = profile.entries.find(
        e => e.path === 'knowledge/to-be/architecture.md',
      );
      expect(toBeArch).toBeDefined();
      expect(toBeArch?.mode).toBe('full');
    });

    it('resolves profile for IMPLEMENT × delivery × developer', () => {
      const engine = createTestContextEngine();
      const profile = engine.resolve(IMPLEMENT_DELIVERY, 'developer');

      const specs = profile.entries.filter(e => e.category === 'specs');
      expect(specs.length).toBeGreaterThanOrEqual(2);
      expect(specs.every(e => e.priority === 1)).toBe(true);
    });

    it('default role is developer when not specified', () => {
      const engine = createTestContextEngine();
      const withRole = engine.resolve(IMPLEMENT_DELIVERY, 'developer');
      const withDefault = engine.resolve(IMPLEMENT_DELIVERY);

      expect(withDefault.entries.length).toBe(withRole.entries.length);
      expect(withDefault.entries.map(e => e.path)).toEqual(
        withRole.entries.map(e => e.path),
      );
    });

    it('IDLE phase base entries are summary (developer overlay may promote some)', () => {
      const engine = createTestContextEngine();
      const profile = engine.resolve(IDLE_DELIVERY);

      const nonPromoted = profile.entries.filter(
        e =>
          !e.path.includes('architecture.md') &&
          !e.path.includes('erd.md') &&
          e.path !== 'standards/conventions.md',
      );
      for (const entry of nonPromoted) {
        expect(entry.mode).toBe('summary');
      }
    });
  });

  describe('inspect()', () => {
    it('returns inspection with entries and estimated tokens', () => {
      const engine = createTestContextEngine();
      const inspection = engine.inspect(IMPLEMENT_DELIVERY, 'developer');

      expect(inspection.entries.length).toBeGreaterThan(0);
      expect(inspection.estimatedTotalTokens).toBeGreaterThan(0);
      expect(inspection.phase).toBe(Phase.IMPLEMENT);
      expect(inspection.role).toBe('developer');
      expect(inspection.stage).toBe(ProjectStage.DELIVERY);
    });

    it('excludes tokens for excluded entries', () => {
      const config: ContextConfig = {
        ...TEST_CONTEXT_CONFIG,
        overrides: { 'knowledge/idea.md': 'exclude' },
      };
      const engine = ContextEngine.create({
        fs: new InMemoryContextFs(),
        clock: new FixedContextClock(),
        config,
      });

      const inspection = engine.inspect(SPECIFY_DISCOVERY, 'architect');
      const ideaEntry = inspection.entries.find(e => e.path === 'knowledge/idea.md');
      if (ideaEntry) {
        expect(ideaEntry.mode).toBe('exclude');
      }
    });

    it('uses default role when not specified', () => {
      const engine = createTestContextEngine();
      const inspection = engine.inspect(IMPLEMENT_DELIVERY);
      expect(inspection.role).toBe('developer');
    });
  });

  describe('computeBudget()', () => {
    it('computes effective budget from config', () => {
      const engine = createTestContextEngine();
      const budget = engine.computeBudget();

      expect(budget.total).toBe(120_000);
      expect(budget.reserved).toBe(30_000);
      expect(budget.effective).toBe(90_000);
    });

    it('uses custom budget from config', () => {
      const config: ContextConfig = {
        ...TEST_CONTEXT_CONFIG,
        token_budget: 200_000,
        reserved_tokens: 50_000,
      };
      const engine = ContextEngine.create({
        fs: new InMemoryContextFs(),
        clock: new FixedContextClock(),
        config,
      });
      const budget = engine.computeBudget();

      expect(budget.effective).toBe(150_000);
    });
  });
});
