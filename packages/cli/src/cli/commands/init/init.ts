import { join, basename } from 'node:path';

import type { GenerationReport } from '@l1dder/core';
import type { LanguageCode } from '@l1dder/schemas';

import type { CliContext } from '../../context.js';
import { ExitCode } from '../../output/exit-codes.js';
import { copyAssets, PROFILES } from '../../assets.js';
import {
  buildAdapterContext,
  getAdapterRegistry,
  getSupportedAdapters,
  parseAiFlagValues,
  validateAdapterId,
} from '../adapter-context.js';
import { runTargetInstall } from '../install-runner.js';

/** Options for `l1dder init`. */
interface InitOptions {
  existing?: boolean;
  name?: string;
  force?: boolean;
  ai?: readonly string[];
  lang?: string;
  profile?: string;
}

/** Supported documentation/chat languages for `--lang`. */
const SUPPORTED_LANGUAGES: readonly LanguageCode[] = ['en', 'ru'];

/** Supported optional install profiles for `--profile`. */
const SUPPORTED_PROFILES: readonly string[] = Object.keys(PROFILES);

/** Result of init execution. */
interface InitResult {
  exitCode: number;
  data?: unknown;
  humanText?: string;
  error?: { code: string; message: string; hint?: string };
}

const PROJECT_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

/**
 * Execute `l1dder init` command — create L1DDER project structure.
 *
 * Greenfield: new project → discovery stage.
 * Brownfield (--existing): existing code → delivery stage + activation hint.
 */
export async function executeInit(
  ctx: CliContext,
  opts: InitOptions,
): Promise<InitResult> {
  const { fs, clock, logger, prompt, cwd, colors } = ctx;
  const l1dderDir = join(cwd, '.l1dder');
  const adapterIds = parseAiFlagValues(opts.ai);

  for (const adapterId of adapterIds) {
    if (!validateAdapterId(ctx, adapterId)) {
      return {
        exitCode: ExitCode.USAGE_ERROR,
        error: {
          code: 'INVALID_ADAPTER',
          message: `Unknown adapter: "${adapterId}". Supported: ${getSupportedAdapters(ctx).join(', ')}`,
          hint: 'Use --ai cursor or --ai claude',
        },
      };
    }
  }

  if (opts.lang !== undefined && !isSupportedLanguage(opts.lang)) {
    return {
      exitCode: ExitCode.USAGE_ERROR,
      error: {
        code: 'INVALID_LANGUAGE',
        message: `Unknown language: "${opts.lang}". Supported: ${SUPPORTED_LANGUAGES.join(', ')}`,
        hint: 'Use --lang en or --lang ru',
      },
    };
  }

  if (opts.profile !== undefined && !SUPPORTED_PROFILES.includes(opts.profile)) {
    return {
      exitCode: ExitCode.USAGE_ERROR,
      error: {
        code: 'INVALID_PROFILE',
        message: `Unknown profile: "${opts.profile}". Supported: ${SUPPORTED_PROFILES.join(', ')}`,
        hint: 'Use --profile engineering',
      },
    };
  }

  // Check for existing .l1dder/
  const alreadyExists = await fs.exists(join(l1dderDir, 'state.yml'));
  if (alreadyExists && !opts.force) {
    return {
      exitCode: ExitCode.GENERIC_ERROR,
      error: {
        code: 'ALREADY_INITIALIZED',
        message: `Project already initialized at ${cwd}. Use --force to reinitialize (destroys current state).`,
      },
    };
  }

  // Auto-detect non-empty directory
  let brownfield = opts.existing ?? false;
  if (!brownfield && !opts.force) {
    const entries = await safeReadDir(fs, cwd);
    const nonGit = entries.filter((e) => e !== '.git' && e !== '.l1dder');
    if (nonGit.length > 0) {
      const useBrownfield = await prompt.confirm(
        'Project directory is not empty. Use brownfield mode (--existing)?',
      );
      if (useBrownfield) {
        brownfield = true;
      }
    }
  }

  // Resolve project name
  let projectName = opts.name;
  if (!projectName) {
    projectName = basename(cwd);
  }

  if (!PROJECT_NAME_REGEX.test(projectName)) {
    return {
      exitCode: ExitCode.USAGE_ERROR,
      error: {
        code: 'INVALID_PROJECT_NAME',
        message: `Invalid project name: "${projectName}". Must start with letter, alphanumeric + hyphens/underscores.`,
      },
    };
  }

  // Resolve language: --lang flag wins; otherwise prompt (non-interactive → en).
  // The chosen language sets both docs and chat; split them via config.yml edit.
  let language: LanguageCode;
  if (opts.lang !== undefined && isSupportedLanguage(opts.lang)) {
    language = opts.lang;
  } else {
    language = await prompt.select<LanguageCode>('Documentation & chat language', [
      { value: 'en', label: 'English' },
      { value: 'ru', label: 'Русский (Russian)' },
    ]);
  }

  const now = clock.now();
  const stage = brownfield ? 'delivery' : 'discovery';

  // Create directory structure
  const dirs = [
    l1dderDir,
    join(cwd, 'knowledge'),
    join(cwd, 'knowledge', 'as-is'),
    join(cwd, 'knowledge', 'to-be'),
    join(cwd, 'specs'),
    join(cwd, 'standards'),
    join(cwd, 'agents'),
    join(cwd, 'skills', 'built-in'),
    join(cwd, 'skills', 'custom'),
    join(cwd, 'commands', 'built-in'),
    join(cwd, 'commands', 'custom'),
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir);
  }

  // Generate state.yml
  const stageHistory = brownfield
    ? `\n  stage_history:\n    - from: discovery\n      to: delivery\n      timestamp: "${now}"\n      reason: "Brownfield initialization"`
    : '\n  stage_history: []';

  const stateContent = `schema_version: 1
project:
  name: "${projectName}"
  stage: ${stage}${stageHistory}
  created_at: "${now}"
  updated_at: "${now}"
workflow:
  current_phase: idle
  current_status: in_progress
  mode: main
  iteration: 0
  phase_history: []
  gate_history: []
tasks:
  items: []
quick_tasks: []
knowledge_updates: []
`;

  await fs.writeFile(join(l1dderDir, 'state.yml'), stateContent);

  // Generate config.yml
  const configContent = `# L1DDER configuration
# See: standards/.base/conventions.base.yml for default settings
#
# language.docs — language of scaffolded templates/knowledge/standards (en | ru)
# language.chat — language the AI agent uses when talking to you (en | ru)
# To change language after init: edit the values below, then run
#   'l1dder sync'         to regenerate framework-managed files (.cursor/rules, AGENTS.md)
#   'l1dder init --force' to re-scaffold templates/standards in the new language
# Existing user content (knowledge/, specs/) is never auto-translated.

schema_version: 1
role_mode: solo
language:
  docs: ${language}
  chat: ${language}
${adapterIds.length > 0 ? `adapters:\n${adapterIds.map((id) => `  - ${id}`).join('\n')}\n` : ''}
`;

  await fs.writeFile(join(l1dderDir, 'config.yml'), configContent);

  // Copy bundled assets (agents, skills, localized templates + standards/.base).
  // An optional --profile additionally delivers its starter skills.
  let assetsCopied: string[] = [];
  try {
    assetsCopied = await copyAssets(cwd, fs, language, opts.profile);
  } catch (e) {
    logger.warn(`Could not copy bundled assets: ${(e as Error).message}`);
  }

  // Create knowledge placeholders (language-aware)
  const knowledgePlaceholders = buildKnowledgePlaceholders(projectName, language);

  for (const [path, content] of knowledgePlaceholders) {
    const fullPath = join(cwd, path);
    if (!(await fs.exists(fullPath))) {
      await fs.writeFile(fullPath, content);
    }
  }

  // Create user standards placeholders
  const standardsPlaceholders: Array<[string, string]> = [
    ['standards/conventions.md', `# Conventions — ${projectName}\n\nProject-specific coding conventions.\n\n## Overrides\n\n| Key | Value | Reason |\n|-----|-------|--------|\n`],
    ['standards/workflow.md', `# Workflow — ${projectName}\n\nProject-specific workflow conventions.\n\n## Overrides\n\n| Key | Value | Reason |\n|-----|-------|--------|\n`],
  ];

  for (const [path, content] of standardsPlaceholders) {
    const fullPath = join(cwd, path);
    if (!(await fs.exists(fullPath))) {
      await fs.writeFile(fullPath, content);
    }
  }

  let wroteStaticAgents = false;
  if (adapterIds.length === 0) {
    await writeStaticAgentsMd(fs, cwd, projectName);
    wroteStaticAgents = true;
  } else if (!adapterIds.includes('cursor')) {
    await writeStaticAgentsMd(fs, cwd, projectName);
    wroteStaticAgents = true;
  }

  // Append to .gitignore
  const gitignoreContent = `\n# L1DDER\n.l1dder/profile.yml\n.l1dder/install-state.yml\n.l1dder/handoff.md\n.l1dder/handoff-archive/\n.l1dder/context-brief.md\n`;
  const gitignorePath = join(cwd, '.gitignore');
  try {
    const existing = await fs.readFile(gitignorePath);
    if (!existing.includes('.l1dder/profile.yml')) {
      await fs.writeFile(gitignorePath, existing + gitignoreContent);
    }
  } catch {
    await fs.writeFile(gitignorePath, gitignoreContent.trimStart());
  }

  // Run adapter generation (if --ai specified)
  const adapterReports: Array<{ targetId: string; report: GenerationReport }> = [];
  if (adapterIds.length > 0) {
    for (const targetId of adapterIds) {
      try {
        const report = await runAdapterGeneration(
          ctx,
          cwd,
          targetId,
          opts.force ?? false,
          opts.profile,
        );
        adapterReports.push({ targetId, report });
      } catch (e) {
        logger.warn(`Adapter generation failed for ${targetId}: ${(e as Error).message}`);
      }
    }

    if (adapterReports.length === 0) {
      await writeStaticAgentsMd(fs, cwd, projectName);
      wroteStaticAgents = true;
    }
  }

  const aggregateAdapterReport = aggregateGenerationReports(adapterReports);

  // Build file list
  const filesCreated = [
    '.l1dder/state.yml',
    '.l1dder/config.yml',
    ...knowledgePlaceholders.map(([p]) => p),
    ...standardsPlaceholders.map(([p]) => p),
    ...assetsCopied,
    '.gitignore',
    ...(wroteStaticAgents ? ['AGENTS.md'] : []),
    ...(aggregateAdapterReport ? [...aggregateAdapterReport.created, ...aggregateAdapterReport.updated] : []),
  ];

  // Build next steps
  const nextSteps = brownfield
    ? [
        { label: 'Invoke brownfield-scan skill in AI IDE', command: null, blocking: false },
        { label: 'Generate project brief', command: 'l1dder context', blocking: false },
        { label: 'Verify project health', command: 'l1dder doctor', blocking: false },
      ]
    : [
        { label: 'Document the product idea  (knowledge/idea.md)', command: null, blocking: false },
        { label: 'Plan your roadmap: scope MVP + discovery sessions  (skill: plan-roadmap)', command: null, blocking: false },
        { label: 'Work out architecture  (knowledge/to-be/architecture.md)', command: null, blocking: false },
        { label: 'Define data model  (knowledge/to-be/erd.md)', command: null, blocking: false },
        { label: 'Document use cases  (knowledge/to-be/usecases.md)', command: null, blocking: false },
        { label: 'Check readiness', command: 'l1dder stage status', blocking: false },
        { label: 'Verify project health', command: 'l1dder doctor', blocking: false },
      ];

  // Format output
  const modeLabel = brownfield ? 'brownfield' : 'greenfield';
  const g = colors.glyph;
  const lines: string[] = [];

  if (brownfield) {
    lines.push(`${g.info} Brownfield mode (--existing)`);
  }
  lines.push(`${g.pass} Project name: ${projectName}`);
  lines.push(`${g.info} Creating L1DDER scaffolding...`);
  lines.push(`  ${g.pass} .l1dder/state.yml (stage: ${stage})`);
  lines.push(`  ${g.pass} .l1dder/config.yml`);
  lines.push(`  ${g.pass} knowledge/ (placeholders)`);
  lines.push(`  ${g.pass} standards/ (base + user templates)`);
  const agentCount = String(assetsCopied.filter((f) => f.startsWith('agents/')).length);
  const skillCount = String(assetsCopied.filter((f) => f.startsWith('skills/')).length);
  lines.push(`  ${g.pass} agents/ (${agentCount} personas)`);
  lines.push(`  ${g.pass} skills/ (${skillCount} built-in skills)`);
  if (opts.profile !== undefined) {
    lines.push(`  ${g.pass} profile: ${opts.profile} (optional skills delivered)`);
  }
  lines.push(`  ${g.pass} AGENTS.md`);
  lines.push(`  ${g.pass} .gitignore (appended)`);
  lines.push('');
  lines.push(colors.success(`${g.pass} Project '${projectName}' initialized in ${modeLabel} mode (${stage} stage).`));
  lines.push('');

  if (brownfield) {
    lines.push('To populate knowledge/as-is/* from existing code:');
    lines.push(`  1. Open AI IDE in this project`);
    lines.push(`  2. Invoke skill: brownfield-scan (manual trigger)`);
    lines.push(`  3. Review and approve, then commit`);
    lines.push(`  Skill instructions: skills/built-in/brownfield-scan.md`);
  } else {
    lines.push('Next steps:');
    for (const step of nextSteps) {
      const cmd = step.command ? `  (${step.command})` : '';
      lines.push(`  ${g.arrow} ${step.label}${cmd}`);
    }
  }

  lines.push('');
  lines.push(`Stage: ${stage} (${stage === 'discovery' ? 'advisory' : 'standard'} enforcement)`);

  if (adapterReports.length > 0 && aggregateAdapterReport) {
    lines.push('');
    lines.push(
      `${g.info} AI IDE Adapter${adapterReports.length > 1 ? 's' : ''}: ${adapterReports.map((entry) => entry.targetId).join(', ')}`,
    );
    if (aggregateAdapterReport.created.length > 0) {
      lines.push(`  ${g.pass} Created ${String(aggregateAdapterReport.created.length)} files`);
    }
    if (aggregateAdapterReport.updated.length > 0) {
      lines.push(`  ${g.pass} Updated ${String(aggregateAdapterReport.updated.length)} files`);
    }
    if (aggregateAdapterReport.skipped.length > 0) {
      lines.push(`  ${g.info} Skipped ${String(aggregateAdapterReport.skipped.length)} files (unchanged)`);
    }
    if (aggregateAdapterReport.errors.length > 0) {
      lines.push(`  ${g.fail} ${String(aggregateAdapterReport.errors.length)} errors during generation`);
      for (const error of aggregateAdapterReport.errors) {
        lines.push(`    ! ${error.path}: ${error.message}`);
      }
    }
  }

  return {
    exitCode: ExitCode.SUCCESS,
    data: {
      project: { name: projectName, stage },
      mode: modeLabel,
      ...(opts.profile !== undefined ? { profile: opts.profile } : {}),
      files_created: filesCreated,
      next_steps: nextSteps,
      ...(adapterReports.length > 0
        ? {
            adapters: adapterReports.map((entry) => ({
              id: entry.targetId,
              report: entry.report,
            })),
          }
        : {}),
    },
    humanText: lines.join('\n'),
  };
}

/** Type guard: is the raw `--lang` value a supported language code? */
function isSupportedLanguage(value: string): value is LanguageCode {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/**
 * Build the knowledge placeholder file set in the chosen docs language.
 *
 * Keeps `## Summary` structure (parsed by extractSummary) identical across
 * languages; only headings and TODO hints are localized.
 */
function buildKnowledgePlaceholders(
  projectName: string,
  lang: LanguageCode,
): Array<[string, string]> {
  const t =
    lang === 'ru'
      ? {
          ideaTitle: 'Продуктовая идея',
          roadmapTitle: 'Roadmap',
          archAsIs: 'Architecture (As-Is)',
          erdAsIs: 'ERD (As-Is)',
          usecasesAsIs: 'Use Cases (As-Is)',
          integrationsAsIs: 'Integrations (As-Is)',
          archToBe: 'Architecture (To-Be)',
          erdToBe: 'ERD (To-Be)',
          usecasesToBe: 'Use Cases (To-Be)',
          integrationsToBe: 'Integrations (To-Be)',
          idea: 'TODO: Опишите продукт',
          roadmap: 'TODO: Опишите план',
          asIsPlaceholder: 'Placeholder: заполняется после первой delivery-итерации',
          placeholder: 'Placeholder',
          arch: 'TODO: Опишите целевую архитектуру',
          todo: 'TODO',
        }
      : {
          ideaTitle: 'Product Idea',
          roadmapTitle: 'Roadmap',
          archAsIs: 'Architecture (As-Is)',
          erdAsIs: 'ERD (As-Is)',
          usecasesAsIs: 'Use Cases (As-Is)',
          integrationsAsIs: 'Integrations (As-Is)',
          archToBe: 'Architecture (To-Be)',
          erdToBe: 'ERD (To-Be)',
          usecasesToBe: 'Use Cases (To-Be)',
          integrationsToBe: 'Integrations (To-Be)',
          idea: 'TODO: Describe the product',
          roadmap: 'TODO: Describe the plan',
          asIsPlaceholder: 'Placeholder: filled in after the first delivery iteration',
          placeholder: 'Placeholder',
          arch: 'TODO: Describe the target architecture',
          todo: 'TODO',
        };

  const doc = (title: string, hint: string): string =>
    `# ${projectName} — ${title}\n\n## Summary\n\n<!-- ${hint} -->\n`;

  return [
    ['knowledge/idea.md', doc(t.ideaTitle, t.idea)],
    ['knowledge/roadmap.md', `# ${t.roadmapTitle} — ${projectName}\n\n## Summary\n\n<!-- ${t.roadmap} -->\n`],
    ['knowledge/as-is/architecture.md', doc(t.archAsIs, t.asIsPlaceholder)],
    ['knowledge/as-is/erd.md', doc(t.erdAsIs, t.placeholder)],
    ['knowledge/as-is/usecases.md', doc(t.usecasesAsIs, t.placeholder)],
    ['knowledge/as-is/integrations.md', doc(t.integrationsAsIs, t.placeholder)],
    ['knowledge/to-be/architecture.md', doc(t.archToBe, t.arch)],
    ['knowledge/to-be/erd.md', doc(t.erdToBe, t.todo)],
    ['knowledge/to-be/usecases.md', doc(t.usecasesToBe, t.todo)],
    ['knowledge/to-be/integrations.md', doc(t.integrationsToBe, t.todo)],
  ];
}

async function safeReadDir(
  fs: { readDir(path: string): Promise<readonly string[]> },
  path: string,
): Promise<readonly string[]> {
  try {
    return await fs.readDir(path);
  } catch {
    return [];
  }
}

/**
 * Run adapter install pipeline after base init using shared install-state.
 */
async function runAdapterGeneration(
  ctx: CliContext,
  projectRoot: string,
  adapterId: string,
  force: boolean,
  profile?: string,
): Promise<GenerationReport> {
  const registry = getAdapterRegistry(ctx);
  const adapter = registry.resolve(adapterId);
  if (!adapter) {
    throw new Error(`Adapter not registered: ${adapterId}`);
  }

  const adapterCtx = await buildAdapterContext(ctx, projectRoot, {
    force,
    dryRun: false,
  });

  const result = await runTargetInstall(
    { fs: ctx.fs, logger: ctx.logger, clock: ctx.clock },
    {
      projectRoot,
      targetId: adapterId,
      adapter,
      adapterCtx,
      force,
      dryRun: false,
      prune: false,
      profile: profile ?? null,
    },
  );

  return {
    created: [...result.created],
    updated: [...result.updated],
    skipped: [...result.skipped],
    errors: [...result.errors],
  };
}

function aggregateGenerationReports(
  reports: readonly { targetId: string; report: GenerationReport }[],
): GenerationReport | undefined {
  if (reports.length === 0) {
    return undefined;
  }

  const created: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];
  const errors: GenerationReport['errors'][number][] = [];

  for (const entry of reports) {
    created.push(...entry.report.created);
    updated.push(...entry.report.updated);
    skipped.push(...entry.report.skipped);
    errors.push(...entry.report.errors);
  }

  return { created, updated, skipped, errors };
}

async function writeStaticAgentsMd(
  fs: CliContext['fs'],
  projectRoot: string,
  projectName: string,
): Promise<void> {
  const agentsMd = `<!-- L1DDER:MANAGED -->
# ${projectName} — AI Agent Guide

## Project Structure

- \`.l1dder/\` — project state (state.yml, config.yml)
- \`knowledge/\` — project knowledge (as-is/, to-be/)
- \`specs/\` — per-feature specifications
- \`standards/\` — coding conventions and workflow rules
- \`agents/\` — AI persona definitions
- \`skills/\` — built-in and custom skills

## How to Work with L1DDER

1. Check project status: \`l1dder status\`
2. Follow the Phase Machine workflow: SPECIFY → PLAN → TASKS → IMPLEMENT → COMPLETE
3. Use \`l1dder quick "description"\` for ad-hoc tasks
4. Run \`l1dder doctor\` to verify project health

## Standards

See \`standards/conventions.md\` for coding conventions.
See \`standards/workflow.md\` for workflow rules.
`;

  await fs.writeFile(join(projectRoot, 'AGENTS.md'), agentsMd);
}
