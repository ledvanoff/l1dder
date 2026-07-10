import type { HookPayload, HookResult } from '@l1dder/schemas';
import type { HookHandlerDeps } from '../hook-handler.js';

const TS_PATTERN = /\.(ts|tsx)$/i;
const MD_PATTERN = /\.md$/i;

/**
 * Format After Edit handler.
 *
 * Warns (never blocks) after editing TypeScript or Markdown files,
 * suggesting the user run prettier/tsc.
 *
 * Uses ShellPort to probe whether prettier/tsc are available.
 * If the tool is unavailable, emits a softer reminder instead.
 *
 * Adapted from ECC `after-file-edit.js` (MIT, Affaan Mustafa).
 */
export async function formatAfterEditHandler(
  payload: HookPayload,
  deps: HookHandlerDeps,
): Promise<HookResult> {
  const filePath = payload.filePath ?? '';
  if (!filePath) return { outcome: 'allow', messages: [] };

  const isTs = TS_PATTERN.test(filePath);
  const isMd = MD_PATTERN.test(filePath);

  if (!isTs && !isMd) return { outcome: 'allow', messages: [] };

  const messages: string[] = [];

  if (isTs) {
    try {
      const tscResult = await deps.shell.exec(
        'pnpm tsc --noEmit --skipLibCheck 2>&1 | head -5',
        { cwd: deps.projectRoot, timeout: 15_000 },
      );
      if (tscResult.stdout.trim()) {
        messages.push(
          `WARN: TypeScript check found issues after editing ${filePath}:`,
          ...tscResult.stdout
            .trim()
            .split('\n')
            .slice(0, 3)
            .map((l) => `  ${l}`),
        );
      }
    } catch {
      messages.push(`WARN: Consider running \`pnpm tsc --noEmit\` after editing ${filePath}.`);
    }
  }

  if (isMd || isTs) {
    try {
      const fmtResult = await deps.shell.exec(
        `pnpm prettier --check "${filePath}" 2>&1`,
        { cwd: deps.projectRoot, timeout: 10_000 },
      );
      if (fmtResult.exitCode !== 0) {
        messages.push(
          `WARN: ${filePath} may need formatting — run \`pnpm prettier --write "${filePath}"\`.`,
        );
      }
    } catch {
      // prettier unavailable — soft reminder.
      if (messages.length === 0) {
        messages.push(`WARN: Consider formatting ${filePath} after editing.`);
      }
    }
  }

  return messages.length > 0 ? { outcome: 'warn', messages } : { outcome: 'allow', messages: [] };
}
