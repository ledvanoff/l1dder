const H2_REGEX = /^## (.+)$/gm;

/** Known section headings for L1DDER skill files. */
export interface SkillSections {
  readonly summary?: string;
  readonly whenToUse?: string;
  readonly steps?: string;
  readonly validation?: string;
  readonly output?: string;
  readonly notes?: string;
}

const SKILL_SECTION_MAP: Readonly<Record<string, keyof SkillSections>> = {
  'summary': 'summary',
  'when to use': 'whenToUse',
  'steps': 'steps',
  'validation': 'validation',
  'output': 'output',
  'notes': 'notes',
};

/**
 * Extract known `## ` sections from a Markdown body string.
 *
 * Used to pull structured data from `ParsedSkill.body` and
 * `ParsedSlashCommand.body` which store the raw Markdown.
 */
export function extractSkillSections(body: string): SkillSections {
  const sections: Record<string, string> = {};
  const matches = [...body.matchAll(H2_REGEX)];

  for (const [idx, match] of matches.entries()) {
    const captured = match[1];
    if (!captured) continue;

    const heading = captured.trim().toLowerCase();
    const key = SKILL_SECTION_MAP[heading];
    if (!key) continue;

    const start = match.index + match[0].length;
    const nextMatch = matches[idx + 1];
    const end = nextMatch !== undefined ? nextMatch.index : body.length;
    sections[key] = body.slice(start, end).trim();
  }

  return sections;
}
