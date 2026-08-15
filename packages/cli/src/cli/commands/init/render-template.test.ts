import { describe, expect, it } from 'vitest';

import {
  findUnresolvedPlaceholders,
  renderTemplate,
} from './render-template.js';

describe('renderTemplate', () => {
  it('substitutes multiple keys and repeated occurrences', () => {
    const source =
      'Hello {{NAME}} — {{NAME}} on {{DATE}}. Author: {{AUTHOR}}.';
    const rendered = renderTemplate(source, {
      NAME: 'Acme',
      DATE: '2026-01-15',
      AUTHOR: 'TODO',
    });
    expect(rendered).toBe(
      'Hello Acme — Acme on 2026-01-15. Author: TODO.',
    );
  });

  it('tolerates inner whitespace in placeholder markers', () => {
    const rendered = renderTemplate('{{ PROJECT_NAME }} / {{DATE}}', {
      PROJECT_NAME: 'widget',
      DATE: '2026-07-26',
    });
    expect(rendered).toBe('widget / 2026-07-26');
  });

  it('preserves unknown placeholders verbatim', () => {
    const source = 'Name={{PROJECT_NAME}} Extra={{UNKNOWN}}';
    const rendered = renderTemplate(source, { PROJECT_NAME: 'x' });
    expect(rendered).toBe('Name=x Extra={{UNKNOWN}}');
  });

  it('returns literal text without placeholders unchanged', () => {
    const source = 'No placeholders here.';
    expect(renderTemplate(source, { PROJECT_NAME: 'x' })).toBe(source);
  });
});

describe('findUnresolvedPlaceholders', () => {
  it('returns unique source-ordered remaining keys', () => {
    const rendered =
      'A {{Z}} B {{A}} C {{Z}} D {{ B }} E {{MISSING}}';
    expect(findUnresolvedPlaceholders(rendered)).toEqual([
      'Z',
      'A',
      'B',
      'MISSING',
    ]);
  });
});
