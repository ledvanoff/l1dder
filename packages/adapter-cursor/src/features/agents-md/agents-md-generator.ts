import type { AdapterManifest } from '@l1dder/core';
import { computeContentHash } from '../../domain/content-hasher.js';
import { generateMarker } from '../../domain/marker.js';

/** Data contract for AGENTS.md generation (TC8-TC11). */
export interface AgentsMdData {
  readonly projectName: string;
  readonly projectSummary: string;
  readonly version: string;
  readonly roleMode: 'solo' | 'team';
  readonly enforcement: string;
  readonly projectStage: string;
  readonly currentPhase: string;
  readonly phaseStatus: string;
  readonly directoryTree: string;
  readonly commands: readonly { id: string; description: string; phases: string }[];
  readonly skills: readonly { id: string; summary: string; trigger: string }[];
  readonly standards: readonly { file: string; description: string }[];
  readonly knowledgeFiles: readonly { file: string; owners: string[] }[];
  readonly conventions: {
    readonly language: string;
    readonly commits: string;
    readonly branches: string;
    readonly testing: string;
  };
}

/** Result of AGENTS.md generation. */
export interface AgentsMdResult {
  readonly relativePath: string;
  readonly content: string;
  readonly hash: string;
}

/**
 * Generate `AGENTS.md` from project data (TC8-TC11).
 *
 * Produces 5 sections: Project Overview, Directory Structure,
 * L1DDER Workflow, Working with This Project, Conventions Quick Reference.
 */
export function generateAgentsMd(
  data: AgentsMdData,
  manifest: AdapterManifest,
): AgentsMdResult {
  const dir = manifest.outputs.agents_md?.directory ?? '.';
  const file = manifest.outputs.agents_md?.file ?? 'AGENTS.md';
  const relativePath = dir === '.' ? file : `${dir}/${file}`;

  const body = assembleBody(data);
  const hash = computeContentHash(body);
  const marker = generateMarker(hash);

  const content = `${marker}\n\n${body}`;

  return { relativePath, content, hash };
}

function assembleBody(data: AgentsMdData): string {
  const sections: string[] = [];

  sections.push(buildProjectOverview(data));
  sections.push(buildDirectoryStructure(data));
  sections.push(buildWorkflow(data));
  sections.push(buildWorkingWithProject(data));
  sections.push(buildConventions(data));

  return sections.join('\n\n') + '\n';
}

function buildProjectOverview(data: AgentsMdData): string {
  return [
    `# ${data.projectName}`,
    '',
    '## Project Overview',
    '',
    `| Field | Value |`,
    `|-------|-------|`,
    `| Name | ${data.projectName} |`,
    `| Summary | ${data.projectSummary} |`,
    `| Framework | L1DDER v${data.version} |`,
    `| Mode | ${data.roleMode} |`,
    `| Stage | ${data.projectStage} |`,
    `| Current Phase | ${data.currentPhase} |`,
    `| Phase Status | ${data.phaseStatus} |`,
    `| Enforcement | ${data.enforcement} |`,
  ].join('\n');
}

function buildDirectoryStructure(data: AgentsMdData): string {
  return [
    '## Directory Structure',
    '',
    '```',
    data.directoryTree,
    '```',
  ].join('\n');
}

function buildWorkflow(data: AgentsMdData): string {
  const lines: string[] = [
    '## L1DDER Workflow',
    '',
    'This project uses L1DDER phase-driven workflow. Each iteration follows:',
    'SPECIFY → PLAN → TO_BE_KU → TASKS → IMPLEMENT → AS_IS_KU → COMPLETE → IDLE',
    '',
  ];

  if (data.commands.length > 0) {
    lines.push('### Commands');
    lines.push('');
    lines.push('| Command | Description | Phases |');
    lines.push('|---------|-------------|--------|');
    for (const cmd of data.commands) {
      lines.push(`| \`/l1dder-${cmd.id}\` | ${cmd.description} | ${cmd.phases} |`);
    }
    lines.push('');
  }

  if (data.skills.length > 0) {
    lines.push('### Skills');
    lines.push('');
    lines.push('| Skill | Summary | Trigger |');
    lines.push('|-------|---------|---------|');
    for (const skill of data.skills) {
      lines.push(`| ${skill.id} | ${skill.summary} | ${skill.trigger} |`);
    }
  }

  return lines.join('\n');
}

function buildWorkingWithProject(data: AgentsMdData): string {
  const lines: string[] = [
    '## Working with This Project',
    '',
    'Before making changes:',
    '',
    '1. Check current project phase with `l1dder status`',
    '2. Use the appropriate `/l1dder-*` command for the current phase',
    '3. Follow phase-specific skill guidance',
    '',
  ];

  if (data.standards.length > 0) {
    lines.push('### Standards');
    lines.push('');
    for (const std of data.standards) {
      lines.push(`- \`${std.file}\` — ${std.description}`);
    }
    lines.push('');
  }

  if (data.knowledgeFiles.length > 0) {
    lines.push('### Knowledge Files');
    lines.push('');
    lines.push('| File | Owners |');
    lines.push('|------|--------|');
    for (const kf of data.knowledgeFiles) {
      const owners = kf.owners.length > 0 ? kf.owners.join(', ') : 'all';
      lines.push(`| \`${kf.file}\` | ${owners} |`);
    }
  }

  return lines.join('\n');
}

function buildConventions(data: AgentsMdData): string {
  return [
    '## Conventions Quick Reference',
    '',
    `| Area | Convention |`,
    `|------|-----------|`,
    `| Language | ${data.conventions.language} |`,
    `| Commits | ${data.conventions.commits} |`,
    `| Branches | ${data.conventions.branches} |`,
    `| Testing | ${data.conventions.testing} |`,
  ].join('\n');
}
