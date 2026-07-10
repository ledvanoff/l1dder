/**
 * Context renderer — phase 3 of ContextEngine pipeline (CE6).
 *
 * Reads file contents, formats sections with tagged templates,
 * separates static/dynamic zones, computes SHA-256 hash of static zone.
 */

import { createHash } from 'node:crypto';
import type { ClockPort } from '@l1dder/core';
import type { WorkflowPosition } from '@l1dder/core';
import type {
  AllocatedProfile,
  AllocatedEntry,
  RenderedContext,
  ContextMetadata,
} from '../../domain/types.js';
import { extractSummary } from './summary-extractor.js';
import { CATEGORY_ORDER } from '../../domain/constants.js';

const BOUNDARY = '═══════════ CONTEXT_DYNAMIC_BOUNDARY ═══════════';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ru: 'Russian',
};

/**
 * Build the deterministic chat-language directive (IL T-05).
 *
 * Placed at the very start of the static zone so it stays cache-stable:
 * the string depends only on the language enum, never on time or state.
 */
function buildLanguageDirective(chatLanguage: string): string {
  const name = LANGUAGE_NAMES[chatLanguage] ?? 'English';
  return `<!-- [LANGUAGE] -->\nCommunicate with the user in ${name}.`;
}

const CATEGORY_LABELS: Record<string, string> = {
  persona: 'PERSONA',
  standards: 'STANDARDS',
  templates: 'TEMPLATES',
  knowledge: 'KNOWLEDGE',
  specs: 'SPECIFICATIONS',
  state: 'STATE',
  handoff: 'HANDOFF',
};

/**
 * Render allocated profile into final context string.
 *
 * @param allocated - Budget-allocated profile with entries and tier.
 * @param contents - Map of file path → file content (pre-loaded).
 * @param metadata - Position, role, clock, and optional chat language directive.
 * @returns RenderedContext with content, staticHash, dynamicOffset, and metadata.
 */
export function renderContext(
  allocated: AllocatedProfile,
  contents: Map<string, string>,
  metadata: {
    position: WorkflowPosition;
    role: string;
    clock: ClockPort;
    chatLanguage?: string;
  },
): RenderedContext {
  const staticEntries = allocated.entries
    .filter((e) => e.zone === 'static' && e.allocatedMode !== 'exclude')
    .sort(entrySorter);

  const dynamicEntries = allocated.entries
    .filter((e) => e.zone === 'dynamic' && e.allocatedMode !== 'exclude')
    .sort(entrySorter);

  const staticSections = staticEntries.map((e) => renderEntry(e, contents));
  const dynamicSections = dynamicEntries.map((e) => renderEntry(e, contents));

  if (metadata.chatLanguage) {
    staticSections.unshift(buildLanguageDirective(metadata.chatLanguage));
  }

  const staticContent = staticSections.join('\n\n');
  const dynamicContent = dynamicSections.join('\n\n');

  const fullContent = dynamicContent
    ? `${staticContent}\n\n${BOUNDARY}\n\n${dynamicContent}`
    : staticContent;

  const staticHash = createHash('sha256').update(staticContent).digest('hex');
  const boundaryLine = `\n\n${BOUNDARY}\n\n`;
  const dynamicOffset = dynamicContent
    ? staticContent.length + boundaryLine.length
    : staticContent.length;

  const generatedAt = metadata.clock.now();

  const contextMetadata: ContextMetadata = {
    phase: metadata.position.phase,
    role: metadata.role,
    stage: metadata.position.stage,
    tier: allocated.tier,
    totalTokens: allocated.totalTokens,
    generatedAt,
  };

  return {
    content: fullContent,
    staticHash,
    dynamicOffset,
    metadata: contextMetadata,
  };
}

function renderEntry(
  entry: AllocatedEntry,
  contents: Map<string, string>,
): string {
  const label = CATEGORY_LABELS[entry.category] ?? entry.category.toUpperCase();
  const fileContent = contents.get(entry.path);

  if (fileContent === undefined) {
    return `<!-- [${label}] ${entry.path} -->\n<!-- File not found: ${entry.path} -->`;
  }

  const body = entry.allocatedMode === 'summary'
    ? extractSummary(fileContent)
    : fileContent;

  return `<!-- [${label}] ${entry.path} -->\n${body}`;
}

function entrySorter(a: AllocatedEntry, b: AllocatedEntry): number {
  const catA = CATEGORY_ORDER[a.category];
  const catB = CATEGORY_ORDER[b.category];
  if (catA !== catB) return catA - catB;
  return a.path.localeCompare(b.path);
}
