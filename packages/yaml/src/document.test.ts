import { describe, expect, it } from 'vitest';

import { L1dderDocument } from './document.js';

const SAMPLE_YAML = `# Project config
project:
  name: my-project # inline comment
  stage: delivery
workflow:
  current_phase: idle
  mode: main
`;

describe('L1dderDocument', () => {
  describe('fromString', () => {
    it('creates a document from YAML string', () => {
      const doc = L1dderDocument.fromString(SAMPLE_YAML);
      expect(doc).toBeInstanceOf(L1dderDocument);
    });
  });

  describe('get', () => {
    it('reads top-level value', () => {
      const doc = L1dderDocument.fromString(SAMPLE_YAML);
      expect(doc.get('project')).toBeDefined();
    });

    it('reads nested value with dot notation', () => {
      const doc = L1dderDocument.fromString(SAMPLE_YAML);
      expect(doc.get('project.name')).toBe('my-project');
      expect(doc.get('project.stage')).toBe('delivery');
      expect(doc.get('workflow.current_phase')).toBe('idle');
    });

    it('returns undefined for non-existent path', () => {
      const doc = L1dderDocument.fromString(SAMPLE_YAML);
      expect(doc.get('nonexistent.path')).toBeUndefined();
    });
  });

  describe('set', () => {
    it('updates an existing value', () => {
      const doc = L1dderDocument.fromString(SAMPLE_YAML);
      doc.set('workflow.mode', 'quick');
      expect(doc.get('workflow.mode')).toBe('quick');
    });

    it('creates intermediate nodes', () => {
      const doc = L1dderDocument.fromString(SAMPLE_YAML);
      doc.set('tasks.current_feature', 'auth');
      expect(doc.get('tasks.current_feature')).toBe('auth');
    });
  });

  describe('has', () => {
    it('returns true for existing path', () => {
      const doc = L1dderDocument.fromString(SAMPLE_YAML);
      expect(doc.has('project.name')).toBe(true);
      expect(doc.has('workflow')).toBe(true);
    });

    it('returns false for missing path', () => {
      const doc = L1dderDocument.fromString(SAMPLE_YAML);
      expect(doc.has('missing')).toBe(false);
      expect(doc.has('project.unknown')).toBe(false);
    });
  });

  describe('delete', () => {
    it('removes an existing key', () => {
      const doc = L1dderDocument.fromString(SAMPLE_YAML);
      const deleted = doc.delete('workflow.mode');
      expect(deleted).toBe(true);
      expect(doc.has('workflow.mode')).toBe(false);
    });

    it('returns false for non-existent key', () => {
      const doc = L1dderDocument.fromString(SAMPLE_YAML);
      expect(doc.delete('nonexistent')).toBe(false);
    });
  });

  describe('toJS', () => {
    it('converts to plain JS object', () => {
      const doc = L1dderDocument.fromString(SAMPLE_YAML);
      const js = doc.toJS();
      expect(js).toEqual({
        project: { name: 'my-project', stage: 'delivery' },
        workflow: { current_phase: 'idle', mode: 'main' },
      });
    });
  });

  describe('round-trip preservation', () => {
    it('preserves comments through parse→modify→stringify', () => {
      const doc = L1dderDocument.fromString(SAMPLE_YAML);
      doc.set('workflow.mode', 'quick');
      const output = doc.toString();
      expect(output).toContain('# Project config');
      expect(output).toContain('# inline comment');
      expect(output).toContain('mode: quick');
    });

    it('preserves original structure after modify', () => {
      const doc = L1dderDocument.fromString(SAMPLE_YAML);
      doc.set('project.stage', 'maintenance');
      const output = doc.toString();
      expect(output).toContain('stage: maintenance');
      expect(output).toContain('# Project config');
    });
  });

  describe('fromObject', () => {
    it('creates document from plain object', () => {
      const doc = L1dderDocument.fromObject({ foo: 'bar', nested: { a: 1 } });
      expect(doc.get('foo')).toBe('bar');
      expect(doc.get('nested.a')).toBe(1);
    });
  });
});
