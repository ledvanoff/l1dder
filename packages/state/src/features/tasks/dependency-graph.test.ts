import { describe, expect, it } from 'vitest';

import { DependencyGraph } from './dependency-graph.js';

describe('DependencyGraph', () => {
  describe('topologicalSort', () => {
    it('returns correct order for linear chain', () => {
      const graph = new DependencyGraph([
        { id: 'A', depends_on: [] },
        { id: 'B', depends_on: ['A'] },
        { id: 'C', depends_on: ['B'] },
      ]);

      const result = graph.topologicalSort();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(['A', 'B', 'C']);
      }
    });

    it('returns valid order for diamond dependency', () => {
      const graph = new DependencyGraph([
        { id: 'A', depends_on: [] },
        { id: 'B', depends_on: ['A'] },
        { id: 'C', depends_on: ['A'] },
        { id: 'D', depends_on: ['B', 'C'] },
      ]);

      const result = graph.topologicalSort();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.indexOf('A')).toBeLessThan(result.value.indexOf('B'));
        expect(result.value.indexOf('A')).toBeLessThan(result.value.indexOf('C'));
        expect(result.value.indexOf('B')).toBeLessThan(result.value.indexOf('D'));
        expect(result.value.indexOf('C')).toBeLessThan(result.value.indexOf('D'));
      }
    });

    it('returns tasks with no deps first', () => {
      const graph = new DependencyGraph([
        { id: 'B', depends_on: ['A'] },
        { id: 'A', depends_on: [] },
      ]);

      const result = graph.topologicalSort();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0]).toBe('A');
      }
    });

    it('detects cycle', () => {
      const graph = new DependencyGraph([
        { id: 'A', depends_on: ['B'] },
        { id: 'B', depends_on: ['A'] },
      ]);

      const result = graph.topologicalSort();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DEPENDENCIES_NOT_MET');
        expect(result.error.message).toContain('Circular dependency');
      }
    });

    it('detects three-node cycle', () => {
      const graph = new DependencyGraph([
        { id: 'A', depends_on: ['C'] },
        { id: 'B', depends_on: ['A'] },
        { id: 'C', depends_on: ['B'] },
      ]);

      const result = graph.topologicalSort();

      expect(result.ok).toBe(false);
    });

    it('handles empty graph', () => {
      const graph = new DependencyGraph([]);

      const result = graph.topologicalSort();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });

    it('handles single task with no deps', () => {
      const graph = new DependencyGraph([
        { id: 'A', depends_on: [] },
      ]);

      const result = graph.topologicalSort();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(['A']);
      }
    });

    it('ignores deps referencing unknown tasks', () => {
      const graph = new DependencyGraph([
        { id: 'A', depends_on: ['UNKNOWN'] },
      ]);

      const result = graph.topologicalSort();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(['A']);
      }
    });
  });

  describe('canStart', () => {
    it('returns true when all deps completed', () => {
      const graph = new DependencyGraph([
        { id: 'A', depends_on: [] },
        { id: 'B', depends_on: ['A'] },
      ]);

      expect(graph.canStart('B', new Set(['A']))).toBe(true);
    });

    it('returns false when dep not completed', () => {
      const graph = new DependencyGraph([
        { id: 'A', depends_on: [] },
        { id: 'B', depends_on: ['A'] },
      ]);

      expect(graph.canStart('B', new Set())).toBe(false);
    });

    it('returns true for task with no deps', () => {
      const graph = new DependencyGraph([
        { id: 'A', depends_on: [] },
      ]);

      expect(graph.canStart('A', new Set())).toBe(true);
    });

    it('returns false for unknown task', () => {
      const graph = new DependencyGraph([]);

      expect(graph.canStart('UNKNOWN', new Set())).toBe(false);
    });

    it('requires all deps completed for multi-dep task', () => {
      const graph = new DependencyGraph([
        { id: 'A', depends_on: [] },
        { id: 'B', depends_on: [] },
        { id: 'C', depends_on: ['A', 'B'] },
      ]);

      expect(graph.canStart('C', new Set(['A']))).toBe(false);
      expect(graph.canStart('C', new Set(['A', 'B']))).toBe(true);
    });
  });

  describe('hasCycle', () => {
    it('returns false for acyclic graph', () => {
      const graph = new DependencyGraph([
        { id: 'A', depends_on: [] },
        { id: 'B', depends_on: ['A'] },
      ]);

      expect(graph.hasCycle()).toBe(false);
    });

    it('returns true for cyclic graph', () => {
      const graph = new DependencyGraph([
        { id: 'A', depends_on: ['B'] },
        { id: 'B', depends_on: ['A'] },
      ]);

      expect(graph.hasCycle()).toBe(true);
    });
  });
});
