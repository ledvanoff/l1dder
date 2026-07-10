const HEADING_REGEX = /^## Summary\s*$/im;
const NEXT_HEADING_REGEX = /^#{1,2} /m;
const FALLBACK_LENGTH = 500;

/**
 * Extract the `## Summary` section from a Markdown document.
 *
 * Falls back to the first 500 characters with a `<!-- truncated -->` marker
 * if no `## Summary` heading is found.
 */
export function extractSummary(content: string): string {
  const headingMatch = HEADING_REGEX.exec(content);
  if (!headingMatch) {
    if (content.length <= FALLBACK_LENGTH) {
      return content.trim();
    }
    return content.slice(0, FALLBACK_LENGTH).trim() + '\n<!-- truncated -->';
  }

  const bodyStart = headingMatch.index + headingMatch[0].length;
  const remaining = content.slice(bodyStart);

  const nextHeading = NEXT_HEADING_REGEX.exec(remaining.slice(1));
  const bodyEnd = nextHeading ? nextHeading.index + 1 : remaining.length;
  const body = remaining.slice(0, bodyEnd).trim();

  return body || content.trim();
}
