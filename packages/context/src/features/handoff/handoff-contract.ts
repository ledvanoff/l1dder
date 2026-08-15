/**
 * Canonical Session Handoff contract (HARD-6 / T-15).
 *
 * Single source of truth for section headings and accepted aliases.
 * Generator, detector, and validator MUST import from here — no duplicated
 * heading literals elsewhere.
 */

/** One handoff section definition with canonical name and heading aliases. */
export interface HandoffSectionDef {
  /** Stable machine id. */
  readonly id: string;
  /** Canonical English section name (used in validation `missing` lists). */
  readonly name: string;
  /**
   * Accepted markdown H2 headings (including `## ` prefix).
   * First entry is the preferred/canonical heading for new English output.
   */
  readonly headings: readonly string[];
}

/**
 * Required bounded core — three sections. Backward compatible: both RU and EN
 * aliases are accepted so existing handoff files stay valid.
 */
export const HANDOFF_CORE_SECTIONS: readonly HandoffSectionDef[] = [
  {
    id: 'session_context',
    name: 'Session Context',
    headings: ['## Session Context', '## Контекст сессии'],
  },
  {
    id: 'current_state',
    name: 'Current State',
    headings: ['## Current State', '## Текущее состояние'],
  },
  {
    id: 'next_steps',
    name: 'Next Steps',
    headings: ['## Next Steps', '## Следующие шаги'],
  },
] as const;

/**
 * Optional rich blocks. Validator accepts core-only files and core + any
 * subset of these blocks. Missing a rich block is never invalid.
 */
export const HANDOFF_RICH_SECTIONS: readonly HandoffSectionDef[] = [
  {
    id: 'decisions',
    name: 'Decisions',
    headings: ['## Decisions', '## Решения'],
  },
  {
    id: 'open_questions',
    name: 'Open Questions',
    headings: ['## Open Questions', '## Открытые вопросы'],
  },
  {
    id: 'files_changed',
    name: 'Files Changed',
    headings: ['## Files Changed', '## Изменённые файлы'],
  },
  {
    id: 'risks',
    name: 'Risks',
    headings: ['## Risks', '## Риски'],
  },
  {
    id: 'verification',
    name: 'Verification',
    headings: ['## Verification', '## Проверка'],
  },
  {
    id: 'recommended_first_command',
    name: 'Recommended First Command',
    headings: [
      '## Recommended First Command',
      '## Рекомендуемая первая команда',
    ],
  },
] as const;

/** All known handoff sections (core + rich). */
export const HANDOFF_ALL_SECTIONS: readonly HandoffSectionDef[] = [
  ...HANDOFF_CORE_SECTIONS,
  ...HANDOFF_RICH_SECTIONS,
];

/** Relative path of the handoff file from the project root. */
export const HANDOFF_RELATIVE_PATH = '.l1dder/handoff.md';

/**
 * Preferred (first) heading for a section — used by the generator for new
 * English output.
 */
export function preferredHeading(section: HandoffSectionDef): string {
  const heading = section.headings[0];
  if (heading === undefined) {
    throw new Error(`Handoff section "${section.id}" has no headings`);
  }
  return heading;
}

/**
 * Preferred Russian heading when available (second alias), else preferred.
 */
export function preferredRuHeading(section: HandoffSectionDef): string {
  return section.headings[1] ?? preferredHeading(section);
}

/**
 * Look up a core section by id.
 */
export function coreSectionById(
  id: (typeof HANDOFF_CORE_SECTIONS)[number]['id'],
): HandoffSectionDef {
  const found = HANDOFF_CORE_SECTIONS.find((s) => s.id === id);
  if (found === undefined) {
    throw new Error(`Unknown handoff core section id: ${id}`);
  }
  return found;
}

/**
 * Look up a rich section by id.
 */
export function richSectionById(
  id: (typeof HANDOFF_RICH_SECTIONS)[number]['id'],
): HandoffSectionDef {
  const found = HANDOFF_RICH_SECTIONS.find((s) => s.id === id);
  if (found === undefined) {
    throw new Error(`Unknown handoff rich section id: ${id}`);
  }
  return found;
}
