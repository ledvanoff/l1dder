import type { AdapterManifest } from '../../ports/ide-adapter.js';
import type { ParsedSkill } from '../skill-types.js';
import type { ParsedSlashCommand } from '../slash-command.js';

export type { AdapterContentExclusions } from '../../ports/ide-adapter.js';

/**
 * Returns true when a canonical item should be transformed for the given adapter.
 *
 * Checks explicit id exclusions and tag-based exclusions from the manifest.
 */
export function shouldIncludeForAdapter(
  manifest: AdapterManifest,
  kind: 'skill' | 'command',
  id: string,
  tags: readonly string[],
): boolean {
  const exclusions = manifest.contentExclusions;
  if (kind === 'skill' && exclusions?.skillIds?.includes(id)) {
    return false;
  }
  if (kind === 'command' && exclusions?.commandIds?.includes(id)) {
    return false;
  }

  const excludeTags = manifest.excludeTags ?? [];
  if (excludeTags.some((tag) => tags.includes(tag))) {
    return false;
  }

  return true;
}

/**
 * Filter skills to those appropriate for the adapter target.
 */
export function filterSkillsForAdapter(
  manifest: AdapterManifest,
  skills: readonly ParsedSkill[],
): readonly ParsedSkill[] {
  return skills.filter((skill) =>
    shouldIncludeForAdapter(
      manifest,
      'skill',
      skill.frontMatter.id,
      skill.frontMatter.tags,
    ),
  );
}

/**
 * Filter slash commands to those appropriate for the adapter target.
 */
export function filterCommandsForAdapter(
  manifest: AdapterManifest,
  commands: readonly ParsedSlashCommand[],
): readonly ParsedSlashCommand[] {
  return commands.filter((command) =>
    shouldIncludeForAdapter(
      manifest,
      'command',
      command.frontMatter.id,
      command.frontMatter.tags,
    ),
  );
}
