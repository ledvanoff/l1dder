import { describe, expect, it } from 'vitest';

import {
  collectAnchorTargets,
  collectExplicitAnchors,
  collectHeadingSlugs,
  githubHeadingSlug,
  splitSourceAnchor,
} from './markdown-slug.js';

describe('githubHeadingSlug', () => {
  it('maps FEAT heading with colon to github slug', () => {
    expect(githubHeadingSlug('FEAT-001: Guided Discovery')).toBe(
      'feat-001-guided-discovery',
    );
  });

  it('strips punctuation and collapses spaces', () => {
    expect(githubHeadingSlug('Hello, World! (draft)')).toBe('hello-world-draft');
  });
});

describe('collectHeadingSlugs', () => {
  it('collects heading slugs from markdown', () => {
    const slugs = collectHeadingSlugs(
      '# Title\n\n## FEAT-001: Guided Discovery\n\n### Nested\n',
    );
    expect(slugs.has('title')).toBe(true);
    expect(slugs.has('feat-001-guided-discovery')).toBe(true);
    expect(slugs.has('nested')).toBe(true);
  });

  it('applies github duplicate suffixes', () => {
    const slugs = collectHeadingSlugs('## Dup\n\n## Dup\n\n## Dup\n');
    expect(slugs.has('dup')).toBe(true);
    expect(slugs.has('dup-1')).toBe(true);
    expect(slugs.has('dup-2')).toBe(true);
  });
});

describe('collectExplicitAnchors', () => {
  it('collects anchor ids declared inside a table row', () => {
    const anchors = collectExplicitAnchors(
      '| ID | Status |\n|---|---|\n| <a id="debt-001"></a>DEBT-001 | open |\n',
    );
    expect([...anchors]).toEqual(['debt-001']);
  });

  it('accepts the name attribute and single quotes', () => {
    const anchors = collectExplicitAnchors(
      "<a name='bl-002'></a>\n<a id=\"bl-003\" class='x'></a>",
    );
    expect([...anchors].sort()).toEqual(['bl-002', 'bl-003']);
  });

  it('keeps anchor ids verbatim instead of slugifying them', () => {
    const anchors = collectExplicitAnchors('<a id="DEBT_001.x"></a>');
    expect([...anchors]).toEqual(['DEBT_001.x']);
  });

  it('ignores links that are not anchor declarations', () => {
    const anchors = collectExplicitAnchors(
      '<a href="#debt-001">DEBT-001</a> and [link](#bl-001)',
    );
    expect([...anchors]).toEqual([]);
  });
});

describe('collectAnchorTargets', () => {
  it('resolves both heading slugs and explicit table anchors', () => {
    const targets = collectAnchorTargets(
      '### Technical Debt\n\n| ID |\n|---|\n| <a id="debt-001"></a>DEBT-001 |\n',
    );
    expect(targets.has('technical-debt')).toBe(true);
    expect(targets.has('debt-001')).toBe(true);
  });
});

describe('splitSourceAnchor', () => {
  it('splits path and slug', () => {
    expect(splitSourceAnchor('knowledge/to-be/usecases.md#feat-001')).toEqual({
      filePath: 'knowledge/to-be/usecases.md',
      headingSlug: 'feat-001',
    });
  });

  it('returns undefined slug when hash is absent', () => {
    expect(splitSourceAnchor('knowledge/roadmap.md')).toEqual({
      filePath: 'knowledge/roadmap.md',
      headingSlug: undefined,
    });
  });
});
