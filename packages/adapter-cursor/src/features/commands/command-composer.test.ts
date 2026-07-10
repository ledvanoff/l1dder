import { describe, it, expect } from 'vitest';
import type { ParsedPersona, ParsedSlashCommand, ParsedSkill } from '@l1dder/core';
import { composeCommandBody } from './command-composer.js';

function makePersona(id = 'analyst'): ParsedPersona {
  return {
    id,
    name: 'Analyst',
    filePath: `agents/${id}.md`,
    sections: {
      systemPrompt: 'You are an Analyst. Collect requirements.',
      focusAreas: '- Requirements gathering\n- Stakeholder communication',
      antiPatterns: '- Do not make design decisions\n- Do not decompose tasks',
    },
  };
}

function makeSkill(id = 'specify-feature'): ParsedSkill {
  return {
    frontMatter: {
      id,
      name: 'Specify Feature',
      format_version: 1,
      phase: 'specify',
      roles: ['analyst'],
      trigger: 'auto',
      priority: 1,
      context_profile: null,
      tags: [],
      builtin: true,
    },
    body: [
      '# Specify Feature',
      '',
      '## Steps',
      '',
      '1. Read architecture',
      '2. Collect requirements',
      '',
      '## Validation',
      '',
      '- [ ] spec.md created',
    ].join('\n'),
    summary: 'Collects requirements.',
    filePath: `skills/built-in/${id}.md`,
    category: 'builtin',
  };
}

function makeCommand(overrides: Partial<ParsedSlashCommand> = {}): ParsedSlashCommand {
  return {
    frontMatter: {
      id: 'specify',
      name: 'Specify Feature',
      format_version: 1,
      phase: 'specify',
      trigger_kind: 'transition',
      role: 'analyst',
      skill: 'specify-feature',
      artifact_template: null,
      artifact_path: null,
      context_profile: null,
      accepts_argument: true,
      idempotent: true,
      requires_owner_approve: false,
      tags: [],
      builtin: true,
    },
    sections: {
      summary: 'Launches the SPECIFY phase.',
      system_prompt: 'You are an Analyst. Collect full requirements.',
      steps: '1. Parse argument\n2. Fill spec.md\n3. Check acceptance',
      acceptance_criteria: '- [ ] spec.md exists\n- [ ] Summary present',
      post_conditions: '- current_phase == "specify"',
      error_handling: '| Acceptance failed | Re-prompt |',
      context_profile: 'ContextEngine.render(SPECIFY, analyst)',
    },
    body: '',
    filePath: 'commands/built-in/specify.md',
    ...overrides,
  };
}

describe('composeCommandBody', () => {
  it('composes full body with Persona + Skill + Command', () => {
    const body = composeCommandBody({
      command: makeCommand(),
      persona: makePersona(),
      skill: makeSkill(),
    });
    expect(body).toContain('## Persona: Analyst');
    expect(body).toContain('## Skill: specify-feature');
    expect(body).toContain('## Command Instructions');
  });

  it('handles null persona (constitution command)', () => {
    const command = makeCommand({
      frontMatter: {
        ...makeCommand().frontMatter,
        id: 'constitution',
        trigger_kind: 'no_transition',
        skill: null,
      },
    });
    const body = composeCommandBody({
      command,
      persona: null,
      skill: null,
    });
    expect(body).not.toContain('## Persona');
    expect(body).not.toContain('## Skill');
    expect(body).toContain('## Command Instructions');
  });

  it('includes transition CLI command for transition trigger', () => {
    const body = composeCommandBody({
      command: makeCommand(),
      persona: makePersona(),
      skill: makeSkill(),
    });
    expect(body).toContain('## Transition');
    expect(body).toContain('l1dder transition --to specify');
  });

  it('omits transition for no_transition commands', () => {
    const command = makeCommand({
      frontMatter: {
        ...makeCommand().frontMatter,
        trigger_kind: 'no_transition',
      },
    });
    const body = composeCommandBody({
      command,
      persona: makePersona(),
      skill: makeSkill(),
    });
    expect(body).not.toContain('## Transition');
  });

  it('omits transition for status_change commands', () => {
    const command = makeCommand({
      frontMatter: {
        ...makeCommand().frontMatter,
        id: 'pause',
        trigger_kind: 'status_change',
        phase: '*',
      },
    });
    const body = composeCommandBody({
      command,
      persona: null,
      skill: null,
    });
    expect(body).not.toContain('## Transition');
  });

  it('includes next step hint', () => {
    const body = composeCommandBody({
      command: makeCommand(),
      persona: makePersona(),
      skill: makeSkill(),
    });
    expect(body).toContain('## Next Step');
    expect(body).toContain('/l1dder-plan');
  });

  it('includes context section when context_profile present', () => {
    const body = composeCommandBody({
      command: makeCommand(),
      persona: null,
      skill: null,
    });
    expect(body).toContain('## Context');
    expect(body).toContain('ContextEngine.render(SPECIFY, analyst)');
  });

  it('is deterministic', () => {
    const input = {
      command: makeCommand(),
      persona: makePersona(),
      skill: makeSkill(),
    };
    const a = composeCommandBody(input);
    const b = composeCommandBody(input);
    expect(a).toBe(b);
  });
});
