import { describe, it, expect } from 'vitest';
import { generateRule, type RuleGeneratorInput } from './rule-generator.js';
import { cursorManifest } from '../../cursor-manifest.js';

function createInput(overrides?: Partial<RuleGeneratorInput>): RuleGeneratorInput {
  return {
    projectName: 'my-project',
    projectStage: 'delivery',
    config: {
      language: { docs: 'ru', chat: 'ru' },
      protected_directories: ['knowledge/', 'standards/', 'templates/', 'archive/'],
    },
    conventions: {
      meta: { format_version: 1, description: 'Conventions', last_updated: '2026-05-01' },
      language: { code: 'en', docs: 'ru', commits: 'en' },
      architecture: { pattern: 'Hexagonal Lite' },
      testing: { framework: 'Vitest' },
      error_handling: { strategy: 'Result<T,E>' },
    },
    workflow: {
      meta: { format_version: 1, description: 'Workflow', last_updated: '2026-05-01' },
      protected_directories: ['knowledge/', 'standards/', 'templates/', 'archive/'],
      session_discipline: {
        handoff: 'generate handoff.md before closing session',
        discovery_use_plan_mode: true,
        mark_recommended_option: true,
      },
    },
    knowledgeFiles: ['knowledge/roadmap.md'],
    manifest: cursorManifest,
    ...overrides,
  };
}

describe('generateRule', () => {
  it('generates rule with correct front-matter', () => {
    const result = generateRule(createInput());
    expect(result.content).toMatch(/^---\nalwaysApply: true\n---/);
  });

  it('outputs to correct relative path', () => {
    const result = generateRule(createInput());
    expect(result.relativePath).toBe('.cursor/rules/l1dder.mdc');
  });

  it('includes project name and stage', () => {
    const result = generateRule(createInput());
    expect(result.content).toContain('my-project');
    expect(result.content).toContain('delivery');
  });

  it('includes language policy from conventions', () => {
    const result = generateRule(createInput());
    expect(result.content).toContain('Code & comments');
    expect(result.content).toContain('Documentation');
  });

  it('reflects docs and AI chat language from config', () => {
    const result = generateRule(createInput());
    expect(result.content).toContain('- **Documentation:** ru');
    expect(result.content).toContain('- **AI chat:** ru');
  });

  it('keeps code and commits English regardless of config language', () => {
    const result = generateRule(
      createInput({ config: { language: { docs: 'ru', chat: 'ru' } } }),
    );
    expect(result.content).toContain('- **Code & comments:** en');
    expect(result.content).toContain('- **Commits & branches:** en');
  });

  it('includes protected directories', () => {
    const result = generateRule(createInput());
    expect(result.content).toContain('knowledge/');
    expect(result.content).toContain('standards/');
    expect(result.content).toContain('templates/');
    expect(result.content).toContain('archive/');
  });

  it('includes L1DDER:MANAGED marker', () => {
    const result = generateRule(createInput());
    expect(result.content).toContain('<!-- L1DDER:MANAGED hash:');
  });

  it('is deterministic', () => {
    const input = createInput();
    const r1 = generateRule(input);
    const r2 = generateRule(input);
    expect(r1.content).toBe(r2.content);
    expect(r1.hash).toBe(r2.hash);
  });

  it('includes development rules section', () => {
    const result = generateRule(createInput());
    expect(result.content).toContain('## Development Rules');
    expect(result.content).toContain('Hexagonal Lite');
    expect(result.content).toContain('Result<T,E>');
    expect(result.content).toContain('Vitest');
  });

  it('includes git workflow section', () => {
    const result = generateRule(createInput());
    expect(result.content).toContain('## Git Workflow');
    expect(result.content).toContain('Conventional Commits');
  });

  it('includes session rules section', () => {
    const result = generateRule(createInput());
    expect(result.content).toContain('## Session Rules');
    expect(result.content).toContain('context window ~70%');
  });

  it('includes plan-mode rules when session_discipline flags are true', () => {
    const result = generateRule(createInput());
    expect(result.content).toContain('plan-mode');
    expect(result.content).toContain('mark the recommended option');
  });

  it('omits plan-mode rules when session_discipline flags are false', () => {
    const result = generateRule(
      createInput({
        workflow: {
          meta: { format_version: 1, description: 'Workflow', last_updated: '2026-05-01' },
          session_discipline: {
            discovery_use_plan_mode: false,
            mark_recommended_option: false,
          },
        },
      }),
    );
    expect(result.content).not.toContain('Discovery sessions:** switch to plan-mode');
    expect(result.content).not.toContain('Discovery options:**');
  });

  it('uses default knowledge files when empty', () => {
    const result = generateRule(createInput({ knowledgeFiles: [] }));
    expect(result.content).toContain('knowledge/roadmap.md');
  });
});
