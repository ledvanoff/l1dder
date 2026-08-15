/**
 * Handoff detection and validation (CE8 / HARD-6).
 *
 * Detects `.l1dder/handoff.md`, validates presence of the required core
 * sections (RU + EN aliases from the canonical contract). Optional rich
 * blocks are accepted but never required. Returns HandoffDetection —
 * the caller decides whether to include handoff in context.
 */

import type { FileSystemPort } from '@l1dder/core';
import type { HandoffDetection, HandoffValidation } from '../../domain/types.js';
import { extractSummary } from '../render/summary-extractor.js';
import { resolvePath } from '../../domain/path-utils.js';
import {
  HANDOFF_CORE_SECTIONS,
  HANDOFF_RELATIVE_PATH,
} from './handoff-contract.js';

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
  const fullPath = resolvePath(projectRoot, HANDOFF_RELATIVE_PATH);
  const exists = await fs.exists(fullPath);

  if (!exists) {
    return { exists: false, valid: false, path: HANDOFF_RELATIVE_PATH };
  }

  try {
    const content = await fs.readFile(fullPath);
    const validation = validateHandoff(content);
    const summary = extractSummary(content);

    return {
      exists: true,
      valid: validation.valid,
      path: HANDOFF_RELATIVE_PATH,
      ...(summary ? { summary } : {}),
      ...(validation.missing.length > 0 ? { missing: validation.missing } : {}),
    };
  } catch {
    return { exists: true, valid: false, path: HANDOFF_RELATIVE_PATH };
  }
}

/**
 * Validate handoff content for required core sections.
 *
 * Checks the 3 core sections from {@link HANDOFF_CORE_SECTIONS}. Both Russian
 * and English headings are accepted. Optional rich blocks may be present or
 * absent — they do not affect validity.
 */
export function validateHandoff(content: string): HandoffValidation {
  const missing: string[] = [];

  for (const section of HANDOFF_CORE_SECTIONS) {
    const found = section.headings.some((heading) =>
      content.includes(heading),
    );
    if (!found) {
      missing.push(section.name);
    }
  }

  return { valid: missing.length === 0, missing };
}
