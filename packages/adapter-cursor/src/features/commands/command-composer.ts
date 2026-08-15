import type { ParsedPersona, ParsedSlashCommand, ParsedSkill } from '@l1dder/core';
import { extractSkillSections } from '../../domain/section-extractor.js';

/** Input for the command composition pipeline. */
export interface CompositionInput {
  readonly command: ParsedSlashCommand;
  readonly persona: ParsedPersona | null;
  readonly skill: ParsedSkill | null;
}

/**
 * Map of slash command ids to their "next step" hints (SC10 explicit handoff).
 * Each entry is the next command the user should invoke.
 *
 * Intentionally omits `next` (`/l1dder-next`): that command is the projection
 * dispatcher / primary entrypoint, not a phase with a chained successor.
 * Phase-specific entries below remain the advanced surface handoff hints.
 */
const NEXT_STEP_MAP: Readonly<Record<string, string>> = {
  constitution: '/l1dder-specify',
  specify: '/l1dder-plan',
  plan: '/l1dder-update-tobe',
  'update-tobe': '/l1dder-tasks',
  tasks: '/l1dder-implement',
  implement: '/l1dder-update-asis',
  'update-asis': '/l1dder-complete',
  complete: '/l1dder-specify',
};

/**
 * Compose the final prompt body from three sources (SC6/AD4):
 * Persona (WHO) + Skill (HOW) + Slash command (WHAT + orchestration).
 *
 * Section order: Persona → Skill → Command Instructions → Context → Transition → Next Step.
 */
export function composeCommandBody(input: CompositionInput): string {
  const { command, persona, skill } = input;
  const sections: string[] = [];

  if (persona) {
    sections.push(composePersonaSection(persona));
  }

  if (skill) {
    sections.push(composeSkillSection(skill));
  }

  sections.push(composeCommandSection(command));

  if (command.sections.context_profile) {
    sections.push(`## Context\n\n${command.sections.context_profile}`);
  }

  if (command.frontMatter.trigger_kind === 'transition') {
    sections.push(composeTransitionSection(command));
  }

  const nextStep = NEXT_STEP_MAP[command.frontMatter.id];
  if (nextStep) {
    sections.push(`## Next Step\n\nWhen this phase is complete, proceed with: \`${nextStep}\``);
  }

  return sections.join('\n\n') + '\n';
}

function composePersonaSection(persona: ParsedPersona): string {
  const parts: string[] = [`## Persona: ${persona.name}`];
  parts.push('');

  if (persona.sections.systemPrompt) {
    parts.push(persona.sections.systemPrompt);
    parts.push('');
  }

  if (persona.sections.focusAreas) {
    parts.push('### Focus Areas');
    parts.push('');
    parts.push(persona.sections.focusAreas);
    parts.push('');
  }

  if (persona.sections.antiPatterns) {
    parts.push('### Anti-Patterns');
    parts.push('');
    parts.push(persona.sections.antiPatterns);
    parts.push('');
  }

  return parts.join('\n').trimEnd();
}

function composeSkillSection(skill: ParsedSkill): string {
  const sections = extractSkillSections(skill.body);
  const parts: string[] = [`## Skill: ${skill.frontMatter.id}`];
  parts.push('');

  if (sections.steps) {
    parts.push('### Steps');
    parts.push('');
    parts.push(sections.steps);
    parts.push('');
  }

  if (sections.validation) {
    parts.push('### Validation');
    parts.push('');
    parts.push(sections.validation);
    parts.push('');
  }

  return parts.join('\n').trimEnd();
}

function composeCommandSection(command: ParsedSlashCommand): string {
  const parts: string[] = ['## Command Instructions'];
  parts.push('');

  if (command.sections.system_prompt) {
    parts.push(command.sections.system_prompt);
    parts.push('');
  }

  if (command.sections.steps) {
    parts.push('### Steps');
    parts.push('');
    parts.push(command.sections.steps);
    parts.push('');
  }

  if (command.sections.acceptance_criteria) {
    parts.push('### Acceptance Criteria');
    parts.push('');
    parts.push(command.sections.acceptance_criteria);
    parts.push('');
  }

  if (command.sections.post_conditions) {
    parts.push('### Post-Conditions');
    parts.push('');
    parts.push(command.sections.post_conditions);
    parts.push('');
  }

  if (command.sections.error_handling) {
    parts.push('### Error Handling');
    parts.push('');
    parts.push(command.sections.error_handling);
    parts.push('');
  }

  return parts.join('\n').trimEnd();
}

function composeTransitionSection(command: ParsedSlashCommand): string {
  const phase = command.frontMatter.phase;
  const id = command.frontMatter.id;

  return [
    '## Transition',
    '',
    'After acceptance check, execute in terminal:',
    '',
    '```',
    `l1dder transition --to ${phase} --trigger-source slash --slash-command ${id} --json`,
    '```',
  ].join('\n');
}
