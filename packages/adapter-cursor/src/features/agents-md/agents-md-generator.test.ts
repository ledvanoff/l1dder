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
  it('generates AGENTS.md with all 5 sections', () => {
    const result = generateAgentsMd(createData(), cursorManifest);
    expect(result.content).toContain('## Project Overview');
    expect(result.content).toContain('## Directory Structure');
    expect(result.content).toContain('## L1DDER Workflow');
    expect(result.content).toContain('## Working with This Project');
    expect(result.content).toContain('## Conventions Quick Reference');
  });

  it('includes commands table', () => {
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
