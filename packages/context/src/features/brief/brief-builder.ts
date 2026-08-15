/**
 * Project Brief Builder (CE9).
 *
 * Generates a compact project overview (~150-200 lines, ~3000 tokens)
 * for onboarding, cold start, and `l1dder context` command.
 * Phase-independent — always produces the same sections structure.
 */

import type { FileSystemPort, ClockPort } from '@l1dder/core';
import { SchemaValidationError } from '@l1dder/core';
import { StateSchema } from '@l1dder/schemas';
import type { BriefWorkflowSnapshot, State } from '@l1dder/schemas';
import { parseYaml } from '@l1dder/yaml';
import type { TokenCounterPort } from '../../ports/token-counter.js';
import type { BriefResult, BriefSection } from '../../domain/types.js';
import { extractSummary } from '../render/summary-extractor.js';
import { resolvePath } from '../../domain/path-utils.js';

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
 * Known machine-status claim lines that must never appear as facts inside the
 * Roadmap narrative excerpt (DF-025). Narrow denylist — not a prose parser.
 */
const ROADMAP_STATUS_CLAIM_LINE =
  /^\s*(?:[-*]\s+)?(?:\*\*)?(?:Project stage|Current stage|Stage|Current phase|Workflow phase|Phase)(?:\*\*)?\s*:/i;

const ROADMAP_NARRATIVE_NOTE =
  '_Narrative excerpt from `knowledge/roadmap.md`. Authoritative workflow status is only in the Workflow Status section below._';

/**
 * Optional inputs for {@link buildBrief}.
 *
 * When `projection` is provided it is the sole source of status claims in the
 * brief (Stage / Milestone / Profile / Session / Phase / Gate / Primary Action).
 * Callers that own `WorkflowProjectionService` (CLI) map its output into
 * {@link BriefWorkflowSnapshot}; `@l1dder/context` never imports `@l1dder/state`.
 */
export interface BuildBriefOptions {
  /** Optional pure-data workflow snapshot from the projection read model. */
  readonly projection?: BriefWorkflowSnapshot;
}

/**
 * Build a compact project brief from knowledge files and state.
 *
 * Missing knowledge files are gracefully skipped. When `.l1dder/state.yml`
 * exists it is validated against `StateSchema` (fail-closed, DF-027) — invalid
 * state never produces a misleading brief.
 *
 * Roadmap text is included as a **narrative** excerpt only; status lines such
 * as `Project stage: …` are stripped so they cannot contradict runtime state
 * (DF-025).
 */
export async function buildBrief(
  fs: FileSystemPort,
  counter: TokenCounterPort,
  clock: ClockPort,
  projectRoot: string,
  options?: BuildBriefOptions,
): Promise<BriefResult> {
  await assertStateValidOrAbsent(fs, projectRoot);

  const sections: BriefSection[] = [];

  const ideaSection = await readSummarySection(
    fs,
    resolvePath(projectRoot, 'knowledge/idea.md'),
    'Idea',
  );
  if (ideaSection) sections.push(ideaSection);

  const roadmapSection = await readRoadmapNarrative(
    fs,
    resolvePath(projectRoot, 'knowledge/roadmap.md'),
  );
  if (roadmapSection) sections.push(roadmapSection);

  const toBeGroup = await buildGroupSection(fs, projectRoot, TOBE_FILES, 'Target State');
  if (toBeGroup) sections.push(toBeGroup);

  const asIsGroup = await buildGroupSection(fs, projectRoot, ASIS_FILES, 'Current State');
  if (asIsGroup) sections.push(asIsGroup);

  const stateSection = options?.projection
    ? buildProjectionSnapshot(options.projection)
    : await buildStateSnapshot(fs, projectRoot);
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

/**
 * Load roadmap as a narrative excerpt: strip known status-claim lines and
 * label the section so it is never treated as the workflow SoT.
 */
async function readRoadmapNarrative(
  fs: FileSystemPort,
  fullPath: string,
): Promise<BriefSection | null> {
  try {
    const raw = await fs.readFile(fullPath);
    const summary = extractSummary(raw);
    const narrative = stripStatusClaimLines(summary);
    if (!narrative.trim()) return null;
    return {
      title: 'Roadmap (narrative)',
      content: `${ROADMAP_NARRATIVE_NOTE}\n\n${narrative}`,
    };
  } catch {
    return null;
  }
}

/** Drop known machine-status claim lines from a roadmap summary excerpt. */
function stripStatusClaimLines(text: string): string {
  return text
    .split('\n')
    .filter((line) => !ROADMAP_STATUS_CLAIM_LINE.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

/**
 * Fail closed when state.yml exists but fails `StateSchema` validation.
 * Absent state is allowed (brief still useful for knowledge-only views).
 *
 * @returns Validated state when present, otherwise `null`.
 */
async function loadValidatedStateOrAbsent(
  fs: FileSystemPort,
  projectRoot: string,
): Promise<State | null> {
  const statePath = resolvePath(projectRoot, '.l1dder/state.yml');
  let raw: string;
  try {
    raw = await fs.readFile(statePath);
  } catch {
    return null;
  }

  const parsed = parseYaml(raw, StateSchema);
  if (!parsed.ok) {
    const issues =
      'issues' in parsed.error && Array.isArray(parsed.error.issues)
        ? parsed.error.issues
        : [{ path: [], message: parsed.error.message }];
    throw new SchemaValidationError(statePath, issues);
  }

  return parsed.value;
}

/** Assert state is schema-valid when the file exists (DF-027). */
async function assertStateValidOrAbsent(
  fs: FileSystemPort,
  projectRoot: string,
): Promise<void> {
  await loadValidatedStateOrAbsent(fs, projectRoot);
}

/**
 * Render Workflow Status exclusively from a projection snapshot (DF-025).
 *
 * When a snapshot is present this is the only status block in the brief —
 * state.yml is still validated for fail-closed safety but not used for claims.
 */
function buildProjectionSnapshot(snapshot: BriefWorkflowSnapshot): BriefSection {
  const lines: string[] = [
    `- **Stage:** ${snapshot.stage}`,
    `- **Phase:** ${snapshot.phase}`,
  ];

  if (snapshot.phase_status !== undefined) {
    lines.push(`- **Status:** ${snapshot.phase_status}`);
  }
  if (snapshot.profile !== undefined) {
    lines.push(`- **Profile:** ${snapshot.profile ?? 'none'}`);
  }
  if (snapshot.session !== undefined) {
    lines.push(`- **Session:** ${snapshot.session ?? 'none'}`);
  }
  if (snapshot.milestone !== undefined && snapshot.milestone !== null) {
    lines.push(
      `- **Milestone:** ${snapshot.milestone.id} (${snapshot.milestone.status})`,
    );
  }
  if (snapshot.gate !== undefined && snapshot.gate !== null) {
    lines.push(`- **Gate:** ${snapshot.gate}`);
  }
  if (snapshot.primary_action !== undefined) {
    const action = snapshot.primary_action;
    lines.push(
      `- **Primary Action:** ${action.command || action.kind} — ${action.reason}`,
    );
  }

  return { title: 'Workflow Status', content: lines.join('\n') };
}

async function buildStateSnapshot(
  fs: FileSystemPort,
  projectRoot: string,
): Promise<BriefSection | null> {
  const state = await loadValidatedStateOrAbsent(fs, projectRoot);
  if (!state) return null;

  const content = [
    `- **Stage:** ${state.project.stage}`,
    `- **Phase:** ${state.workflow.current_phase}`,
    `- **Status:** ${state.workflow.current_status}`,
    `- **Mode:** ${state.workflow.mode}`,
    `- **Iteration:** ${String(state.workflow.iteration)}`,
  ].join('\n');

  return { title: 'Workflow Status', content };
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
