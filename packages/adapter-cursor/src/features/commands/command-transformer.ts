import type { AdapterManifest, ParsedSlashCommand } from '@l1dder/core';
import { computeContentHash } from '../../domain/content-hasher.js';
import { generateMarker, generateSourceComment } from '../../domain/marker.js';

/** Result of transforming a L1DDER slash command into a Cursor command file. */
export interface CommandTransformResult {
  readonly relativePath: string;
  readonly content: string;
  readonly hash: string;
}

/**
 * Build Cursor `description` from slash command metadata (AD4).
 *
 * Format: first sentence of Summary + phase info + argument info.
 */
function buildDescription(command: ParsedSlashCommand): string {
  const summary = command.sections.summary ?? command.frontMatter.name;
  const firstSentence = summary.split(/\.\s/)[0]?.replace(/\n/g, ' ').trim() ?? summary;

  let description = firstSentence;
  if (!description.endsWith('.')) description += '.';

  const parts: string[] = [description];

  parts.push(`Phase: ${command.frontMatter.phase}`);

  if (command.frontMatter.accepts_argument) {
    parts.push('Accepts argument');
  }
  if (command.frontMatter.requires_owner_approve) {
    parts.push('Requires owner approval');
  }

  return parts.join('. ') + '.';
}

/**
 * Build Cursor `when_to_use` from the command's When to Use section.
 *
 * Falls back to a generic description if the section is absent.
 */
function buildWhenToUse(command: ParsedSlashCommand): string {
  if (command.sections.when_to_use) {
    return command.sections.when_to_use.replace(/\n/g, ' ').trim();
  }
  return `Use when the project is in the ${command.frontMatter.phase} phase.`;
}

/**
 * Transform a L1DDER canonical slash command into a Cursor command file (AD4).
 *
 * - Generates Cursor-native YAML front-matter (description, when_to_use)
 * - Adds `L1DDER:MANAGED` marker + source comment
 * - Includes the composed body (from CommandComposer)
 */
export function transformCommand(
  command: ParsedSlashCommand,
  composedBody: string,
  manifest: AdapterManifest,
): CommandTransformResult {
  const id = command.frontMatter.id;
  const pattern = manifest.outputs.commands?.filePattern ?? 'l1dder-{id}.md';
  const dir = manifest.outputs.commands?.directory ?? '.cursor/commands';
  const relativePath = `${dir}/${pattern.replace('{id}', id)}`;

  const description = buildDescription(command);
  const whenToUse = buildWhenToUse(command);

  const bodyContent = [
    '---',
    `description: "${description}"`,
    `when_to_use: "${whenToUse}"`,
    '---',
    '',
    composedBody,
  ].join('\n');

  const hash = computeContentHash(bodyContent);
  const marker = generateMarker(hash);
  const sources = [command.filePath];
  const source = generateSourceComment(sources);

  const frontMatterEnd = bodyContent.indexOf('---', 4);
  const afterFrontMatter = frontMatterEnd + 3;
  const content =
    bodyContent.slice(0, afterFrontMatter) +
    '\n' +
    marker +
    '\n' +
    source +
    bodyContent.slice(afterFrontMatter);

  return { relativePath, content, hash };
}
