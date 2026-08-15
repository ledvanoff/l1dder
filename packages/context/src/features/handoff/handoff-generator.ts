/**
 * Bounded handoff generator for E3 / HARD-6 (EH-2).
 *
 * Generates a `.l1dder/handoff.md` markdown document from the current
 * project state, suitable for bootstrapping AI context at session start.
 * Output is truncated to `maxChars` to respect context-window budgets.
 *
 * Emits the required core sections always. Optional rich blocks are filled
 * ONLY from facts present in state — never invents content; unavailable
 * facts omit the block entirely.
 */

import type { State } from '@l1dder/schemas';

import {
  HANDOFF_CORE_SECTIONS,
  coreSectionById,
  preferredRuHeading,
  richSectionById,
} from './handoff-contract.js';

/** Options for handoff generation. */
export interface GenerateHandoffOptions {
  /** Maximum number of characters in the generated output. 0 = no limit. */
  readonly maxChars: number;
}

/** Result of handoff generation. */
export interface GenerateHandoffResult {
  /** Generated handoff markdown content. */
  readonly content: string;
  /** Whether the content was truncated due to maxChars. */
  readonly truncated: boolean;
}

const DEFAULT_MAX_CHARS = 8000;

/**
 * Generate a bounded handoff document from project state (E3 / HARD-6).
 *
 * Produces a markdown document accepted by `validateHandoff()`:
 * - Required core (RU headings for backward-compatible generator output)
 * - Optional rich blocks only when facts are available (decisions,
 *   recommended first command from latest session_history.next_action)
 *
 * The document is truncated to `options.maxChars` (default 8000) while
 * preserving all required core section headings for validator compatibility.
 */
export function generateHandoff(
  state: State,
  options: Partial<GenerateHandoffOptions> = {},
): GenerateHandoffResult {
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;

  const content = assembleHandoff(state);

  if (maxChars > 0 && content.length > maxChars) {
    return { content: truncateHandoff(content, maxChars), truncated: true };
  }

  return { content, truncated: false };
}

// ─── Assembly ────────────────────────────────────────────────────────────────

function assembleHandoff(state: State): string {
  const sections: string[] = [
    buildSessionContextSection(state),
    buildCurrentStateSection(state),
    buildNextStepsSection(state),
  ];

  const decisions = buildDecisionsSection(state);
  if (decisions !== null) {
    sections.push(decisions);
  }

  const recommended = buildRecommendedFirstCommandSection(state);
  if (recommended !== null) {
    sections.push(recommended);
  }

  return sections.join('\n\n') + '\n';
}

function buildSessionContextSection(state: State): string {
  const heading = preferredRuHeading(coreSectionById('session_context'));
  const lines: string[] = [
    heading,
    '',
    `**Проект:** ${state.project.name}`,
    `**Стадия:** ${state.project.stage}`,
    `**Обновлено:** ${state.project.updated_at}`,
  ];

  if (state.workflow.session !== null) {
    const s = state.workflow.session;
    lines.push(
      `**Активная сессия:** ${s.session} (profile=${s.profile}, started=${s.started_at})`,
    );
  }

  if (state.project.stage_history.length > 0) {
    const latest =
      state.project.stage_history[state.project.stage_history.length - 1];
    if (latest) {
      lines.push(
        `**Последний переход:** ${latest.from} → ${latest.to} (${latest.timestamp})`,
      );
    }
  }

  return lines.join('\n');
}

function buildCurrentStateSection(state: State): string {
  const heading = preferredRuHeading(coreSectionById('current_state'));
  const wf = state.workflow;
  const lines: string[] = [
    heading,
    '',
    `**Фаза:** ${wf.current_phase}`,
    `**Статус:** ${wf.current_status}`,
    `**Итерация:** ${String(wf.iteration)}`,
    `**Режим:** ${wf.mode}`,
  ];

  const activeTasks = state.tasks.items.filter(
    (t) => t.status === 'in_progress' || t.status === 'pending',
  );

  if (activeTasks.length > 0) {
    lines.push('', '**Активные задачи:**');
    for (const task of activeTasks.slice(0, 10)) {
      const prefix = task.status === 'in_progress' ? '→' : '·';
      lines.push(`  ${prefix} [${task.id}] ${task.title} (${task.status})`);
    }
  }

  const recentDecisions = state.decisions.slice(-3);
  if (recentDecisions.length > 0) {
    lines.push('', '**Последние решения:**');
    for (const d of recentDecisions) {
      lines.push(`  · ${d.id}: ${d.title}`);
    }
  }

  return lines.join('\n');
}

function buildNextStepsSection(state: State): string {
  const heading = preferredRuHeading(coreSectionById('next_steps'));
  const lines: string[] = [heading, ''];

  const inProgress = state.tasks.items.filter(
    (t) => t.status === 'in_progress',
  );
  const pending = state.tasks.items.filter((t) => t.status === 'pending');

  if (inProgress.length > 0) {
    lines.push('**В работе:**');
    for (const task of inProgress.slice(0, 5)) {
      lines.push(`  1. Продолжить [${task.id}] ${task.title}`);
    }
  } else {
    lines.push(
      `**Текущая фаза:** ${state.workflow.current_phase} (${state.workflow.current_status})`,
    );
    lines.push('');
    lines.push(
      `Продолжи работу в фазе \`${state.workflow.current_phase}\`.`,
    );
  }

  if (pending.length > 0) {
    lines.push(
      '',
      `**Следующие задачи (${String(pending.length)} в очереди):**`,
    );
    for (const task of pending.slice(0, 3)) {
      lines.push(`  · [${task.id}] ${task.title}`);
    }
  }

  const recentGates = state.workflow.gate_history.slice(-3);
  if (recentGates.length > 0) {
    lines.push('', '**Последние гейты:**');
    for (const gate of recentGates) {
      lines.push(`  · ${gate.gate_id} (${gate.phase}): ${gate.outcome}`);
    }
  }

  const lastHistory =
    state.workflow.session_history[state.workflow.session_history.length - 1];
  if (lastHistory?.next_action) {
    lines.push('', `**Next action (from last session):** ${lastHistory.next_action}`);
  }

  return lines.join('\n');
}

/**
 * Rich block: Decisions — only when Decision Ledger has entries.
 */
function buildDecisionsSection(state: State): string | null {
  if (state.decisions.length === 0) {
    return null;
  }

  const heading = preferredRuHeading(richSectionById('decisions'));
  const lines: string[] = [heading, ''];
  for (const d of state.decisions.slice(-10)) {
    lines.push(`- ${d.id}: ${d.title} (${d.status})`);
  }
  return lines.join('\n');
}

/**
 * Rich block: Recommended First Command — only from a recorded next_action.
 */
function buildRecommendedFirstCommandSection(state: State): string | null {
  const lastHistory =
    state.workflow.session_history[state.workflow.session_history.length - 1];
  const next = lastHistory?.next_action?.trim();
  if (next === undefined || next.length === 0) {
    return null;
  }

  const heading = preferredRuHeading(
    richSectionById('recommended_first_command'),
  );
  return [heading, '', '```', next, '```'].join('\n');
}

// ─── Truncation ───────────────────────────────────────────────────────────────

/**
 * Truncate handoff content to maxChars while preserving all required core
 * section headings.
 *
 * Strategy: keep first `maxChars` characters of content, then append any
 * missing core headings as minimal stubs so `validateHandoff()` still passes.
 */
function truncateHandoff(content: string, maxChars: number): string {
  const truncated = content.slice(0, maxChars);

  const requiredHeadings = HANDOFF_CORE_SECTIONS.map((s) =>
    preferredRuHeading(s),
  );

  const missing = requiredHeadings.filter((h) => !truncated.includes(h));
  if (missing.length === 0) return truncated;

  const stubs = missing.map((h) => `${h}\n\n(усечено)`).join('\n\n');
  return `${truncated}\n\n${stubs}`;
}
