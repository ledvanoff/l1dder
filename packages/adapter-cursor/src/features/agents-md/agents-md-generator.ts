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
 * Produces a compact agent entrypoint: overview, directories, position model,
 * workflow rails, primary next-action guidance, reference commands/skills,
 * recovery pointers, and conventions.
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
  sections.push(buildPositionModel());
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

/**
 * Canonical progressive-position model — single source of orientation for agents.
 */
function buildPositionModel(): string {
  return [
    '## Position Model',
    '',
    'L1DDER narrows work through this progressive position chain:',
    '**Stage → Milestone → Profile → Session → Phase → Gate → Primary Action**',
    '',
    'Do not invent the next step from the full command list. Resolve the current',
    'Primary Action first (see Primary Entrypoint below).',
  ].join('\n');
}

function buildWorkflow(data: AgentsMdData): string {
  const lines: string[] = [
    '## L1DDER Workflow',
    '',
    '### Workflow Profiles',
    '',
    '| Profile | Use when |',
    '|---------|----------|',
    '| `product_discovery` | IDEA→READY product shaping (To-Be only) |',
    '| `feature_discovery` | Spec/plan a feature before delivery code |',
    '| `delivery` | Implement an eligible roadmap session |',
    '| `hygiene` | Full as-is/to-be sync, drift, and debt audit |',
    '',
    '### Roadmap Rails',
    '',
    '- A **delivery** Agent Session starts from the next eligible roadmap session.',
    '- Off-road work goes through **feature_discovery**, or an audited Quick/Fast bypass.',
    '',
    '### Registry-First',
    '',
    'Before creating a model, enum, class/interface/type/schema, service, port, or',
    'adapter: look up `knowledge/project-registry.yml` and public exports. Reuse an',
    'existing entity, or record why a new one is required.',
    '',
    '### Primary Entrypoint',
    '',
    '**What do I do now?** Run one command:',
    '',
    '- CLI: `l1dder now` or `l1dder helpme`',
    '- IDE slash: `/l1dder-next`',
    '',
    'That projection-backed next-action is the only default starting point.',
    'The tables below are a **reference / advanced** surface — not an equal menu of next steps.',
    '',
  ];

  if (data.commands.length > 0) {
    lines.push('### Commands (reference / advanced)');
    lines.push('');
    lines.push('| Command | Description | Phases |');
    lines.push('|---------|-------------|--------|');
    for (const cmd of data.commands) {
      lines.push(`| \`/l1dder-${cmd.id}\` | ${cmd.description} | ${cmd.phases} |`);
    }
    lines.push('');
  }

  if (data.skills.length > 0) {
    lines.push('### Skills (reference)');
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
    '### Recovery / Entrypoints',
    '',
    '| Situation | Command |',
    '|-----------|---------|',
    '| Lost / unclear next step | `l1dder now` / `l1dder helpme` (IDE: `/l1dder-next`) |',
    '| Health check / broken-looking state | `l1dder doctor` |',
    '| Position snapshot | `l1dder status` |',
    '| Regenerate IDE files | `l1dder sync` |',
    '',
    'Before making changes:',
    '',
    '1. Ask for the Primary Action (`l1dder now` / `/l1dder-next`)',
    '2. Follow the active workflow profile and phase guidance',
    '3. Prefer registry-first lookup over inventing new types',
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
