import {
  PHASE_COMMAND_MAP,
  SLASH_COMMAND_FILE_PREFIX,
  WILDCARD_COMMANDS,
  phaseSlashRef,
  slashCommandRef,
  suggestCanonicalPhase,
} from '@l1dder/core';
import type { Phase } from '@l1dder/core';
import { PhaseSchema } from '@l1dder/schemas';

/** Human-visible slash prefix (`/` + {@link SLASH_COMMAND_FILE_PREFIX}). */
const HUMAN_SLASH_PREFIX = `/${SLASH_COMMAND_FILE_PREFIX}`;

/** Classification of an unknown `l1dder help <topic>` argument. */
export type HelpTopicKind =
  | { readonly kind: 'phase'; readonly phase: string }
  | { readonly kind: 'slash'; readonly id: string }
  | { readonly kind: 'phase_alias'; readonly input: string; readonly canonical: string }
  | { readonly kind: 'unknown'; readonly input: string };

const KNOWN_SLASH_IDS: ReadonlySet<string> = new Set([
  ...Object.values(PHASE_COMMAND_MAP).filter(
    (id): id is string => typeof id === 'string',
  ),
  ...WILDCARD_COMMANDS,
]);

/**
 * Classify a help topic that is not a registered CLI command.
 */
export function classifyHelpTopic(raw: string): HelpTopicKind {
  const input = raw.trim();
  const phaseParsed = PhaseSchema.safeParse(input);
  if (phaseParsed.success) {
    return { kind: 'phase', phase: phaseParsed.data };
  }

  const slashId = normalizeSlashId(input);
  if (slashId !== null && KNOWN_SLASH_IDS.has(slashId)) {
    return { kind: 'slash', id: slashId };
  }

  const suggested = suggestCanonicalPhase(input);
  if (suggested !== null && !isCanonicalPhaseName(input)) {
    return { kind: 'phase_alias', input, canonical: suggested };
  }

  return { kind: 'unknown', input };
}

/**
 * Build a human explanation for a non-CLI help topic.
 *
 * @param availableCommands - registered top-level CLI command names
 */
export function formatUnknownHelpTopic(
  topic: HelpTopicKind,
  availableCommands: readonly string[],
): string {
  switch (topic.kind) {
    case 'phase': {
      // Prefer the slash id that names this phase (hyphen form), not the
      // default *forward* command from PHASE_COMMAND_MAP (phaseSlashRef).
      const slashId = topic.phase.replaceAll('_', '-');
      const slash = KNOWN_SLASH_IDS.has(slashId)
        ? slashCommandRef(slashId)
        : phaseSlashRef(topic.phase as Phase);
      const slashLine = slash
        ? `In an AI IDE invoke it as ${slash}.`
        : 'This phase has no default slash command.';
      return [
        `"${topic.phase}" is a workflow phase (and often a slash command), not a CLI command.`,
        slashLine,
        `In CLI, move the phase machine with: l1dder transition --to ${topic.phase}`,
        'See also: l1dder helpme | l1dder status',
      ].join('\n');
    }
    case 'slash': {
      const ref = slashCommandRef(topic.id);
      return [
        `"${topic.id}" is a slash command (${ref}), not a CLI command.`,
        `In an AI IDE invoke it as ${ref}.`,
        'In CLI, use the matching workflow command (often `l1dder transition --to <phase>` or `l1dder helpme`).',
        'See also: l1dder helpme | l1dder status',
      ].join('\n');
    }
    case 'phase_alias':
      return [
        `"${topic.input}" is not a CLI command.`,
        `Did you mean the workflow phase \`${topic.canonical}\`?`,
        `In CLI: l1dder transition --to ${topic.canonical}`,
        (() => {
          const slash = phaseSlashRef(topic.canonical as Phase);
          return slash
            ? `In an AI IDE: ${slash}`
            : 'See also: l1dder helpme | l1dder status';
        })(),
      ].join('\n');
    case 'unknown':
      return [
        `Unknown command or topic: "${topic.input}".`,
        `Available commands: ${availableCommands.join(', ')}`,
        `Tip: workflow phases / slash commands use ${slashCommandRef('<id>')} in AI IDEs; CLI uses \`l1dder transition --to <phase>\`.`,
      ].join('\n');
  }
}

function normalizeSlashId(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.startsWith(HUMAN_SLASH_PREFIX)) {
    return trimmed.slice(HUMAN_SLASH_PREFIX.length);
  }
  if (trimmed.startsWith(SLASH_COMMAND_FILE_PREFIX)) {
    return trimmed.slice(SLASH_COMMAND_FILE_PREFIX.length);
  }
  // bare id (e.g. "specify", "update-tobe")
  if (KNOWN_SLASH_IDS.has(trimmed)) {
    return trimmed;
  }
  return null;
}

function isCanonicalPhaseName(input: string): boolean {
  return PhaseSchema.safeParse(input.trim()).success;
}
