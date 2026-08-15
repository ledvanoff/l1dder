import { describe, it, expect } from 'vitest';
import { InMemoryFileSystem, NullLogger } from '@l1dder/core/testing';
import type { AdapterContext, ParsedPersona, ParsedSkill, ParsedSlashCommand } from '@l1dder/core';
import type { Config, SlashCommandPhase } from '@l1dder/schemas';
import type { MergedStandards } from '@l1dder/knowledge';
import { CursorAdapter } from '../src/cursor-adapter.js';

function createSkill(id: string, name: string): ParsedSkill {
  return {
    frontMatter: {
      id,
      name,
      format_version: 1 as const,
      phase: 'specify',
      roles: ['analyst'],
      trigger: 'auto',
      priority: 5,
      context_profile: null,
      tags: [],
      keywords: [],
      builtin: true,
    },
    body: `## Summary\n\nGuide through ${name}.\n\n## Steps\n\n1. Step one\n2. Step two\n\n## Validation\n\n- Check output\n`,
    summary: `Guide through ${name}.`,
    filePath: `skills/built-in/${id}.md`,
    category: 'builtin',
  };
}

function createCommand(id: string, phase: SlashCommandPhase, role: string, skill: string | null): ParsedSlashCommand {
  return {
    frontMatter: {
      id,
      name: `L1DDER ${id}`,
      format_version: 1 as const,
      phase,
      trigger_kind: id === 'constitution' ? 'no_transition' : id === 'pause' ? 'status_change' : 'transition',
      role,
      skill,
      artifact_template: null,
      artifact_path: null,
      context_profile: null,
      accepts_argument: id === 'implement',
      idempotent: true,
      requires_owner_approve: false,
      tags: [],
      builtin: true,
    },
    sections: {
      summary: `Start the ${phase} phase.`,
      when_to_use: `Use when entering ${phase} phase.`,
      system_prompt: `You are an AI assistant helping with ${phase}.`,
      steps: `1. Analyze context\n2. Produce output\n3. Validate`,
      acceptance_criteria: `- Output exists\n- Validation passes`,
      post_conditions: `Phase transitioned to ${phase}.`,
      error_handling: `If validation fails, re-prompt user.`,
    },
    body: `## Summary\n\nStart ${phase}.\n\n## Steps\n\n1. Do it\n`,
    filePath: `commands/built-in/${id}.md`,
  };
}

function createPersona(id: string, name: string): ParsedPersona {
  return {
    id,
    name,
    filePath: `agents/${id}.md`,
    sections: {
      summary: `${name} persona summary.`,
      systemPrompt: `You are the ${name}. Focus on quality.`,
      focusAreas: `- Area 1\n- Area 2`,
      antiPatterns: `- Don't do X`,
    },
  };
}

function createContext(
  fs: InMemoryFileSystem,
  overrides?: Partial<AdapterContext>,
): AdapterContext {
  const config: Config = {
    schema_version: 1,
    role_mode: 'solo',
    adapters: [],
    language: { docs: 'en', chat: 'en' },
    gates: { default: { enabled: true, skip_allowed: false, min_approvers: 1, custom_gates: [] }, overrides: {} },
    stage: {
      enforcement: { restrict_phases: 'advisory' },
      delivery_criteria: {
        require_idea_not_skeleton: true,
        require_roadmap: true,
        require_architecture_not_skeleton: true,
        require_erd_not_skeleton: true,
        require_usecases_not_skeleton: true,
        min_design_files: 1,
        check_skeleton_markers: true,
      },
    },
    context: { token_budget: 120000, reserved_tokens: 30000, chars_per_token: 3.0, overrides: {}, extra_files: [] },
    presets: { active: 'default', custom: {} },
    hooks: { enabled: true, profile: 'standard', disabled: [], session_start_max_chars: 8000 },
    hygiene: { drift_threshold: 3, maintenance_cadence_days: 30 },
  };

  const standards: MergedStandards = {
    conventions: {
      base: {
        meta: { format_version: 1, description: 'Conventions', last_updated: '2026-05-01' },
        language: { code: 'en', docs: 'ru', commits: 'en' },
        architecture: { pattern: 'Hexagonal Lite' },
        testing: { framework: 'Vitest' },
        error_handling: { strategy: 'Result<T,E>' },
      },
      overrides: new Map(),
    },
    workflow: {
      base: {
        meta: { format_version: 1, description: 'Workflow', last_updated: '2026-05-01' },
        protected_directories: ['knowledge/', 'standards/', 'templates/', 'archive/'],
        session_discipline: { handoff: 'generate handoff.md' },
      },
      overrides: new Map(),
    },
  };

  return {
    projectRoot: '/project',
    config,
    skills: [
      createSkill('specify-feature', 'Specify Feature'),
      createSkill('plan-implementation', 'Plan Implementation'),
    ],
    commands: [
      createCommand('specify', 'specify', 'analyst', 'specify-feature'),
      createCommand('plan', 'plan', 'architect', 'plan-implementation'),
      createCommand('implement', 'implement', 'developer', null),
    ],
    personas: [
      createPersona('analyst', 'Analyst'),
      createPersona('architect', 'Architect'),
      createPersona('developer', 'Developer'),
    ],
    standards: standards as unknown as AdapterContext['standards'],
    force: false,
    dryRun: false,
    ...overrides,
  };
}

describe('CursorAdapter integration', () => {
  it('generates all 4 output types', async () => {
    const fs = new InMemoryFileSystem();
    const adapter = new CursorAdapter({ fs, logger: new NullLogger() });
    const ctx = createContext(fs);

    const report = await adapter.generate(ctx);

    expect(report.errors).toHaveLength(0);
    expect(report.created.length).toBeGreaterThan(0);

    const hasSkills = report.created.some((p) => p.includes('skills-l1dder'));
    const hasCommands = report.created.some((p) => p.includes('.cursor/commands'));
    const hasRule = report.created.some((p) => p.includes('l1dder.mdc'));
    const hasAgents = report.created.some((p) => p.includes('AGENTS.md'));

    expect(hasSkills).toBe(true);
    expect(hasCommands).toBe(true);
    expect(hasRule).toBe(true);
    expect(hasAgents).toBe(true);
  });

  it('idempotent: second run returns all skipped', async () => {
    const fs = new InMemoryFileSystem();
    const adapter = new CursorAdapter({ fs, logger: new NullLogger() });
    const ctx = createContext(fs);

    const first = await adapter.generate(ctx);
    expect(first.created.length).toBeGreaterThan(0);

    const second = await adapter.generate(ctx);
    expect(second.created).toHaveLength(0);
    expect(second.updated).toHaveLength(0);
    expect(second.skipped.length).toBe(first.created.length);
  });

  it('force overwrites all', async () => {
    const fs = new InMemoryFileSystem();
    const adapter = new CursorAdapter({ fs, logger: new NullLogger() });
    const ctx = createContext(fs);

    await adapter.generate(ctx);
    const forced = await adapter.generate({ ...ctx, force: true });

    expect(forced.updated.length).toBeGreaterThan(0);
    expect(forced.created).toHaveLength(0);
  });

  it('dryRun returns report without writing', async () => {
    const fs = new InMemoryFileSystem();
    const adapter = new CursorAdapter({ fs, logger: new NullLogger() });
    const ctx = createContext(fs, { dryRun: true });

    const report = await adapter.generate(ctx);
    expect(report.created.length).toBeGreaterThan(0);

    const exists = await fs.exists('/project/.cursor/commands/l1dder-specify.md');
    expect(exists).toBe(false);
  });

  it('generated command files have composed body', async () => {
    const fs = new InMemoryFileSystem();
    const adapter = new CursorAdapter({ fs, logger: new NullLogger() });
    const ctx = createContext(fs);

    await adapter.generate(ctx);

    const content = await fs.readFile('/project/.cursor/commands/l1dder-specify.md');
    expect(content).toContain('## Persona: Analyst');
    expect(content).toContain('## Skill: specify-feature');
    expect(content).toContain('## Command Instructions');
  });

  it('generated skill files have SKILL.md format', async () => {
    const fs = new InMemoryFileSystem();
    const adapter = new CursorAdapter({ fs, logger: new NullLogger() });
    const ctx = createContext(fs);

    await adapter.generate(ctx);

    const content = await fs.readFile('/project/.cursor/skills-l1dder/specify-feature/SKILL.md');
    expect(content).toContain('<!-- L1DDER:MANAGED hash:');
    expect(content).toContain('# Specify Feature');
    expect(content).toContain('## Summary');
  });

  it('generated rule has correct front-matter', async () => {
    const fs = new InMemoryFileSystem();
    const adapter = new CursorAdapter({ fs, logger: new NullLogger() });
    const ctx = createContext(fs);

    await adapter.generate(ctx);

    const content = await fs.readFile('/project/.cursor/rules/l1dder.mdc');
    expect(content).toMatch(/^---\nalwaysApply: true\n---/);
    expect(content).toContain('<!-- L1DDER:MANAGED hash:');
  });

  it('uses canonical projectName in AGENTS.md instead of directory basename', async () => {
    const fs = new InMemoryFileSystem();
    const adapter = new CursorAdapter({ fs, logger: new NullLogger() });
    const ctx = createContext(fs, {
      projectRoot: '/e2e-h-hard/fix-gate',
      projectName: 'shop-bot',
    });

    await adapter.generate(ctx);

    const content = await fs.readFile('/e2e-h-hard/fix-gate/AGENTS.md');
    expect(content).toContain('# shop-bot');
    expect(content).toContain('| Name | shop-bot |');
    expect(content).not.toContain('# fix-gate');
    expect(content).not.toContain('| Name | fix-gate |');
  });

  it('falls back to directory basename when projectName is absent', async () => {
    const fs = new InMemoryFileSystem();
    const adapter = new CursorAdapter({ fs, logger: new NullLogger() });
    const ctx = createContext(fs, { projectRoot: '/e2e-h-hard/dir-only' });

    await adapter.generate(ctx);

    const content = await fs.readFile('/e2e-h-hard/dir-only/AGENTS.md');
    expect(content).toContain('# dir-only');
    expect(content).toContain('| Name | dir-only |');
  });

  it('generated AGENTS.md has 5 sections', async () => {
    const fs = new InMemoryFileSystem();
    const adapter = new CursorAdapter({ fs, logger: new NullLogger() });
    const ctx = createContext(fs);

    await adapter.generate(ctx);

    const content = await fs.readFile('/project/AGENTS.md');
    expect(content).toContain('## Project Overview');
    expect(content).toContain('## Directory Structure');
    expect(content).toContain('## L1DDER Workflow');
    expect(content).toContain('## Working with This Project');
    expect(content).toContain('## Conventions Quick Reference');
  });

  it('reflects config chat/docs language in rule and AGENTS.md', async () => {
    const fs = new InMemoryFileSystem();
    const adapter = new CursorAdapter({ fs, logger: new NullLogger() });
    const base = createContext(fs);
    const ctx: AdapterContext = {
      ...base,
      config: { ...base.config, language: { docs: 'ru', chat: 'ru' } },
    };

    await adapter.generate(ctx);

    const rule = await fs.readFile('/project/.cursor/rules/l1dder.mdc');
    expect(rule).toContain('- **Documentation:** ru');
    expect(rule).toContain('- **AI chat:** ru');
    expect(rule).toContain('- **Code & comments:** en');

    const agents = await fs.readFile('/project/AGENTS.md');
    expect(agents).toContain('Docs: ru; AI chat: ru');
  });

  it('validate returns passed (stub)', async () => {
    const fs = new InMemoryFileSystem();
    const adapter = new CursorAdapter({ fs, logger: new NullLogger() });
    const ctx = createContext(fs);

    const report = await adapter.validate(ctx);
    expect(report.passed).toBe(true);
  });

  it('counts correct number of generated files', async () => {
    const fs = new InMemoryFileSystem();
    const adapter = new CursorAdapter({ fs, logger: new NullLogger() });
    const ctx = createContext(fs);

    const report = await adapter.generate(ctx);
    // 2 skills + 3 commands + 1 rule + 1 AGENTS.md + 1 hooks.json = 8
    expect(report.created).toHaveLength(8);
  });

  it('generates valid .cursor/hooks.json with correct structure', async () => {
    const fs = new InMemoryFileSystem();
    const adapter = new CursorAdapter({ fs, logger: new NullLogger() });
    const ctx = createContext(fs);

    await adapter.generate(ctx);

    const hooksJson = await fs.readFile('/project/.cursor/hooks.json');
    const parsed = JSON.parse(hooksJson) as { version: number; hooks: Record<string, unknown[]> };

    expect(parsed.version).toBe(1);
    expect(typeof parsed.hooks).toBe('object');
    // standard profile has pre-commit-guard (PreToolUse→beforeShellExecution)
    expect(parsed.hooks['beforeShellExecution']).toBeDefined();
    // standard profile has precompact-handoff-save (PreCompact→preCompact)
    expect(parsed.hooks['preCompact']).toBeDefined();
  });

  it('regeneration skips hooks.json when content unchanged (idempotent)', async () => {
    const fs = new InMemoryFileSystem();
    const adapter = new CursorAdapter({ fs, logger: new NullLogger() });
    const ctx = createContext(fs);

    const first = await adapter.generate(ctx);
    const second = await adapter.generate(ctx);

    const hooksInFirst = first.created.includes('.cursor/hooks.json');
    const hooksInSecond = second.skipped.includes('.cursor/hooks.json');

    expect(hooksInFirst).toBe(true);
    expect(hooksInSecond).toBe(true);
  });
});
