import { describe, expect, it } from 'vitest';
import { InMemoryFileSystem } from '@l1dder/core/testing';

import { StandardsParser } from './standards-parser.js';

const VALID_CONVENTIONS_YML = `
meta:
  format_version: 1
  description: "Test conventions"
  last_updated: "2026-01-01"

language:
  primary: typescript
  typescript_strict: true

naming:
  files: kebab-case
  variables: camelCase
`;

const VALID_WORKFLOW_YML = `
meta:
  format_version: 1
  description: "Test workflow"
  last_updated: "2026-01-01"

language_policy:
  code: en
  documentation: ru

session_discipline:
  discovery_use_plan_mode: true
  mark_recommended_option: true
`;

const USER_CONVENTIONS_MD = `# Conventions

Some description.

## Overrides

| Key | Value | Reason |
|-----|-------|--------|
| naming.files | snake_case | Legacy convention |
| language.primary | python | ML project |

## Other Section

More text.
`;

function createParser(files: Record<string, string>): StandardsParser {
  const fs = new InMemoryFileSystem();
  const root = '/project';

  for (const [path, content] of Object.entries(files)) {
    void fs.writeFile(`${root}/${path}`, content);
  }

  return new StandardsParser({ fs, projectRoot: root });
}

describe('StandardsParser', () => {
  describe('loadBaseConventions', () => {
    it('loads and validates base conventions YAML', async () => {
      const parser = createParser({
        'standards/.base/conventions.base.yml': VALID_CONVENTIONS_YML,
      });

      const result = await parser.loadBaseConventions();
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.meta.format_version).toBe(1);
      expect(result.value.meta.description).toBe('Test conventions');
      const lang = result.value['language'] as Record<string, unknown> | undefined;
      expect(lang?.primary).toBe('typescript');
    });

    it('returns LoadError for missing base file', async () => {
      const parser = createParser({});

      const result = await parser.loadBaseConventions();
      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error.code).toBe('LOAD_ERROR');
    });

    it('returns LoadError for missing meta section', async () => {
      const parser = createParser({
        'standards/.base/conventions.base.yml': 'language:\n  primary: typescript\n',
      });

      const result = await parser.loadBaseConventions();
      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error.details).toContain('meta');
    });
  });

  describe('loadBaseWorkflow', () => {
    it('loads and validates base workflow YAML', async () => {
      const parser = createParser({
        'standards/.base/workflow.base.yml': VALID_WORKFLOW_YML,
      });

      const result = await parser.loadBaseWorkflow();
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.meta.format_version).toBe(1);
      const discipline = result.value.session_discipline;
      expect(discipline?.discovery_use_plan_mode).toBe(true);
      expect(discipline?.mark_recommended_option).toBe(true);
    });

    it('parses workflow without session_discipline (optional)', async () => {
      const parser = createParser({
        'standards/.base/workflow.base.yml': `
meta:
  format_version: 1
  description: "Minimal"
  last_updated: "2026-01-01"
`,
      });

      const result = await parser.loadBaseWorkflow();
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.session_discipline).toBeUndefined();
    });
  });

  describe('parseUserOverrides', () => {
    it('parses Markdown overrides table', () => {
      const parser = createParser({});
      const overrides = parser.parseUserOverrides(USER_CONVENTIONS_MD);

      expect(overrides.size).toBe(2);

      const naming = overrides.get('naming.files');
      expect(naming).toBeDefined();
      if (!naming) return;
      expect(naming.value).toBe('snake_case');
      expect(naming.reason).toBe('Legacy convention');

      const lang = overrides.get('language.primary');
      expect(lang).toBeDefined();
      if (!lang) return;
      expect(lang.value).toBe('python');
    });

    it('returns empty overrides when no ## Overrides section', () => {
      const parser = createParser({});
      const overrides = parser.parseUserOverrides('# Just a doc\n\nNo overrides here.');

      expect(overrides.size).toBe(0);
    });

    it('handles empty overrides table (header only)', () => {
      const md = '## Overrides\n\n| Key | Value | Reason |\n|-----|-------|--------|\n\n';
      const parser = createParser({});
      const overrides = parser.parseUserOverrides(md);

      expect(overrides.size).toBe(0);
    });
  });

  describe('loadStandards', () => {
    it('merges base + user overrides', async () => {
      const parser = createParser({
        'standards/.base/conventions.base.yml': VALID_CONVENTIONS_YML,
        'standards/.base/workflow.base.yml': VALID_WORKFLOW_YML,
        'standards/conventions.md': USER_CONVENTIONS_MD,
      });

      const result = await parser.loadStandards();
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.conventions.base.meta.format_version).toBe(1);
      expect(result.value.conventions.overrides.size).toBe(2);
      expect(result.value.workflow.base.meta.format_version).toBe(1);
      expect(result.value.workflow.overrides.size).toBe(0);
    });

    it('graceful on missing user standards md (empty overrides)', async () => {
      const parser = createParser({
        'standards/.base/conventions.base.yml': VALID_CONVENTIONS_YML,
        'standards/.base/workflow.base.yml': VALID_WORKFLOW_YML,
      });

      const result = await parser.loadStandards();
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.conventions.overrides.size).toBe(0);
      expect(result.value.workflow.overrides.size).toBe(0);
    });
  });
});
