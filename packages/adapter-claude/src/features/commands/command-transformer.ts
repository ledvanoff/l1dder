import type { AdapterManifest, ParsedSlashCommand } from '@l1dder/core';
import { computeContentHash } from '../../domain/content-hasher.js';
import { generateMarker, generateSourceComment } from '../../domain/marker.js';
import { yamlQuotedString } from '../../domain/yaml-string.js';

/** Result of transforming a L1DDER slash command into a Claude Code skill. */
export interface CommandTransformResult {
  readonly relativePath: string;
  readonly content: string;
  readonly hash: string;
}

/**
 * Build Claude skill description from slash command metadata.
 */
function buildDescription(command: ParsedSlashCommand): string {
  const summary = command.sections.summary ?? command.frontMatter.name;
  const firstSentence = summary.split(/\.\s/)[0]?.replace(/\n/g, ' ').trim() ?? summary;

  let description = firstSentence;
  if (!description.endsWith('.')) description += '.';

  const parts: string[] = [description, `Phase: ${command.frontMatter.phase}`];

  if (command.frontMatter.accepts_argument) {
    parts.push('Accepts argument');
  }
  if (command.frontMatter.requires_owner_approve) {
    parts.push('Requires owner approval');
  }

  return parts.join('. ') + '.';
}

/**
 * Transform a L1DDER slash command into `.claude/skills/l1dder-<id>/SKILL.md`.
 */
export function transformCommand(
  command: ParsedSlashCommand,
  composedBody: string,
  manifest: AdapterManifest,
): CommandTransformResult {
  const id = command.frontMatter.id;
  const skillName = `${manifest.managedPrefix}${id}`;
  const pattern = manifest.outputs.commands?.filePattern ?? 'l1dder-{id}/SKILL.md';
  const dir = manifest.outputs.commands?.directory ?? '.claude/skills';
  const relativePath = `${dir}/${pattern.replace('{id}', id)}`;

  const description = buildDescription(command);

  const bodyContent = [
    '---',
    `name: ${skillName}`,
    `description: ${yamlQuotedString(description)}`,
    'user-invocable: true',
    'disable-model-invocation: false',
    '---',
    '',
    composedBody,
  ].join('\n');

  const hash = computeContentHash(bodyContent);
  const marker = generateMarker(hash);
  const source = generateSourceComment([command.filePath]);

  const frontMatterEnd = bodyContent.indexOf('---', 4);
  const afterFrontMatter = frontMatterEnd + 3;
  const content =
    marker +
    '\n' +
    source +
    '\n\n' +
    bodyContent.slice(0, afterFrontMatter) +
    '\n' +
    bodyContent.slice(afterFrontMatter);

  return { relativePath, content, hash };
}
