import { basename } from 'node:path';
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
import { claudeManifest } from './claude-manifest.js';
import { transformSkill } from './features/skills/skill-transformer.js';
import { transformCommand } from './features/commands/command-transformer.js';
import { composeCommandBody } from './features/commands/command-composer.js';
import { generateRule, type RuleGeneratorInput } from './features/rules/rule-generator.js';
import { AtomicWriter, type WriteRequest } from './adapters/atomic-writer.js';

/** Dependencies for ClaudeAdapter. */
export interface ClaudeAdapterDeps {
  readonly fs: FileSystemPort;
  readonly logger: LoggerPort;
}

/**
 * Claude Code adapter.
 *
 * Transforms canonical L1DDER artifacts into Claude Code skills and project memory.
 * Does not generate AGENTS.md (universal, written once by CLI — DEC-XH-6).
 */
export class ClaudeAdapter implements AIIdeAdapter {
  readonly id = 'claude';
  readonly manifest: AdapterManifest = claudeManifest;

  private readonly writer: AtomicWriter;
  private readonly fs: FileSystemPort;
  private readonly logger: LoggerPort;

  constructor(deps: ClaudeAdapterDeps) {
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

    this.logger.info('Writing Claude Code files', { count: requests.length });
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

  private async collectTransformedFiles(ctx: AdapterContext): Promise<
    readonly { relativePath: string; content: string; hash: string; source: string }[]
  > {
    const projectMetadata = await collectProjectMetadata(this.fs, ctx);
    const files: Array<{ relativePath: string; content: string; hash: string; source: string }> =
      [];

    this.logger.info('Transforming skills for Claude', { count: ctx.skills.length });
    for (const skill of filterSkillsForAdapter(this.manifest, ctx.skills)) {
      const result = transformSkill(skill, this.manifest);
      files.push({
        ...result,
        source: `skill:${skill.frontMatter.id}`,
      });
    }

    this.logger.info('Transforming commands for Claude', { count: ctx.commands.length });
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

    this.logger.info('Generating CLAUDE.md');
    const ruleInput = buildRuleInput(ctx, this.manifest, projectMetadata);
    const ruleResult = generateRule(ruleInput);
    files.push({
      ...ruleResult,
      source: 'rule:l1dder',
    });

    return files;
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
  readonly knowledgePaths: readonly string[];
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

async function collectProjectMetadata(
  fs: FileSystemPort,
  ctx: AdapterContext,
): Promise<ProjectMetadata> {
  const reader = new KnowledgeReader({ fs, projectRoot: ctx.projectRoot });
  const knowledgePaths: string[] = [];

  for (const entry of reader.listKnowledge()) {
    if (await reader.exists(entry.path)) {
      knowledgePaths.push(entry.path);
    }
  }

  return { knowledgePaths };
}
