import { join } from 'node:path';
import { StateSchema } from '@l1dder/schemas';
import { generateHandoff } from '@l1dder/context';
import { parseYaml } from '@l1dder/yaml';
import type { HookPayload, HookResult } from '@l1dder/schemas';
import type { HookHandlerDeps } from '../hook-handler.js';

const STATE_FILE = '.l1dder/state.yml';
const HANDOFF_FILE = '.l1dder/handoff.md';

const DEFAULT_MAX_CHARS = 8000;

/**
 * PreCompact Handoff Save handler (E3).
 *
 * Triggered on `PreCompact` canonical event. Reads `state.yml`, generates
 * a bounded `.l1dder/handoff.md` via `generateHandoff()`, and writes it to
 * disk. If state.yml is missing or invalid, writes a minimal stub so that
 * `session-start-bounded-context` always finds a valid file.
 *
 * Always returns `allow` — side-effect only, never blocks.
 */
export async function precompactHandoffSaveHandler(
  _payload: HookPayload,
  deps: HookHandlerDeps,
): Promise<HookResult> {
  const maxChars = deps.sessionStartMaxChars ?? DEFAULT_MAX_CHARS;

  try {
    const stateRaw = await deps.fs.readFile(join(deps.projectRoot, STATE_FILE));
    const parseResult = parseYaml(stateRaw, StateSchema);

    const content = parseResult.ok
      ? generateHandoff(parseResult.value, { maxChars }).content
      : buildFallbackHandoff();

    const handoffPath = join(deps.projectRoot, HANDOFF_FILE);
    const handoffDir = join(deps.projectRoot, '.l1dder');
    await deps.fs.mkdir(handoffDir);
    await deps.fs.writeFile(handoffPath, content);
  } catch {
    // Non-critical — write a minimal stub so session-start still works.
    try {
      const handoffPath = join(deps.projectRoot, HANDOFF_FILE);
      const handoffDir = join(deps.projectRoot, '.l1dder');
      await deps.fs.mkdir(handoffDir);
      await deps.fs.writeFile(handoffPath, buildFallbackHandoff());
    } catch {
      // If we can't write at all, that's fine — don't block the compaction.
    }
  }

  return { outcome: 'allow', messages: [] };
}

/** Minimal valid handoff when state is unavailable. */
function buildFallbackHandoff(): string {
  const now = new Date().toISOString();
  return [
    '## Контекст сессии',
    '',
    `Handoff сгенерирован автоматически при компакции контекста: ${now}`,
    '',
    '## Текущее состояние',
    '',
    'State.yml недоступен — восстанови контекст вручную.',
    '',
    '## Следующие шаги',
    '',
    'Проверь `knowledge/roadmap.md` для определения следующей задачи.',
    '',
  ].join('\n');
}
