import { describe, expect, it } from 'vitest';

import { Phase } from './phase.js';
import { PHASE_COMMAND_MAP, WILDCARD_COMMANDS, resolveSlashCommand } from './slash-command.js';
import type { ParsedSlashCommand, SlashCommandRegistry } from './slash-command.js';

function makeCommand(id: string, phase: string): ParsedSlashCommand {
  return {
    frontMatter: {
      id,
      name: `Command ${id}`,
      format_version: 1,
      phase,
      trigger_kind: 'transition',
      role: 'developer',
      skill: null,
      artifact_template: null,
      artifact_path: null,
      context_profile: null,
      accepts_argument: false,
      idempotent: true,
      requires_owner_approve: false,
      tags: [],
      builtin: true,
    },
    sections: {},
    body: '',
    filePath: `commands/built-in/${id}.md`,
  };
}

function createRegistry(commands: ParsedSlashCommand[]): SlashCommandRegistry {
  const store = new Map<string, ParsedSlashCommand>();
  for (const cmd of commands) store.set(cmd.frontMatter.id, cmd);

  return {
    get: (id) => store.get(id),
    getAll: () => [...store.values()],
    getByPhase: (phase: Phase) => {
      const cmdId = PHASE_COMMAND_MAP[phase as keyof typeof PHASE_COMMAND_MAP];
      return cmdId ? store.get(cmdId) : undefined;
    },
    register: (cmd) => store.set(cmd.frontMatter.id, cmd),
    has: (id) => store.has(id),
  };
}

describe('PHASE_COMMAND_MAP', () => {
  it('maps idle to specify', () => {
    expect(PHASE_COMMAND_MAP.idle).toBe('specify');
  });

  it('maps specify to plan', () => {
    expect(PHASE_COMMAND_MAP.specify).toBe('plan');
  });

  it('maps all main workflow phases', () => {
    expect(PHASE_COMMAND_MAP.plan).toBe('update-tobe');
    expect(PHASE_COMMAND_MAP.update_tobe).toBe('tasks');
    expect(PHASE_COMMAND_MAP.tasks).toBe('implement');
    expect(PHASE_COMMAND_MAP.implement).toBe('update-asis');
    expect(PHASE_COMMAND_MAP.update_asis).toBe('complete');
    expect(PHASE_COMMAND_MAP.complete).toBe('specify');
  });
});

describe('WILDCARD_COMMANDS', () => {
  it('includes pause and constitution', () => {
    expect(WILDCARD_COMMANDS).toContain('pause');
    expect(WILDCARD_COMMANDS).toContain('constitution');
  });
});

describe('resolveSlashCommand', () => {
  const allCommands = [
    makeCommand('specify', 'specify'),
    makeCommand('plan', 'plan'),
    makeCommand('update-tobe', 'update_tobe'),
    makeCommand('tasks', 'tasks'),
    makeCommand('implement', 'implement'),
    makeCommand('update-asis', 'update_asis'),
    makeCommand('complete', 'complete'),
    makeCommand('constitution', 'idle'),
    makeCommand('pause', '*'),
  ];

  const registry = createRegistry(allCommands);

  it('returns specify command for IDLE phase', () => {
    const result = resolveSlashCommand(Phase.IDLE, registry);
    expect(result).toBeDefined();
    expect(result?.frontMatter.id).toBe('specify');
  });

  it('returns plan command for SPECIFY phase', () => {
    const result = resolveSlashCommand(Phase.SPECIFY, registry);
    expect(result).toBeDefined();
    expect(result?.frontMatter.id).toBe('plan');
  });

  it('returns undefined for unmapped phase (INIT does not exist)', () => {
    const result = resolveSlashCommand(Phase.REVIEW, registry);
    expect(result).toBeUndefined();
  });

  it('returns undefined when command not in registry', () => {
    const emptyRegistry = createRegistry([]);
    const result = resolveSlashCommand(Phase.IDLE, emptyRegistry);
    expect(result).toBeUndefined();
  });

  it('resolves full chain: idle → specify → plan → ... → complete → specify', () => {
    const chain = [
      Phase.IDLE,
      Phase.SPECIFY,
      Phase.PLAN,
      Phase.UPDATE_TOBE,
      Phase.TASKS,
      Phase.IMPLEMENT,
      Phase.UPDATE_ASIS,
      Phase.COMPLETE,
    ];
    const expectedIds = [
      'specify', 'plan', 'update-tobe', 'tasks',
      'implement', 'update-asis', 'complete', 'specify',
    ];

    for (const [i, phase] of chain.entries()) {
      const result = resolveSlashCommand(phase, registry);
      expect(result?.frontMatter.id).toBe(expectedIds[i]);
    }
  });
});

describe('SlashCommandRegistry (inline impl)', () => {
  it('getByPhase returns correct command', () => {
    const registry = createRegistry([makeCommand('plan', 'plan')]);
    const result = registry.getByPhase(Phase.SPECIFY);
    expect(result).toBeDefined();
    expect(result?.frontMatter.id).toBe('plan');
  });

  it('getByPhase returns undefined for unmapped phase', () => {
    const registry = createRegistry([makeCommand('plan', 'plan')]);
    const result = registry.getByPhase(Phase.REVIEW);
    expect(result).toBeUndefined();
  });

  it('get returns command by id', () => {
    const registry = createRegistry([makeCommand('specify', 'specify')]);
    expect(registry.get('specify')).toBeDefined();
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('getAll returns all registered commands', () => {
    const commands = [makeCommand('a', 'idle'), makeCommand('b', 'specify')];
    const registry = createRegistry(commands);
    expect(registry.getAll()).toHaveLength(2);
  });

  it('has checks existence', () => {
    const registry = createRegistry([makeCommand('test', 'idle')]);
    expect(registry.has('test')).toBe(true);
    expect(registry.has('missing')).toBe(false);
  });
});
