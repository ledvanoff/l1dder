import { describe, it, expect } from 'vitest';
import { generateAgentsMd, type AgentsMdData } from './agents-md-generator.js';
import { cursorManifest } from '../../cursor-manifest.js';

function createData(overrides?: Partial<AgentsMdData>): AgentsMdData {
  return {
    projectName: 'test-project',
    projectSummary: 'A test project for unit testing',
    version: '0.1.0',
    roleMode: 'solo',
    enforcement: 'machine',
    projectStage: 'delivery',
    currentPhase: 'IDLE',
    phaseStatus: 'completed',
    directoryTree: [
      '.l1dder/',
      'knowledge/',
      'standards/',
      'packages/',
    ].join('\n'),
    commands: [
      { id: 'specify', description: 'Start SPECIFY phase', phases: 'idle → specify' },
      { id: 'plan', description: 'Start PLAN phase', phases: 'specify → plan' },
      { id: 'implement', description: 'Start IMPLEMENT phase', phases: 'tasks → implement' },
    ],
    skills: [
      { id: 'specify-feature', summary: 'Guide through feature specification', trigger: 'auto' },
      { id: 'plan-implementation', summary: 'Guide through implementation planning', trigger: 'auto' },
    ],
    standards: [
      { file: 'standards/conventions.md', description: 'Development conventions' },
      { file: 'standards/git.md', description: 'Git workflow rules' },
    ],
    knowledgeFiles: [
      { file: 'knowledge/roadmap.md', owners: ['po', 'architect'] },
      { file: 'knowledge/to-be/architecture.md', owners: ['architect'] },
    ],
    conventions: {
      language: 'Code in English, docs in Russian',
      commits: 'Conventional Commits in English',
      branches: 'feature/, fix/, docs/, chore/',
      testing: 'Vitest, test behavior not implementation',
    },
    ...overrides,
  };
}

describe('generateAgentsMd', () => {
  it('generates AGENTS.md with core sections including position model', () => {
    const result = generateAgentsMd(createData(), cursorManifest);
    expect(result.content).toContain('## Project Overview');
    expect(result.content).toContain('## Directory Structure');
    expect(result.content).toContain('## Position Model');
    expect(result.content).toContain('## L1DDER Workflow');
    expect(result.content).toContain('## Working with This Project');
    expect(result.content).toContain('## Conventions Quick Reference');
  });

  it('documents the progressive position model chain', () => {
    const result = generateAgentsMd(createData(), cursorManifest);
    expect(result.content).toContain(
      'Stage → Milestone → Profile → Session → Phase → Gate → Primary Action',
    );
  });

  it('lists workflow profiles and roadmap rails', () => {
    const result = generateAgentsMd(createData(), cursorManifest);
    expect(result.content).toContain('product_discovery');
    expect(result.content).toContain('feature_discovery');
    expect(result.content).toContain('delivery');
    expect(result.content).toContain('hygiene');
    expect(result.content).toContain('next eligible roadmap session');
    expect(result.content).toContain('Quick/Fast');
  });

  it('requires registry-first lookup before inventing entities', () => {
    const result = generateAgentsMd(createData(), cursorManifest);
    expect(result.content).toContain('Registry-First');
    expect(result.content).toContain('knowledge/project-registry.yml');
  });

  it('points to a single primary entrypoint and marks commands as reference', () => {
    const result = generateAgentsMd(createData(), cursorManifest);
    expect(result.content).toContain('### Primary Entrypoint');
    expect(result.content).toContain('l1dder now');
    expect(result.content).toContain('l1dder helpme');
    expect(result.content).toContain('/l1dder-next');
    expect(result.content).toContain('Commands (reference / advanced)');
    expect(result.content).toContain('not an equal menu of next steps');
  });

  it('includes recovery entrypoints when lost or state looks broken', () => {
    const result = generateAgentsMd(createData(), cursorManifest);
    expect(result.content).toContain('Recovery / Entrypoints');
    expect(result.content).toContain('l1dder doctor');
    expect(result.content).toContain('l1dder status');
  });

  it('includes commands table from loaded command data', () => {
    const result = generateAgentsMd(createData(), cursorManifest);
    expect(result.content).toContain('`/l1dder-specify`');
    expect(result.content).toContain('`/l1dder-plan`');
    expect(result.content).toContain('`/l1dder-implement`');
  });

  it('includes skills table', () => {
    const result = generateAgentsMd(createData(), cursorManifest);
    expect(result.content).toContain('specify-feature');
    expect(result.content).toContain('plan-implementation');
  });

  it('includes marker at top', () => {
    const result = generateAgentsMd(createData(), cursorManifest);
    expect(result.content).toMatch(/^<!-- L1DDER:MANAGED hash:[0-9a-f]{12} -->/);
  });

  it('output path is AGENTS.md', () => {
    const result = generateAgentsMd(createData(), cursorManifest);
    expect(result.relativePath).toBe('AGENTS.md');
  });

  it('is deterministic', () => {
    const data = createData();
    const r1 = generateAgentsMd(data, cursorManifest);
    const r2 = generateAgentsMd(data, cursorManifest);
    expect(r1.content).toBe(r2.content);
    expect(r1.hash).toBe(r2.hash);
  });

  it('stays compact enough for an agent entrypoint', () => {
    const result = generateAgentsMd(createData(), cursorManifest);
    expect(result.content.split('\n').length).toBeLessThan(200);
  });

  it('includes project name in overview', () => {
    const result = generateAgentsMd(createData(), cursorManifest);
    expect(result.content).toContain('test-project');
  });

  it('includes standards listing', () => {
    const result = generateAgentsMd(createData(), cursorManifest);
    expect(result.content).toContain('standards/conventions.md');
    expect(result.content).toContain('standards/git.md');
  });

  it('includes knowledge files with owners', () => {
    const result = generateAgentsMd(createData(), cursorManifest);
    expect(result.content).toContain('knowledge/roadmap.md');
    expect(result.content).toContain('po, architect');
  });

  it('includes conventions quick reference', () => {
    const result = generateAgentsMd(createData(), cursorManifest);
    expect(result.content).toContain('Conventional Commits');
    expect(result.content).toContain('Vitest');
  });
});
