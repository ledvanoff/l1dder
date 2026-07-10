/**
 * Handoff detection and validation (CE8).
 *
 * Detects `.l1dder/handoff.md`, validates presence of 3 required sections
 * (both RU and EN headings accepted). Returns HandoffDetection —
 * the caller decides whether to include handoff in context.
 */

import type { FileSystemPort } from '@l1dder/core';
import type { HandoffDetection, HandoffValidation } from '../../domain/types.js';
import { extractSummary } from '../render/summary-extractor.js';
import { resolvePath } from '../../domain/path-utils.js';

const HANDOFF_PATH = '.l1dder/handoff.md';

/**
 * Required sections — each item is an array of accepted heading variations
 * (Russian + English per language policy).
 */
const REQUIRED_SECTIONS: readonly { name: string; headings: readonly string[] }[] = [
  {
    name: 'Session Context',
    headings: ['## Контекст сессии', '## Session Context'],
  },
  {
    name: 'Current State',
    headings: ['## Текущее состояние', '## Current State'],
  },
  {
    name: 'Next Steps',
    headings: ['## Следующие шаги', '## Next Steps'],
  },
];

/**
 * Detect and validate handoff file at `.l1dder/handoff.md`.
 *
 * @returns HandoffDetection with exists/valid/summary/missing fields.
 *          NO auto-include — this function only detects and validates.
 */
export async function detectHandoff(
  fs: FileSystemPort,
  projectRoot: string,
): Promise<HandoffDetection> {
  const fullPath = resolvePath(projectRoot, HANDOFF_PATH);
  const exists = await fs.exists(fullPath);

  if (!exists) {
    return { exists: false, valid: false, path: HANDOFF_PATH };
  }

  try {
    const content = await fs.readFile(fullPath);
    const validation = validateHandoff(content);
    const summary = extractSummary(content);

    return {
      exists: true,
      valid: validation.valid,
      path: HANDOFF_PATH,
      ...(summary ? { summary } : {}),
      ...(validation.missing.length > 0 ? { missing: validation.missing } : {}),
    };
  } catch {
    return { exists: true, valid: false, path: HANDOFF_PATH };
  }
}

/**
 * Validate handoff content for required sections.
 *
 * Checks for 3 required sections: Session Context, Current State, Next Steps.
 * Both Russian and English headings are accepted.
 */
export function validateHandoff(content: string): HandoffValidation {
  const missing: string[] = [];

  for (const section of REQUIRED_SECTIONS) {
    const found = section.headings.some((heading) =>
      content.includes(heading),
    );
    if (!found) {
      missing.push(section.name);
    }
  }

  return { valid: missing.length === 0, missing };
}
