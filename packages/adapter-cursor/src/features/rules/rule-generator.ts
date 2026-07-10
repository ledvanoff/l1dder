import type { AdapterManifest } from '@l1dder/core';
import type { Config } from '@l1dder/schemas';
import type { ConventionsBase, WorkflowBase } from '@l1dder/knowledge';
import { computeContentHash } from '../../domain/content-hasher.js';
import { generateMarker, generateSourceComment } from '../../domain/marker.js';

/** Input data for the Cursor rule file generator (AD6). */
export interface RuleGeneratorInput {
  readonly projectName: string;
  readonly projectStage: string;
  readonly config: {
    readonly language: Config['language'];
    readonly protected_directories?: readonly string[];
  };
  readonly conventions: ConventionsBase;
  readonly workflow: WorkflowBase;
  readonly knowledgeFiles: readonly string[];
  readonly manifest: AdapterManifest;
}

/** Result of rule generation. */
export interface RuleGenerateResult {
  readonly relativePath: string;
  readonly content: string;
  readonly hash: string;
}

/**
 * Generate `.cursor/rules/l1dder.mdc` from project config, conventions, and workflow (AD6).
 *
 * Assembles sections: project metadata, language policy, context loading,
 * protected directories, project structure, development rules, git workflow,
 * and session rules.
 */
export function generateRule(input: RuleGeneratorInput): RuleGenerateResult {
  const { manifest } = input;
  const dir = manifest.outputs.rules?.directory ?? '.cursor/rules';
  const file = manifest.outputs.rules?.file ?? 'l1dder.mdc';
  const relativePath = `${dir}/${file}`;

  const body = assembleBody(input);
  const hash = computeContentHash(body);

  const marker = generateMarker(hash);
  const source = generateSourceComment(['config.yml', 'standards/.base/']);
  const frontMatter = '---\nalwaysApply: true\n---';

  const content = `${frontMatter}\n${marker}\n${source}\n\n${body}`;

  return { relativePath, content, hash };
}

function assembleBody(input: RuleGeneratorInput): string {
  const sections: string[] = [];

  sections.push(buildProjectSection(input));
  sections.push(buildLanguageSection(input));
  sections.push(buildContextLoadingSection(input));
  sections.push(buildProtectedDirsSection(input));
  sections.push(buildDevelopmentRulesSection(input));
  sections.push(buildGitWorkflowSection(input));
  sections.push(buildSessionRulesSection(input));

  return sections.join('\n\n') + '\n';
}

function buildProjectSection(input: RuleGeneratorInput): string {
  return [
    `# L1DDER Rules — ${input.projectName}`,
    '',
    `> Project: **${input.projectName}** | Stage: **${input.projectStage}** | Framework: L1DDER`,
  ].join('\n');
}

function buildLanguageSection(input: RuleGeneratorInput): string {
  const { docs, chat } = input.config.language;

  // Code and commits stay English by L1DDER convention (DEC-IL-4);
  // only docs and AI chat language follow config.
  return [
    '## Language',
    '',
    '- **Code & comments:** en',
    `- **Documentation:** ${docs}`,
    '- **Commits & branches:** en',
    `- **AI chat:** ${chat}`,
  ].join('\n');
}

function buildContextLoadingSection(input: RuleGeneratorInput): string {
  const lines: string[] = [
    '## Context Loading',
    '',
    'At session start, read the following files in order:',
    '',
  ];

  if (input.knowledgeFiles.length > 0) {
    for (const file of input.knowledgeFiles) {
      lines.push(`1. \`${file}\``);
    }
  } else {
    lines.push('1. `knowledge/roadmap.md`');
  }

  return lines.join('\n');
}

function buildProtectedDirsSection(input: RuleGeneratorInput): string {
  const defaults = [
    'knowledge/',
    'standards/',
    'templates/',
    'archive/',
  ];

  const configDirs = input.config.protected_directories;

  const wf = input.workflow as Record<string, unknown>;
  const protectedFromWf = wf['protected_directories'];
  const wfDirs = Array.isArray(protectedFromWf)
    ? protectedFromWf as string[]
    : Array.isArray((protectedFromWf as Record<string, unknown> | undefined)?.['require_approval'])
      ? (protectedFromWf as Record<string, string[]>)['require_approval']
      : undefined;

  const finalDirs = configDirs ?? wfDirs ?? defaults;

  const lines: string[] = [
    '## Protected Directories',
    '',
    'Ask for explicit confirmation before modifying files in:',
    '',
  ];

  for (const dir of finalDirs) {
    lines.push(`- \`${dir}\``);
  }

  return lines.join('\n');
}

function buildDevelopmentRulesSection(input: RuleGeneratorInput): string {
  const conv = input.conventions as Record<string, unknown>;
  const testing = conv['testing'] as Record<string, string> | undefined;
  const errorHandling = conv['error_handling'] as Record<string, string> | undefined;
  const architecture = conv['architecture'] as Record<string, string> | undefined;

  const lines: string[] = ['## Development Rules', ''];

  if (architecture) {
    const pattern = architecture['pattern'] ?? 'Hexagonal Lite (Ports & Adapters)';
    lines.push(`- **Architecture pattern:** ${pattern}`);
  }

  lines.push('- **Strict typing:** no `any`, explicit types for public API');
  lines.push('- **JSDoc:** required for every exported function and class');

  if (errorHandling) {
    const strategy = errorHandling['strategy'] ?? 'Result<T,E>';
    lines.push(`- **Error handling:** ${strategy} in domain logic, exceptions only at infrastructure boundary`);
  }

  if (testing) {
    const framework = testing['framework'] ?? 'Vitest';
    lines.push(`- **Testing:** ${framework}, test behavior not implementation`);
  }

  lines.push('- **KISS, DRY, YAGNI:** no over-engineering');

  return lines.join('\n');
}

function buildGitWorkflowSection(input: RuleGeneratorInput): string {
  const wf = input.workflow as Record<string, unknown>;
  const session = wf['session_discipline'] as Record<string, string> | undefined;
  const git = wf['git'] as Record<string, string> | undefined;

  const lines: string[] = ['## Git Workflow', ''];

  lines.push('- **Main branch:** `main` (protected, no direct commits)');
  lines.push('- **Branch naming:** `feature/`, `fix/`, `docs/`, `chore/` + short English description');
  lines.push('- **Commits:** Conventional Commits in English');

  if (git) {
    const prProcess = git['pr_process'];
    if (prProcess) {
      lines.push(`- **PR process:** ${prProcess}`);
    }
  }

  if (session) {
    const handoff = session['handoff'];
    if (handoff) {
      lines.push(`- **Session handoff:** ${handoff}`);
    }
  }

  return lines.join('\n');
}

function buildSessionRulesSection(input: RuleGeneratorInput): string {
  const lines: string[] = [
    '## Session Rules',
    '',
    '- Check current branch at session start; create new branch from `main` if needed',
    '- Run `pnpm lint && pnpm typecheck && pnpm test` before committing',
    '- Propose doctor-checklist before final commit',
    '- When context window ~70% full, propose handoff to new session',
  ];

  const session = input.workflow.session_discipline;

  if (session?.discovery_use_plan_mode === true) {
    lines.push(
      '- **Discovery sessions:** switch to plan-mode before EXPLORE — present options, do not write final files until scope is confirmed',
    );
  }

  if (session?.mark_recommended_option === true) {
    lines.push(
      '- **Discovery options:** when presenting 2+ approaches, explicitly mark the recommended option',
    );
  }

  return lines.join('\n');
}
