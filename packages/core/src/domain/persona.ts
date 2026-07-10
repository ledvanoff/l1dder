/**
 * Runtime representation of a parsed AI persona from `agents/*.md`.
 *
 * Personas use Markdown sections (no YAML front-matter).
 * ID is derived from filename (e.g. `analyst.md` → `"analyst"`).
 */
export interface ParsedPersona {
  /** Unique persona identifier derived from filename (kebab-case). */
  readonly id: string;

  /** Human-readable display name from `# Title` heading. */
  readonly name: string;

  /** Absolute or relative path to the source file. */
  readonly filePath: string;

  /** Extracted Markdown sections. Missing sections are `undefined`. */
  readonly sections: {
    readonly summary?: string;
    readonly systemPrompt?: string;
    readonly focusAreas?: string;
    readonly antiPatterns?: string;
    readonly activePhases?: string;
    readonly reviewHeuristics?: string;
    readonly handoffTriggers?: string;
    readonly knowledgeOwnership?: string;
  };
}
