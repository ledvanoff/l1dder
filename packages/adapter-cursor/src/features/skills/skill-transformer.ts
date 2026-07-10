import type { ParsedSkill } from '@l1dder/core';
import type { AdapterManifest } from '@l1dder/core';
import { computeContentHash } from '../../domain/content-hasher.js';
import { generateMarker, generateSourceComment } from '../../domain/marker.js';
import { extractSkillSections, type SkillSections } from '../../domain/section-extractor.js';

/** Result of transforming a L1DDER skill into a Cursor SKILL.md. */
export interface SkillTransformResult {
  readonly relativePath: string;
  readonly content: string;
  readonly hash: string;
}

/**
 * Body sections to retain from a L1DDER skill in the Cursor SKILL.md output.
 * Order matters — sections appear in this order in the output.
 */
const RETAINED_SECTIONS: readonly (keyof SkillSections)[] = [
  'summary',
  'whenToUse',
  'steps',
  'validation',
  'output',
  'notes',
];

const SECTION_HEADINGS: Readonly<Record<string, string>> = {
  summary: 'Summary',
  whenToUse: 'When to Use',
  steps: 'Steps',
  validation: 'Validation',
  output: 'Output',
  notes: 'Notes',
};

/**
 * Build an enriched Summary with roles and trigger info (AD5).
 */
function enrichSummary(skill: ParsedSkill, originalSummary: string): string {
  const parts: string[] = [];

  if (skill.frontMatter.roles.length > 0) {
    parts.push(`**Roles:** ${skill.frontMatter.roles.join(', ')}`);
  }
  parts.push(`**Trigger:** ${skill.frontMatter.trigger}`);

  return `${originalSummary}\n\n${parts.join('. ')}.`;
}

/**
 * Transform a L1DDER skill into a Cursor SKILL.md (AD5 transform rules).
 *
 * - Strips L1DDER YAML front-matter
 * - Retains body sections (Summary, When to Use, Steps, Validation, Output, Notes)
 * - Enriches Summary with roles and trigger info
 * - Adds `L1DDER:MANAGED` marker + source comment at top
 */
export function transformSkill(
  skill: ParsedSkill,
  manifest: AdapterManifest,
): SkillTransformResult {
  const skillId = skill.frontMatter.id;
  const structure = manifest.outputs.skills?.structure ?? '{skill-id}/SKILL.md';
  const relativePath = `${manifest.outputs.skills?.directory ?? '.cursor/skills-l1dder'}/${structure.replace('{skill-id}', skillId)}`;

  const sections = extractSkillSections(skill.body);
  const lines: string[] = [];
  lines.push(`# ${skill.frontMatter.name}`);
  lines.push('');

  for (const key of RETAINED_SECTIONS) {
    const content = sections[key];
    if (!content) continue;

    const heading = SECTION_HEADINGS[key] ?? key;
    lines.push(`## ${heading}`);
    lines.push('');

    if (key === 'summary') {
      lines.push(enrichSummary(skill, content));
    } else {
      lines.push(content);
    }
    lines.push('');
  }

  const body = lines.join('\n').trimEnd() + '\n';
  const hash = computeContentHash(body);

  const marker = generateMarker(hash);
  const source = generateSourceComment([skill.filePath]);
  const content = `${marker}\n${source}\n\n${body}`;

  return { relativePath, content, hash };
}
