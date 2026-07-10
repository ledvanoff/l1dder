import type { AdapterManifest, ParsedSkill } from '@l1dder/core';
import { computeContentHash } from '../../domain/content-hasher.js';
import { generateMarker, generateSourceComment } from '../../domain/marker.js';
import { extractSkillSections, type SkillSections } from '../../domain/section-extractor.js';
import { yamlQuotedString } from '../../domain/yaml-string.js';

/** Result of transforming a L1DDER skill into a Claude Code SKILL.md. */
export interface SkillTransformResult {
  readonly relativePath: string;
  readonly content: string;
  readonly hash: string;
}

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
 * Build Claude skill description from summary and metadata (OQ-XH-3).
 */
function buildSkillDescription(skill: ParsedSkill, summary: string): string {
  const parts: string[] = [summary.replace(/\s+/g, ' ').trim()];

  if (skill.frontMatter.roles.length > 0) {
    parts.push(`Roles: ${skill.frontMatter.roles.join(', ')}`);
  }

  parts.push(`Trigger: ${skill.frontMatter.trigger}`);

  return parts.join('. ') + '.';
}

/**
 * Transform a L1DDER skill into `.claude/skills/<id>/SKILL.md`.
 */
export function transformSkill(
  skill: ParsedSkill,
  manifest: AdapterManifest,
): SkillTransformResult {
  const skillId = skill.frontMatter.id;
  const structure = manifest.outputs.skills?.structure ?? '{skill-id}/SKILL.md';
  const relativePath = `${manifest.outputs.skills?.directory ?? '.claude/skills'}/${structure.replace('{skill-id}', skillId)}`;

  const sections = extractSkillSections(skill.body);
  const summaryContent = sections.summary ?? skill.summary;
  const description = buildSkillDescription(skill, summaryContent);

  const lines: string[] = [];
  lines.push(`# ${skill.frontMatter.name}`);
  lines.push('');

  for (const key of RETAINED_SECTIONS) {
    const content = sections[key];
    if (!content) continue;

    const heading = SECTION_HEADINGS[key] ?? key;
    lines.push(`## ${heading}`);
    lines.push('');
    lines.push(content);
    lines.push('');
  }

  const body = lines.join('\n').trimEnd() + '\n';

  const frontMatter = [
    '---',
    `name: ${skillId}`,
    `description: ${yamlQuotedString(description)}`,
    '---',
    '',
    body,
  ].join('\n');

  const hash = computeContentHash(frontMatter);
  const marker = generateMarker(hash);
  const source = generateSourceComment([skill.filePath]);
  const content = `${marker}\n${source}\n\n${frontMatter}`;

  return { relativePath, content, hash };
}
