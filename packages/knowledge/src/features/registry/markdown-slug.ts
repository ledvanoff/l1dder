/**
 * GitHub-style Markdown heading slug helpers for registry source anchors.
 *
 * @packageDocumentation
 */

/**
 * Convert Markdown heading text to a GitHub-flavored anchor slug.
 *
 * Rules (aligned with GitHub): lowercase; strip punctuation; spaces → `-`;
 * keep letters, numbers, spaces and hyphens. Duplicate-suffix handling is
 * applied separately in {@link collectHeadingSlugs}.
 *
 * @param headingText - Heading content without leading `#` markers
 * @returns Slug string (may be empty for a heading with no slugifiable chars)
 *
 * @example
 * githubHeadingSlug('FEAT-001: Guided Discovery')
 * // → 'feat-001-guided-discovery'
 */
export function githubHeadingSlug(headingText: string): string {
  return headingText
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

/**
 * Collect GitHub-style heading slugs present in a Markdown document.
 *
 * Duplicate headings receive GitHub's `-1`, `-2`, … suffixes.
 *
 * @param markdown - Full Markdown file contents
 * @returns Set of anchor slugs found in the document
 */
export function collectHeadingSlugs(markdown: string): ReadonlySet<string> {
  const slugs = new Set<string>();
  const seenCounts = new Map<string, number>();
  const headingPattern = /^(#{1,6})\s+(.+?)\s*$/gm;

  for (const match of markdown.matchAll(headingPattern)) {
    const text = match[2];
    if (text === undefined) continue;

    const base = githubHeadingSlug(text);
    if (base.length === 0) continue;

    const count = seenCounts.get(base) ?? 0;
    seenCounts.set(base, count + 1);
    const slug = count === 0 ? base : `${base}-${String(count)}`;
    slugs.add(slug);
  }

  return slugs;
}

/** Explicit HTML anchor inside Markdown: `<a id="x">` or `<a name="x">`. */
const EXPLICIT_ANCHOR_RE =
  /<a\s+(?:id|name)\s*=\s*["']([^"']+)["'][^>]*>/giu;

/**
 * Collect explicit HTML anchor ids declared inside a Markdown document.
 *
 * Table rows cannot carry headings, so narrative cards that live in tables
 * (roadmap `DEBT-*` / `BL-*` pools) mark themselves with an inline
 * `<a id="…"></a>` element.
 *
 * @param markdown - Full Markdown file contents
 * @returns Set of explicit anchor ids (verbatim, not slugified)
 */
export function collectExplicitAnchors(
  markdown: string,
): ReadonlySet<string> {
  const anchors = new Set<string>();
  for (const match of markdown.matchAll(EXPLICIT_ANCHOR_RE)) {
    const id = match[1]?.trim();
    if (id !== undefined && id.length > 0) {
      anchors.add(id);
    }
  }
  return anchors;
}

/**
 * Collect every anchor target a registry source anchor may point at.
 *
 * Union of heading slugs ({@link collectHeadingSlugs}) and explicit HTML
 * anchors ({@link collectExplicitAnchors}).
 *
 * @param markdown - Full Markdown file contents
 * @returns Set of resolvable anchor targets
 */
export function collectAnchorTargets(markdown: string): ReadonlySet<string> {
  const targets = new Set<string>(collectHeadingSlugs(markdown));
  for (const anchor of collectExplicitAnchors(markdown)) {
    targets.add(anchor);
  }
  return targets;
}

/**
 * Split a registry source-anchor string into file path and optional slug.
 *
 * @param anchor - Value like `knowledge/to-be/usecases.md#feat-001`
 * @returns File path and heading slug (`undefined` when `#` is absent/empty)
 */
export function splitSourceAnchor(anchor: string): {
  readonly filePath: string;
  readonly headingSlug: string | undefined;
} {
  const hashIndex = anchor.indexOf('#');
  if (hashIndex === -1) {
    return { filePath: anchor, headingSlug: undefined };
  }

  const filePath = anchor.slice(0, hashIndex);
  const headingSlug = anchor.slice(hashIndex + 1);
  return {
    filePath,
    headingSlug: headingSlug.length > 0 ? headingSlug : undefined,
  };
}
