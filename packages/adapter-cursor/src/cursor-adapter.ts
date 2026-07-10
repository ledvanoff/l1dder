import { basename, join } from 'node:path';
import type {
  AIIdeAdapter,
  AdapterContext,
  AdapterManifest,
  FileSystemPort,
  GenerationReport,
  LoggerPort,
  ParsedPersona,
  ParsedSkill,
  ParsedSlashCommand,
  TransformedInstallFile,
  ValidationReport,
} from '@l1dder/core';
import { filterCommandsForAdapter, filterSkillsForAdapter } from '@l1dder/core';
import { KnowledgeReader } from '@l1dder/knowledge';
import type { ConventionsBase, MergedStandards, WorkflowBase } from '@l1dder/knowledge';
import { cursorManifest } from './cursor-manifest.js';
import { transformSkill } from './features/skills/skill-transformer.js';
import { transformCommand } from './features/commands/command-transformer.js';
import { composeCommandBody } from './features/commands/command-composer.js';
import { generateRule, type RuleGeneratorInput } from './features/rules/rule-generator.js';
import { generateAgentsMd, type AgentsMdData } from './features/agents-md/agents-md-generator.js';
import { AtomicWriter, type WriteRequest } from './adapters/atomic-writer.js';
import { generateHooks } from './features/hooks/hooks-generator.js';

/** Dependencies for CursorAdapter. */
export interface CursorAdapterDeps {
  readonly fs: FileSystemPort;
  readonly logger: LoggerPort;
}

/**
 * Cursor IDE adapter (AD3).
 *
 * Implements `AIIdeAdapter` — orchestrates 4-phase pipeline:
 * transform skills → transform commands → generate rule → generate AGENTS.md → write all.
 */
export class CursorAdapter implements AIIdeAdapter {
  readonly id = 'cursor';
  readonly manifest: AdapterManifest = cursorManifest;

  private readonly writer: AtomicWriter;
  private readonly fs: FileSystemPort;
  private readonly logger: LoggerPort;

  constructor(deps: CursorAdapterDeps) {
    this.fs = deps.fs;
    this.writer = new AtomicWriter(deps.fs);
    this.logger = deps.logger;
  }

  async transformForInstall(ctx: AdapterContext): Promise<readonly TransformedInstallFile[]> {
    const files = await this.collectTransformedFiles(ctx);
    return files.map((file) => ({
      path: file.relativePath,
      hash: file.hash,
      source: file.source,
      content: file.content,
      profile: null,
      target: this.id,
    }));
  }

  async generate(ctx: AdapterContext): Promise<GenerationReport> {
    const files = await this.collectTransformedFiles(ctx);
    const requests: WriteRequest[] = files.map((file) => ({
      relativePath: file.relativePath,
      content: file.content,
      hash: file.hash,
    }));

    this.logger.info('Writing files', { count: requests.length });
    const writeReport = await this.writer.writeAll(requests, {
      projectRoot: ctx.projectRoot,
      force: ctx.force,
      dryRun: ctx.dryRun,
    });

    return {
      created: writeReport.created,
      updated: writeReport.updated,
      skipped: writeReport.skipped,
      errors: writeReport.errors.map((e) => ({ path: e.path, message: e.error })),
    };
  }

  validate(_ctx: AdapterContext): Promise<ValidationReport> {
    return Promise.resolve({ checks: [], passed: true });
  }

  /**
   * Transform all canonical artifacts into install-ready files (skills, commands, rule, AGENTS.md, hooks).
   */
  private async collectTransformedFiles(ctx: AdapterContext): Promise<
    readonly { relativePath: string; content: string; hash: string; source: string }[]
  > {
    const projectMetadata = await collectProjectMetadata(this.fs, ctx);
    const files: Array<{ relativePath: string; content: string; hash: string; source: string }> = [];

    this.logger.info('Transforming skills', { count: ctx.skills.length });
    for (const skill of filterSkillsForAdapter(this.manifest, ctx.skills)) {
      const result = transformSkill(skill, this.manifest);
      files.push({
        ...result,
        source: `skill:${skill.frontMatter.id}`,
      });
    }

    this.logger.info('Transforming commands', { count: ctx.commands.length });
    for (const command of filterCommandsForAdapter(this.manifest, ctx.commands)) {
      const persona = resolvePersona(command, ctx.personas);
      const skill = resolveSkill(command, ctx.skills);
      const composedBody = composeCommandBody({ command, persona, skill });
      const result = transformCommand(command, composedBody, this.manifest);
      files.push({
        ...result,
        source: `command:${command.frontMatter.id}`,
      });
    }

    this.logger.info('Generating rule file');
    const ruleInput = buildRuleInput(ctx, this.manifest, projectMetadata);
    const ruleResult = generateRule(ruleInput);
    files.push({
      ...ruleResult,
      source: 'rule:l1dder',
    });

    this.logger.info('Generating AGENTS.md');
    const agentsData = buildAgentsMdData(ctx, this.manifest, projectMetadata);
    const agentsResult = generateAgentsMd(agentsData, this.manifest);
    files.push({
      ...agentsResult,
      source: 'agents-md',
    });

    const hooksFile = this.buildHooksFile(ctx);
    files.push(hooksFile);

    return files;
  }

  /**
   * Build hooks.json transformed file metadata.
   */
  private buildHooksFile(ctx: AdapterContext): {
    relativePath: string;
    content: string;
    hash: string;
    source: string;
  } {
    const hookConfig = ctx.config.hooks;
    const hooksResult = generateHooks(
      { profile: hookConfig.profile, disabled: hookConfig.disabled },
      this.manifest,
    );
    return {
      relativePath: hooksResult.relativePath,
      content: hooksResult.content,
      hash: hooksResult.hash,
      source: `hooks:${hookConfig.profile}`,
    };
  }
}

function resolvePersona(
  command: ParsedSlashCommand,
  personas: readonly ParsedPersona[],
): ParsedPersona | null {
  const role = command.frontMatter.role;
  return personas.find((p) => p.id === role) ?? null;
}

function resolveSkill(
  command: ParsedSlashCommand,
  skills: readonly ParsedSkill[],
): ParsedSkill | null {
  const skillId = command.frontMatter.skill;
  if (!skillId) return null;
  return skills.find((s) => s.frontMatter.id === skillId) ?? null;
}

interface ProjectMetadata {
  readonly projectSummary: string;
  readonly knowledgePaths: readonly string[];
  readonly knowledgeFiles: readonly { file: string; owners: string[] }[];
  readonly standards: readonly { file: string; description: string }[];
  readonly conventions: {
    readonly language: string;
    readonly commits: string;
    readonly branches: string;
    readonly testing: string;
  };
}

function buildRuleInput(
  ctx: AdapterContext,
  manifest: AdapterManifest,
  metadata: ProjectMetadata,
): RuleGeneratorInput {
  const fallbackMeta = { format_version: 1, description: '', last_updated: '' } as const;
  let conventions: ConventionsBase = { meta: fallbackMeta };
  let workflow: WorkflowBase = { meta: fallbackMeta };

  const raw = ctx.standards as unknown as Record<string, unknown>;
  if ('conventions' in raw && 'workflow' in raw) {
    const merged = raw as unknown as MergedStandards;
    conventions = merged.conventions.base;
    workflow = merged.workflow.base;
  }

  const projectName = basename(ctx.projectRoot);
  const projectStage = ctx.state?.stage ?? 'delivery';

  return {
    projectName,
    projectStage,
    config: ctx.config,
    conventions,
    workflow,
    knowledgeFiles: [...metadata.knowledgePaths],
    manifest,
  };
}

function buildAgentsMdData(
  ctx: AdapterContext,
  manifest: AdapterManifest,
  metadata: ProjectMetadata,
): AgentsMdData {
  const projectName = basename(ctx.projectRoot);
  const projectStage = ctx.state?.stage ?? 'delivery';
  const currentPhase = ctx.state?.phase ?? 'IDLE';
  const phaseStatus = ctx.state?.status ?? 'completed';

  const { docs, chat } = ctx.config.language;

  return {
    projectName,
    projectSummary: metadata.projectSummary,
    version: String(manifest.version),
    roleMode: ctx.config.role_mode,
    enforcement: ctx.config.stage.enforcement.restrict_phases,
    projectStage,
    currentPhase,
    phaseStatus,
    directoryTree: buildDirectoryTree(),
    commands: ctx.commands.map((c) => ({
      id: c.frontMatter.id,
      description: c.sections.summary?.split('\n')[0] ?? c.frontMatter.name,
      phases: c.frontMatter.phase,
    })),
    skills: ctx.skills.map((s) => ({
      id: s.frontMatter.id,
      summary: s.summary,
      trigger: s.frontMatter.trigger,
    })),
    standards: metadata.standards,
    knowledgeFiles: metadata.knowledgeFiles,
    conventions: {
      ...metadata.conventions,
      language: `Docs: ${docs}; AI chat: ${chat}; code & commits: en`,
    },
  };
}

function buildDirectoryTree(): string {
  return [
    '.l1dder/',
    'knowledge/',
    '  as-is/',
    '  to-be/',
    'standards/',
    'skills/',
    'commands/',
    'agents/',
    'packages/',
  ].join('\n');
}

async function collectProjectMetadata(
  fs: FileSystemPort,
  ctx: AdapterContext,
): Promise<ProjectMetadata> {
  const reader = new KnowledgeReader({ fs, projectRoot: ctx.projectRoot });
  const merged = asMergedStandards(ctx.standards);
  const knowledgeEntries = reader.listKnowledge();
  const knowledgeFiles: Array<{ file: string; owners: string[] }> = [];
  const knowledgePaths: string[] = [];

  for (const entry of knowledgeEntries) {
    if (await reader.exists(entry.path)) {
      knowledgePaths.push(entry.path);
      knowledgeFiles.push({
        file: entry.path,
        owners: getDefaultKnowledgeOwners(entry.path),
      });
    }
  }

  return {
    projectSummary: await readProjectSummary(reader),
    knowledgePaths,
    knowledgeFiles,
    standards: await collectStandardFiles(fs, ctx.projectRoot, merged),
    conventions: summarizeConventions(merged),
  };
}

function asMergedStandards(
  standards: AdapterContext['standards'],
): MergedStandards | null {
  const raw = standards as Record<string, unknown>;
  if ('conventions' in raw && 'workflow' in raw) {
    return standards as unknown as MergedStandards;
  }
  return null;
}

async function readProjectSummary(reader: KnowledgeReader): Promise<string> {
  for (const path of ['knowledge/idea.md', 'knowledge/roadmap.md']) {
    const result = await reader.read(path);
    if (!result.ok) continue;

    const summary = KnowledgeReader.extractSummary(result.value)
      .replace(/<!--.*?-->/gs, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (summary.length > 0) {
      return summary;
    }
  }

  return 'Project initialized with L1DDER workflow.';
}

async function collectStandardFiles(
  fs: FileSystemPort,
  projectRoot: string,
  merged: MergedStandards | null,
): Promise<readonly { file: string; description: string }[]> {
  const candidates = [
    ['standards/conventions.md', 'Project-specific coding conventions'],
    ['standards/workflow.md', 'Project-specific workflow rules'],
    ['standards/git.md', 'Git workflow and branching rules'],
    [
      'standards/.base/conventions.base.yml',
      merged?.conventions.base.meta.description ?? 'Framework base conventions',
    ],
    [
      'standards/.base/workflow.base.yml',
      merged?.workflow.base.meta.description ?? 'Framework base workflow defaults',
    ],
  ] as const;

  const files: Array<{ file: string; description: string }> = [];
  for (const [file, description] of candidates) {
    if (await fs.exists(join(projectRoot, file))) {
      files.push({ file, description });
    }
  }

  return files;
}

function summarizeConventions(
  merged: MergedStandards | null,
): ProjectMetadata['conventions'] {
  const language = toRecord(merged?.conventions.base['language']);
  const testing = toRecord(merged?.conventions.base['testing']);

  const codeLanguage = asString(language?.['code']) ?? 'en';
  const docsLanguage = asString(language?.['docs']) ?? 'en';
  const commitLanguage = asString(language?.['commits']) ?? 'en';
  const testingFramework = asString(testing?.['framework']) ?? 'Vitest';

  return {
    language: `Code: ${codeLanguage}; docs: ${docsLanguage}; commits: ${commitLanguage}`,
    commits: 'Conventional Commits in English',
    branches: 'feature/, fix/, docs/, chore/',
    testing: `${testingFramework}, test behavior not implementation`,
  };
}

function getDefaultKnowledgeOwners(path: string): string[] {
  if (path === 'knowledge/idea.md' || path === 'knowledge/roadmap.md') {
    return ['po'];
  }

  if (path.endsWith('/architecture.md') || path.endsWith('/erd.md')) {
    return ['architect'];
  }

  if (path.endsWith('/usecases.md')) {
    return ['po', 'analyst'];
  }

  if (path.endsWith('/integrations.md')) {
    return ['architect', 'analyst'];
  }

  return ['po'];
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
