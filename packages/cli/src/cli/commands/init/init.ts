import { join, basename } from 'node:path';

import type { GenerationReport } from '@l1dder/core';
import type { LanguageCode } from '@l1dder/schemas';
import { AtomicWriter, StateWriter, createInitialState } from '@l1dder/state';

import type { CliContext } from '../../context.js';
import { ExitCode } from '../../output/exit-codes.js';
import { copyAssets, PROFILES, resolveAssetPath } from '../../assets.js';
import {
  buildAdapterContext,
  getAdapterRegistry,
  getSupportedAdapters,
  parseAiFlagValues,
  validateAdapterId,
} from '../adapter-context.js';
import { runTargetInstall } from '../install-runner.js';
import { renderKnowledgeTemplate } from './render-template.js';

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

/** Default docs/chat language when prompting is disabled and `--lang` is absent. */
const DEFAULT_LANGUAGE: LanguageCode = 'en';

/** Default AI IDE adapter when prompting is disabled and `--ai` is absent. */
const DEFAULT_ADAPTER_ID = 'cursor';

/** Prompt value meaning "do not install any AI IDE adapter". */
const SKIP_ADAPTER_VALUE = 'none';

/** Supported optional install profiles for `--profile`. */
const SUPPORTED_PROFILES: readonly string[] = Object.keys(PROFILES);

/** Result of init execution. */
interface InitResult {
  exitCode: number;
  data?: unknown;
  humanText?: string;
  error?: { code: string; message: string; hint?: string };
}

/** How language / AI IDE were resolved during init. */
interface ResolvedInitChoices {
  readonly lang: LanguageCode;
  readonly ai: readonly string[];
  readonly defaultsApplied: {
    readonly lang: boolean;
    readonly ai: boolean;
  };
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
  const explicitAdapterIds = parseAiFlagValues(opts.ai);
  const interactive = !ctx.globals.noPrompt;

  // `--ai none` is the non-interactive spelling of the "None / skip" prompt
  // choice, so both paths can express "no AI IDE adapter".
  const skipAdapters = explicitAdapterIds.includes(SKIP_ADAPTER_VALUE);
  if (skipAdapters && explicitAdapterIds.length > 1) {
    return {
      exitCode: ExitCode.USAGE_ERROR,
      error: {
        code: 'INVALID_ADAPTER',
        message: `--ai ${SKIP_ADAPTER_VALUE} cannot be combined with other adapters`,
        hint: `Use --ai ${SKIP_ADAPTER_VALUE} alone to skip AI IDE integration`,
      },
    };
  }

  for (const adapterId of explicitAdapterIds) {
    if (adapterId === SKIP_ADAPTER_VALUE) continue;
    if (!validateAdapterId(ctx, adapterId)) {
      return {
        exitCode: ExitCode.USAGE_ERROR,
        error: {
          code: 'INVALID_ADAPTER',
          message: `Unknown adapter: "${adapterId}". Supported: ${getSupportedAdapters(ctx).join(', ')}, ${SKIP_ADAPTER_VALUE}`,
          hint: `Use --ai cursor, --ai claude, or --ai ${SKIP_ADAPTER_VALUE} to skip`,
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

  const resolved = await resolveInitChoices(ctx, opts, explicitAdapterIds, interactive);
  const language = resolved.lang;
  const adapterIds = [...resolved.ai];

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

  // Generate state.yml via the single canonical path (StateSchema + discovery slice).
  const state = createInitialState({
    projectName,
    brownfield,
    now,
  });
  const stateWriter = new StateWriter({
    atomicWriter: new AtomicWriter({ fs, logger }),
    logger,
  });
  const stateWrite = await stateWriter.writeState(
    join(l1dderDir, 'state.yml'),
    state,
  );
  if (!stateWrite.ok) {
    return {
      exitCode: ExitCode.GENERIC_ERROR,
      error: {
        code: 'STATE_WRITE_FAILED',
        message: `Failed to write .l1dder/state.yml: ${stateWrite.error.message}`,
      },
    };
  }

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

  // Create knowledge placeholders (language-aware), excluding roadmap
  // which is rendered from the localized bundled template.
  const knowledgePlaceholders = buildKnowledgePlaceholders(projectName, language);

  for (const [path, content] of knowledgePlaceholders) {
    const fullPath = join(cwd, path);
    if (!(await fs.exists(fullPath))) {
      await fs.writeFile(fullPath, content);
    }
  }

  const roadmapRel = 'knowledge/roadmap.md';
  const roadmapFull = join(cwd, roadmapRel);
  if (!(await fs.exists(roadmapFull))) {
    const roadmapAsset = resolveAssetPath(
      join('i18n', language, 'templates', 'knowledge', 'roadmap-template.md'),
    );
    const rendered = await renderKnowledgeTemplate(fs, roadmapAsset, {
      PROJECT_NAME: projectName,
      DATE: now.slice(0, 10),
      AUTHOR: 'TODO',
    });
    if (rendered !== null) {
      await fs.writeFile(roadmapFull, rendered);
    } else {
      logger.warn(
        `Could not read roadmap template at ${roadmapAsset}; writing minimal placeholder`,
      );
      await fs.writeFile(
        roadmapFull,
        roadmapFallback(projectName, language),
      );
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

  // Sync selected AI IDE adapter(s) during init (same pipeline as `l1dder sync`).
  const adapterReports: Array<{ targetId: string; report: GenerationReport }> = [];
  const adapterInstallFailures: string[] = [];
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
        const message = e instanceof Error ? e.message : String(e);
        adapterInstallFailures.push(`${targetId}: ${message}`);
        logger.warn(`Adapter generation failed for ${targetId}: ${message}`);
      }
    }
  }

  const aggregateAdapterReport = aggregateGenerationReports(adapterReports);

  // Static AGENTS.md only when no adapter was selected, or adapter install left none.
  // Claude does not emit AGENTS.md (DEC-XH-6), so non-cursor selections also need it.
  let wroteStaticAgents = false;
  const agentsMdPath = join(cwd, 'AGENTS.md');
  const hasAgentsMd = await fs.exists(agentsMdPath);
  if (!hasAgentsMd) {
    await writeStaticAgentsMd(fs, cwd, projectName);
    wroteStaticAgents = true;
  }

  // Build file list
  const filesCreated = [
    '.l1dder/state.yml',
    '.l1dder/config.yml',
    ...knowledgePlaceholders.map(([p]) => p),
    roadmapRel,
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
        {
          label: 'Start the IDEA milestone brainstorm',
          command: 'l1dder discovery start idea',
          blocking: false,
        },
        {
          label: 'Discuss the product idea with your AI agent (no files yet)',
          command: null,
          blocking: false,
        },
        {
          label: 'Record brainstorm summary and planned sessions',
          command: 'l1dder discovery plan idea --summary "..." --session AS-IDEA-1',
          blocking: false,
        },
        {
          label: 'Fill knowledge/idea.md and knowledge/roadmap.md (scaffolded)',
          command: null,
          blocking: false,
        },
        {
          label: 'Check the discovery checklist',
          command: 'l1dder discovery status',
          blocking: false,
        },
        {
          label: 'Verify project health',
          command: 'l1dder doctor',
          blocking: false,
        },
      ];

  // Format output
  const modeLabel = brownfield ? 'brownfield' : 'greenfield';
  const g = colors.glyph;
  const lines: string[] = [];

  if (brownfield) {
    lines.push(`${g.info} Brownfield mode (--existing)`);
  }
  if (!ctx.globals.json) {
    appendDefaultsNotice(lines, resolved, g.info);
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
    appendAdapterErrorSummary(lines, aggregateAdapterReport.errors, g.fail);
  }

  const firstAdapterFailure = adapterInstallFailures[0];
  if (firstAdapterFailure !== undefined) {
    lines.push('');
    lines.push(
      `${g.fail} AI IDE adapter install failed. Project scaffolding is usable; retry with: l1dder sync`,
    );
    lines.push(`  ${firstAdapterFailure}`);
  }

  return {
    exitCode: ExitCode.SUCCESS,
    data: {
      project: { name: projectName, stage },
      mode: modeLabel,
      ...(opts.profile !== undefined ? { profile: opts.profile } : {}),
      lang: language,
      ai: adapterIds,
      defaults_applied: {
        lang: resolved.defaultsApplied.lang,
        ai: resolved.defaultsApplied.ai,
      },
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
      ...(firstAdapterFailure !== undefined
        ? { adapter_install_error: firstAdapterFailure }
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
 * Resolve language and AI IDE adapter for init.
 *
 * Precedence: explicit flags → interactive prompts → non-interactive defaults
 * (`--lang en`, `--ai cursor`). Non-interactive never silently hides defaults.
 */
async function resolveInitChoices(
  ctx: CliContext,
  opts: InitOptions,
  explicitAdapterIds: readonly string[],
  interactive: boolean,
): Promise<ResolvedInitChoices> {
  const { prompt } = ctx;

  let lang: LanguageCode;
  let langDefaulted = false;
  if (opts.lang !== undefined && isSupportedLanguage(opts.lang)) {
    lang = opts.lang;
  } else if (interactive) {
    lang = await prompt.select<LanguageCode>('Documentation & chat language', [
      { value: 'en', label: 'English' },
      { value: 'ru', label: 'Русский (Russian)' },
    ]);
  } else {
    lang = DEFAULT_LANGUAGE;
    langDefaulted = true;
  }

  let ai: readonly string[];
  let aiDefaulted = false;
  if (explicitAdapterIds.includes(SKIP_ADAPTER_VALUE)) {
    ai = [];
  } else if (explicitAdapterIds.length > 0) {
    ai = explicitAdapterIds;
  } else if (interactive) {
    const supported = getSupportedAdapters(ctx);
    const selected = await prompt.select<string>('AI IDE adapter', [
      ...supported.map((id) => ({
        value: id,
        label: formatAdapterLabel(id),
      })),
      {
        value: SKIP_ADAPTER_VALUE,
        label: 'None / skip AI IDE adapter',
      },
    ]);
    ai = selected === SKIP_ADAPTER_VALUE ? [] : [selected];
  } else {
    ai = [DEFAULT_ADAPTER_ID];
    aiDefaulted = true;
  }

  return {
    lang,
    ai,
    defaultsApplied: { lang: langDefaulted, ai: aiDefaulted },
  };
}

/** Human-readable label for an adapter registry id. */
function formatAdapterLabel(id: string): string {
  if (id === 'cursor') return 'Cursor';
  if (id === 'claude') return 'Claude Code';
  return id;
}

/**
 * Tell the user which non-interactive defaults were applied and how to override.
 */
function appendDefaultsNotice(
  lines: string[],
  resolved: ResolvedInitChoices,
  infoGlyph: string,
): void {
  const { defaultsApplied, lang, ai } = resolved;
  if (!defaultsApplied.lang && !defaultsApplied.ai) {
    return;
  }

  const applied: string[] = [];
  if (defaultsApplied.lang) {
    applied.push(`--lang ${lang}`);
  }
  if (defaultsApplied.ai) {
    applied.push(
      ai.length > 0 ? `--ai ${ai.join(',')}` : 'no AI IDE adapter',
    );
  }

  const overrides: string[] = [];
  if (defaultsApplied.lang) {
    overrides.push('--lang <en|ru>');
  }
  if (defaultsApplied.ai) {
    overrides.push('--ai <cursor|claude>');
  }

  lines.push(
    `${infoGlyph} Non-interactive defaults: ${applied.join(', ')}`,
  );
  lines.push(`  Override with: ${overrides.join(' ')}`);
}

/**
 * Surface adapter-install errors without dumping a permission-error cascade.
 */
function appendAdapterErrorSummary(
  lines: string[],
  errors: readonly { path: string; message: string }[],
  failGlyph: string,
): void {
  if (errors.length === 0) {
    return;
  }

  const permissionErrors = errors.filter((error) =>
    isFilesystemPermissionError(error.message),
  );

  if (permissionErrors.length > 0) {
    lines.push(
      `${failGlyph} Adapter install hit filesystem permission errors (${String(permissionErrors.length)} files).`,
    );
    lines.push(
      '  Scaffolding is usable. Retry in a writable directory, or run: l1dder sync',
    );
    return;
  }

  const preview = errors.slice(0, 3);
  lines.push(
    `${failGlyph} ${String(errors.length)} error(s) during adapter generation`,
  );
  for (const error of preview) {
    lines.push(`    ! ${error.path}: ${error.message}`);
  }
  if (errors.length > preview.length) {
    lines.push(
      `    … and ${String(errors.length - preview.length)} more (run: l1dder sync)`,
    );
  }
}

/** Detect EPERM/EACCES-style failures from adapter file writes. */
function isFilesystemPermissionError(message: string): boolean {
  return /EPERM|EACCES|permission denied/i.test(message);
}

/**
 * Minimal roadmap placeholder used when the bundled template cannot be read.
 */
function roadmapFallback(projectName: string, lang: LanguageCode): string {
  const title = 'Roadmap';
  const hint =
    lang === 'ru' ? 'TODO: Опишите план' : 'TODO: Describe the plan';
  return `# ${title} — ${projectName}\n\n## Summary\n\n<!-- ${hint} -->\n`;
}

/**
 * Build the knowledge placeholder file set in the chosen docs language.
 *
 * Keeps `## Summary` structure (parsed by extractSummary) identical across
 * languages; only headings and TODO hints are localized.
 * `knowledge/roadmap.md` is intentionally omitted — rendered from the
 * localized bundled template in {@link executeInit}.
 */
function buildKnowledgePlaceholders(
  projectName: string,
  lang: LanguageCode,
): Array<[string, string]> {
  const t =
    lang === 'ru'
      ? {
          ideaTitle: 'Продуктовая идея',
          archAsIs: 'Architecture (As-Is)',
          erdAsIs: 'ERD (As-Is)',
          usecasesAsIs: 'Use Cases (As-Is)',
          integrationsAsIs: 'Integrations (As-Is)',
          archToBe: 'Architecture (To-Be)',
          erdToBe: 'ERD (To-Be)',
          usecasesToBe: 'Use Cases (To-Be)',
          integrationsToBe: 'Integrations (To-Be)',
          idea: 'TODO: Опишите продукт',
          asIsPlaceholder: 'Placeholder: заполняется после первой delivery-итерации',
          placeholder: 'Placeholder',
          arch: 'TODO: Опишите целевую архитектуру',
          todo: 'TODO',
        }
      : {
          ideaTitle: 'Product Idea',
          archAsIs: 'Architecture (As-Is)',
          erdAsIs: 'ERD (As-Is)',
          usecasesAsIs: 'Use Cases (As-Is)',
          integrationsAsIs: 'Integrations (As-Is)',
          archToBe: 'Architecture (To-Be)',
          erdToBe: 'ERD (To-Be)',
          usecasesToBe: 'Use Cases (To-Be)',
          integrationsToBe: 'Integrations (To-Be)',
          idea: 'TODO: Describe the product',
          asIsPlaceholder: 'Placeholder: filled in after the first delivery iteration',
          placeholder: 'Placeholder',
          arch: 'TODO: Describe the target architecture',
          todo: 'TODO',
        };

  const doc = (title: string, hint: string): string =>
    `# ${projectName} — ${title}\n\n## Summary\n\n<!-- ${hint} -->\n`;

  return [
    ['knowledge/idea.md', doc(t.ideaTitle, t.idea)],
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
