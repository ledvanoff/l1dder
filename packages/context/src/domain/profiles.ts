/**
 * Base context profiles registry (CE2, CE3).
 *
 * Declarative TypeScript data: PhaseGroup × Stage → ContextEntry[].
 * Each profile defines what files to include and at what mode.
 */

import type { ProjectStage } from '@l1dder/core';
import type { ContextEntry, ContextCategory, ContextZone } from './types.js';
import type { IncludeMode } from '@l1dder/schemas';
import type { PhaseGroup } from './phase-groups.js';

// ─── Helpers ───

function entry(
  category: ContextCategory,
  path: string,
  mode: IncludeMode,
  priority: number,
  zone?: ContextZone,
): ContextEntry {
  const defaultZone: ContextZone =
    category === 'specs' || category === 'state' || category === 'handoff'
      ? 'dynamic'
      : 'static';
  return { category, path, mode, priority, zone: zone ?? defaultZone };
}

// ─── Shared entry sets ───

const KNOWLEDGE_TOBE_FULL: ContextEntry[] = [
  entry('knowledge', 'knowledge/to-be/architecture.md', 'full', 2),
  entry('knowledge', 'knowledge/to-be/erd.md', 'full', 3),
  entry('knowledge', 'knowledge/to-be/usecases.md', 'full', 3),
  entry('knowledge', 'knowledge/to-be/integrations.md', 'full', 3),
];

const KNOWLEDGE_TOBE_SUMMARY: ContextEntry[] = [
  entry('knowledge', 'knowledge/to-be/architecture.md', 'summary', 3),
  entry('knowledge', 'knowledge/to-be/erd.md', 'summary', 4),
  entry('knowledge', 'knowledge/to-be/usecases.md', 'summary', 4),
  entry('knowledge', 'knowledge/to-be/integrations.md', 'summary', 4),
];

const KNOWLEDGE_ASIS_FULL: ContextEntry[] = [
  entry('knowledge', 'knowledge/as-is/architecture.md', 'full', 2),
  entry('knowledge', 'knowledge/as-is/erd.md', 'full', 3),
  entry('knowledge', 'knowledge/as-is/usecases.md', 'full', 3),
  entry('knowledge', 'knowledge/as-is/integrations.md', 'full', 3),
];

const KNOWLEDGE_ASIS_SUMMARY: ContextEntry[] = [
  entry('knowledge', 'knowledge/as-is/architecture.md', 'summary', 4),
  entry('knowledge', 'knowledge/as-is/erd.md', 'summary', 4),
  entry('knowledge', 'knowledge/as-is/usecases.md', 'summary', 4),
  entry('knowledge', 'knowledge/as-is/integrations.md', 'summary', 4),
];

const IDEA_SUMMARY: ContextEntry = entry('knowledge', 'knowledge/idea.md', 'summary', 5);
const ROADMAP_SUMMARY: ContextEntry = entry('knowledge', 'knowledge/roadmap.md', 'summary', 5);

const CONVENTIONS: ContextEntry = entry('standards', 'standards/conventions.md', 'full', 4);
const CONVENTIONS_SUMMARY: ContextEntry = entry('standards', 'standards/conventions.md', 'summary', 4);

const SPEC_ENTRIES: ContextEntry[] = [
  entry('specs', 'specs/current/spec.md', 'full', 1),
  entry('specs', 'specs/current/plan.md', 'full', 1),
];

const TASKS_ENTRY: ContextEntry = entry('specs', 'specs/current/tasks.md', 'full', 1);

// ─── Stage lookup key: specific stage or "any" fallback ───

type StageLookup = ProjectStage | 'any';

/** Profile entries indexed by stage (specific) with "any" as fallback. */
export type StageProfiles = Partial<Record<StageLookup, readonly ContextEntry[]>>;

/**
 * BASE_PROFILES: PhaseGroup → Stage → ContextEntry[].
 *
 * Lookup order: exact stage match first, then "any" fallback.
 * Based on CE3 table from design/context-engine.md.
 */
export const BASE_PROFILES: Readonly<Record<PhaseGroup, StageProfiles>> = {
  IDLE: {
    any: [
      IDEA_SUMMARY,
      ROADMAP_SUMMARY,
      ...KNOWLEDGE_TOBE_SUMMARY,
      ...KNOWLEDGE_ASIS_SUMMARY,
    ],
  },

  SPECIFY: {
    discovery: [
      entry('knowledge', 'knowledge/idea.md', 'full', 3),
      ROADMAP_SUMMARY,
      ...KNOWLEDGE_TOBE_FULL,
      ...KNOWLEDGE_ASIS_SUMMARY,
      entry('templates', 'templates/specs/spec-template.md', 'full', 4),
    ],
    delivery: [
      IDEA_SUMMARY,
      ROADMAP_SUMMARY,
      ...KNOWLEDGE_TOBE_SUMMARY,
      ...KNOWLEDGE_ASIS_FULL,
      entry('templates', 'templates/specs/spec-template.md', 'full', 4),
    ],
    any: [
      IDEA_SUMMARY,
      ROADMAP_SUMMARY,
      ...KNOWLEDGE_TOBE_SUMMARY,
      ...KNOWLEDGE_ASIS_SUMMARY,
      entry('templates', 'templates/specs/spec-template.md', 'full', 4),
    ],
  },

  PLAN: {
    discovery: [
      entry('knowledge', 'knowledge/idea.md', 'full', 3),
      ROADMAP_SUMMARY,
      ...KNOWLEDGE_TOBE_FULL,
      ...KNOWLEDGE_ASIS_SUMMARY,
      ...SPEC_ENTRIES,
      CONVENTIONS,
      entry('templates', 'templates/specs/plan-template.md', 'full', 4),
    ],
    delivery: [
      IDEA_SUMMARY,
      ROADMAP_SUMMARY,
      ...KNOWLEDGE_TOBE_FULL,
      ...KNOWLEDGE_ASIS_FULL,
      ...SPEC_ENTRIES,
      CONVENTIONS,
      entry('templates', 'templates/specs/plan-template.md', 'full', 4),
    ],
    any: [
      IDEA_SUMMARY,
      ROADMAP_SUMMARY,
      ...KNOWLEDGE_TOBE_SUMMARY,
      ...KNOWLEDGE_ASIS_SUMMARY,
      ...SPEC_ENTRIES,
      CONVENTIONS_SUMMARY,
      entry('templates', 'templates/specs/plan-template.md', 'full', 4),
    ],
  },

  TO_BE_KU: {
    any: [
      entry('knowledge', 'knowledge/idea.md', 'full', 2),
      ROADMAP_SUMMARY,
      ...KNOWLEDGE_TOBE_FULL.map(e => ({ ...e, priority: 1 })),
      ...KNOWLEDGE_ASIS_SUMMARY,
      ...SPEC_ENTRIES,
    ],
  },

  TASKS: {
    any: [
      IDEA_SUMMARY,
      ROADMAP_SUMMARY,
      ...KNOWLEDGE_TOBE_FULL,
      ...KNOWLEDGE_ASIS_FULL,
      ...SPEC_ENTRIES,
      CONVENTIONS,
      entry('templates', 'templates/specs/tasks-template.md', 'full', 4),
    ],
  },

  IMPLEMENT: {
    any: [
      IDEA_SUMMARY,
      ROADMAP_SUMMARY,
      ...KNOWLEDGE_TOBE_FULL,
      ...KNOWLEDGE_ASIS_FULL,
      ...SPEC_ENTRIES,
      TASKS_ENTRY,
      CONVENTIONS,
    ],
  },

  AS_IS_KU: {
    any: [
      entry('knowledge', 'knowledge/idea.md', 'full', 2),
      ROADMAP_SUMMARY,
      ...KNOWLEDGE_TOBE_FULL.map(e => ({ ...e, priority: 1 })),
      ...KNOWLEDGE_ASIS_FULL.map(e => ({ ...e, priority: 1 })),
      ...SPEC_ENTRIES,
    ],
  },

  COMPLETE: {
    any: [
      IDEA_SUMMARY,
      ROADMAP_SUMMARY,
      ...KNOWLEDGE_TOBE_SUMMARY,
      ...KNOWLEDGE_ASIS_SUMMARY,
      ...SPEC_ENTRIES.map(e => ({ ...e, mode: 'summary' as const })),
    ],
  },

  QUICK: {
    any: [
      IDEA_SUMMARY,
      ROADMAP_SUMMARY,
      ...KNOWLEDGE_TOBE_SUMMARY,
      ...KNOWLEDGE_ASIS_SUMMARY,
      CONVENTIONS_SUMMARY,
    ],
  },
};

/**
 * Resolve base profile entries for a given phase group and stage.
 * Uses exact stage match first, falls back to "any".
 */
export function resolveBaseProfile(
  group: PhaseGroup,
  stage: ProjectStage,
): readonly ContextEntry[] {
  const stageProfiles = BASE_PROFILES[group];
  return stageProfiles[stage] ?? stageProfiles['any'] ?? [];
}
