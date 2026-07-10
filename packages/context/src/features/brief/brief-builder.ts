/**
 * Project Brief Builder (CE9).
 *
 * Generates a compact project overview (~150-200 lines, ~3000 tokens)
 * for onboarding, cold start, and `l1dder context` command.
 * Phase-independent — always produces the same sections structure.
 */

import type { FileSystemPort, ClockPort } from '@l1dder/core';
import type { TokenCounterPort } from '../../ports/token-counter.js';
import type { BriefResult, BriefSection } from '../../domain/types.js';
import { extractSummary } from '../render/summary-extractor.js';
import { resolvePath } from '../../domain/path-utils.js';

const KNOWLEDGE_FILES = [
  { path: 'knowledge/idea.md', title: 'Idea' },
  { path: 'knowledge/roadmap.md', title: 'Roadmap' },
];

const TOBE_FILES = [
  { path: 'knowledge/to-be/architecture.md', title: 'Architecture (Target)' },
  { path: 'knowledge/to-be/erd.md', title: 'Data Model (Target)' },
  { path: 'knowledge/to-be/usecases.md', title: 'Use Cases (Target)' },
  { path: 'knowledge/to-be/integrations.md', title: 'Integrations (Target)' },
];

const ASIS_FILES = [
  { path: 'knowledge/as-is/architecture.md', title: 'Architecture (Current)' },
  { path: 'knowledge/as-is/erd.md', title: 'Data Model (Current)' },
  { path: 'knowledge/as-is/usecases.md', title: 'Use Cases (Current)' },
  { path: 'knowledge/as-is/integrations.md', title: 'Integrations (Current)' },
];

/**
 * Build a compact project brief from knowledge files and state.
 *
 * Missing files are gracefully skipped (not an error).
 */
export async function buildBrief(
  fs: FileSystemPort,
  counter: TokenCounterPort,
  clock: ClockPort,
  projectRoot: string,
): Promise<BriefResult> {
  const sections: BriefSection[] = [];

  for (const { path, title } of KNOWLEDGE_FILES) {
    const section = await readSummarySection(fs, resolvePath(projectRoot, path), title);
    if (section) sections.push(section);
  }

  const toBeGroup = await buildGroupSection(fs, projectRoot, TOBE_FILES, 'Target State');
  if (toBeGroup) sections.push(toBeGroup);

  const asIsGroup = await buildGroupSection(fs, projectRoot, ASIS_FILES, 'Current State');
  if (asIsGroup) sections.push(asIsGroup);

  const stateSection = await buildStateSnapshot(fs, projectRoot);
  if (stateSection) sections.push(stateSection);

  const specsSection = await buildActiveSpecs(fs, projectRoot);
  if (specsSection) sections.push(specsSection);

  const configSection = await buildConfigSummary(fs, projectRoot);
  if (configSection) sections.push(configSection);

  const generatedAt = clock.now();
  const header = `# Project Brief\n\n_Generated: ${generatedAt}_\n`;

  const body = sections
    .map((s) => `## ${s.title}\n\n${s.content}`)
    .join('\n\n---\n\n');

  const content = `${header}\n${body}`;
  const tokenEstimate = counter.count(content);

  return { content, tokenEstimate, sections };
}

async function readSummarySection(
  fs: FileSystemPort,
  fullPath: string,
  title: string,
): Promise<BriefSection | null> {
  try {
    const raw = await fs.readFile(fullPath);
    const summary = extractSummary(raw);
    return { title, content: summary };
  } catch {
    return null;
  }
}

async function buildGroupSection(
  fs: FileSystemPort,
  projectRoot: string,
  files: readonly { path: string; title: string }[],
  groupTitle: string,
): Promise<BriefSection | null> {
  const parts: string[] = [];

  for (const { path, title } of files) {
    try {
      const raw = await fs.readFile(resolvePath(projectRoot, path));
      const summary = extractSummary(raw);
      parts.push(`### ${title}\n\n${summary}`);
    } catch {
      // Skip missing files
    }
  }

  if (parts.length === 0) return null;
  return { title: groupTitle, content: parts.join('\n\n') };
}

async function buildStateSnapshot(
  fs: FileSystemPort,
  projectRoot: string,
): Promise<BriefSection | null> {
  try {
    const raw = await fs.readFile(resolvePath(projectRoot, '.l1dder/state.yml'));
    const lines = raw.split('\n');

    const extract = (key: string): string => {
      const line = lines.find((l) => l.includes(`${key}:`));
      return line ? line.split(':').slice(1).join(':').trim() : 'unknown';
    };

    const phase = extract('current_phase');
    const status = extract('current_status');
    const stage = extract('stage');
    const mode = extract('mode');
    const iteration = extract('iteration');

    const content = [
      `- **Stage:** ${stage}`,
      `- **Phase:** ${phase}`,
      `- **Status:** ${status}`,
      `- **Mode:** ${mode}`,
      `- **Iteration:** ${iteration}`,
    ].join('\n');

    return { title: 'Workflow Status', content };
  } catch {
    return null;
  }
}

async function buildActiveSpecs(
  fs: FileSystemPort,
  projectRoot: string,
): Promise<BriefSection | null> {
  try {
    const specFiles = ['spec.md', 'plan.md', 'tasks.md'];
    const found: string[] = [];

    for (const file of specFiles) {
      const path = resolvePath(projectRoot, `specs/current/${file}`);
      if (await fs.exists(path)) {
        found.push(file);
      }
    }

    if (found.length === 0) return null;
    return {
      title: 'Active Specs',
      content: found.map((f) => `- \`specs/current/${f}\``).join('\n'),
    };
  } catch {
    return null;
  }
}

async function buildConfigSummary(
  fs: FileSystemPort,
  projectRoot: string,
): Promise<BriefSection | null> {
  try {
    const raw = await fs.readFile(resolvePath(projectRoot, '.l1dder/config.yml'));
    const lines = raw.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
    const preview = lines.slice(0, 10).join('\n');
    return {
      title: 'Configuration',
      content: `\`\`\`yaml\n${preview}\n\`\`\``,
    };
  } catch {
    return null;
  }
}
