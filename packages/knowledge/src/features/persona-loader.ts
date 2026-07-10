import type { FileSystemPort, LoggerPort, ParsedPersona } from '@l1dder/core';
import type { Result } from '@l1dder/core';
import { ok, err } from '@l1dder/core';
import { join, basename } from 'node:path';

import { LoadError } from '../errors.js';

/** Dependencies for PersonaLoader. */
export interface PersonaLoaderDeps {
  readonly fs: FileSystemPort;
  readonly logger: LoggerPort;
}

/**
 * Section heading → `ParsedPersona.sections` key mapping.
 *
 * Keys are lowercase heading text after "## " prefix.
 */
const SECTION_MAP: Readonly<Record<string, keyof ParsedPersona['sections']>> = {
  'summary': 'summary',
  'system prompt': 'systemPrompt',
  'focus areas': 'focusAreas',
  'anti-patterns': 'antiPatterns',
  'active phases': 'activePhases',
  'review heuristics': 'reviewHeuristics',
  'handoff to other personas': 'handoffTriggers',
  'knowledge ownership': 'knowledgeOwnership',
};

const H2_REGEX = /^## (.+)$/gm;
const TITLE_REGEX = /^# (.+)$/m;

/**
 * Extract sections from a persona Markdown file.
 *
 * Splits content by `## ` headings and maps known headings to section keys.
 */
function extractSections(content: string): ParsedPersona['sections'] {
  const sections: Record<string, string> = {};
  const matches = [...content.matchAll(H2_REGEX)];

  for (const [idx, match] of matches.entries()) {
    const captured = match[1];
    if (!captured) continue;

    const heading = captured.trim().toLowerCase();
    const sectionKey = SECTION_MAP[heading];
    if (!sectionKey) continue;

    const start = match.index + match[0].length;
    const nextMatch = matches[idx + 1];
    const end = nextMatch !== undefined ? nextMatch.index : content.length;
    sections[sectionKey] = content.slice(start, end).trim();
  }

  return sections;
}

/** Extract persona name from `# Persona: <Name>` or `# <Name>` heading. */
function extractName(content: string): string {
  const match = TITLE_REGEX.exec(content);
  if (!match?.[1]) return 'Unknown';

  const title = match[1].trim();
  const personaPrefix = /^Persona:\s*/i;
  return personaPrefix.test(title) ? title.replace(personaPrefix, '').trim() : title;
}

/** Derive persona id from filename: `knowledge-updater.md` → `"knowledge-updater"`. */
function idFromFilename(fileName: string): string {
  return basename(fileName, '.md');
}

/**
 * Loads AI persona files from `agents/` directory.
 *
 * Personas are Markdown files with `## <Section>` headings (no YAML front-matter).
 * ID is derived from filename, name from `# Title` heading.
 */
export class PersonaLoader {
  private readonly fs: FileSystemPort;
  private readonly logger: LoggerPort;

  constructor(deps: PersonaLoaderDeps) {
    this.fs = deps.fs;
    this.logger = deps.logger;
  }

  /** Load all persona files from a directory. */
  async loadAll(agentsDir: string): Promise<Result<readonly ParsedPersona[], LoadError>> {
    const dirExists = await this.fs.exists(agentsDir);
    if (!dirExists) {
      return err(new LoadError(agentsDir, 'Agents directory not found'));
    }

    let entries: readonly string[];
    try {
      entries = await this.fs.readDir(agentsDir);
    } catch (cause) {
      return err(new LoadError(agentsDir, 'Failed to read agents directory', cause));
    }

    const mdFiles = entries.filter((e) => e.endsWith('.md')).sort();
    const personas: ParsedPersona[] = [];

    for (const fileName of mdFiles) {
      const filePath = join(agentsDir, fileName);
      const result = await this.loadOne(filePath);
      if (!result.ok) {
        return err(result.error);
      }
      personas.push(result.value);
    }

    this.logger.debug(`Loaded ${String(personas.length)} personas from ${agentsDir}`);
    return ok(personas);
  }

  /** Load a single persona file. */
  async loadOne(filePath: string): Promise<Result<ParsedPersona, LoadError>> {
    let content: string;
    try {
      content = await this.fs.readFile(filePath);
    } catch (cause) {
      return err(new LoadError(filePath, 'Failed to read persona file', cause));
    }

    if (!content.trim()) {
      return err(new LoadError(filePath, 'Persona file is empty'));
    }

    const id = idFromFilename(filePath);
    const name = extractName(content);
    const sections = extractSections(content);

    return ok({ id, name, filePath, sections });
  }
}
