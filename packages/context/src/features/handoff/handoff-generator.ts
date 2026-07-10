/**
 * Bounded handoff generator for E3 (EH-2).
 *
 * Generates a `.l1dder/handoff.md` markdown document from the current
 * project state, suitable for bootstrapping AI context at session start.
 * Output is truncated to `maxChars` to respect context-window budgets.
 */

import type { State } from '@l1dder/schemas';

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
 * Generate a bounded handoff document from project state (E3).
 *
 * Produces a 3-section markdown document accepted by `validateHandoff()`:
 * - `## Контекст сессии` — project name, stage, updated timestamp
 * - `## Текущее состояние` — current phase, status, iteration, active tasks
 * - `## Следующие шаги` — derived from in-progress/pending tasks or phase guidance
 *
 * The document is truncated to `options.maxChars` (default 8000) while
 * preserving all 3 section headings for validator compatibility.
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
  return sections.join('\n\n') + '\n';
}

function buildSessionContextSection(state: State): string {
  const lines: string[] = [
    '## Контекст сессии',
    '',
    `**Проект:** ${state.project.name}`,
    `**Стадия:** ${state.project.stage}`,
    `**Обновлено:** ${state.project.updated_at}`,
  ];

  if (state.project.stage_history.length > 0) {
    const latest = state.project.stage_history[state.project.stage_history.length - 1];
    if (latest) {
      lines.push(`**Последний переход:** ${latest.from} → ${latest.to} (${latest.timestamp})`);
    }
  }

  return lines.join('\n');
}

function buildCurrentStateSection(state: State): string {
  const wf = state.workflow;
  const lines: string[] = [
    '## Текущее состояние',
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
  const lines: string[] = ['## Следующие шаги', ''];

  const inProgress = state.tasks.items.filter((t) => t.status === 'in_progress');
  const pending = state.tasks.items.filter((t) => t.status === 'pending');

  if (inProgress.length > 0) {
    lines.push('**В работе:**');
    for (const task of inProgress.slice(0, 5)) {
      lines.push(`  1. Продолжить [${task.id}] ${task.title}`);
    }
  } else {
    lines.push(`**Текущая фаза:** ${state.workflow.current_phase} (${state.workflow.current_status})`);
    lines.push('');
    lines.push(`Продолжи работу в фазе \`${state.workflow.current_phase}\`.`);
  }

  if (pending.length > 0) {
    lines.push('', `**Следующие задачи (${String(pending.length)} в очереди):**`);
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

  return lines.join('\n');
}

// ─── Truncation ───────────────────────────────────────────────────────────────

/**
 * Truncate handoff content to maxChars while preserving all 3 section headings.
 *
 * Strategy: keep first `maxChars` characters of content, then append any
 * missing section headings as minimal stubs so `validateHandoff()` still passes.
 */
function truncateHandoff(content: string, maxChars: number): string {
  const truncated = content.slice(0, maxChars);

  const requiredHeadings = [
    '## Контекст сессии',
    '## Текущее состояние',
    '## Следующие шаги',
  ];

  const missing = requiredHeadings.filter((h) => !truncated.includes(h));
  if (missing.length === 0) return truncated;

  const stubs = missing.map((h) => `${h}\n\n(усечено)`).join('\n\n');
  return `${truncated}\n\n${stubs}`;
}
