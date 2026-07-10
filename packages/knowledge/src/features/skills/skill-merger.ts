import type { ParsedSkill } from '@l1dder/core';

const STEPS_HEADING = /^## Steps\s*$/im;
const SECTION_HEADING = /^## (.+)\s*$/gm;

/**
 * Merge a custom skill override into a built-in skill.
 *
 * Three strategies (SK3):
 * - `replace`: custom body replaces built-in entirely
 * - `append_steps`: custom Steps section appended to built-in Steps
 * - `patch`: custom named sections replace corresponding built-in sections
 */
export function mergeSkill(
  builtin: ParsedSkill,
  override: ParsedSkill,
): ParsedSkill {
  const strategy = override.frontMatter.override_strategy ?? 'replace';

  const mergedFrontMatter = {
    ...builtin.frontMatter,
    ...override.frontMatter,
    builtin: builtin.frontMatter.builtin,
  };

  let mergedBody: string;

  switch (strategy) {
    case 'replace':
      mergedBody = override.body;
      break;

    case 'append_steps':
      mergedBody = appendSteps(builtin.body, override.body);
      break;

    case 'patch':
      mergedBody = patchSections(builtin.body, override.body);
      break;
  }

  return {
    frontMatter: mergedFrontMatter,
    body: mergedBody,
    summary: override.summary || builtin.summary,
    filePath: override.filePath,
    category: override.category,
  };
}

function appendSteps(builtinBody: string, overrideBody: string): string {
  const builtinSteps = STEPS_HEADING.exec(builtinBody);
  const overrideSteps = STEPS_HEADING.exec(overrideBody);

  if (!builtinSteps || !overrideSteps) {
    return builtinBody;
  }

  const overrideStepsStart = overrideSteps.index + overrideSteps[0].length;
  const overrideStepsContent = extractSectionContent(
    overrideBody,
    overrideStepsStart,
  );

  const builtinStepsEnd = findSectionEnd(builtinBody, builtinSteps.index + builtinSteps[0].length);
  const before = builtinBody.slice(0, builtinStepsEnd).trimEnd();
  const after = builtinBody.slice(builtinStepsEnd);

  return `${before}\n${overrideStepsContent.trim()}\n${after}`;
}

function patchSections(builtinBody: string, overrideBody: string): string {
  const overrideSections = parseSections(overrideBody);
  let result = builtinBody;

  for (const [name, content] of overrideSections) {
    const sectionRegex = new RegExp(`^## ${escapeRegExp(name)}\\s*$`, 'im');
    const match = sectionRegex.exec(result);

    if (match) {
      const sectionStart = match.index;
      const contentStart = sectionStart + match[0].length;
      const sectionEnd = findSectionEnd(result, contentStart);
      result = result.slice(0, contentStart) + '\n\n' + content.trim() + '\n' + result.slice(sectionEnd);
    }
  }

  return result;
}

function parseSections(body: string): Map<string, string> {
  const sections = new Map<string, string>();
  const regex = new RegExp(SECTION_HEADING.source, 'gm');
  const matches: Array<{ name: string; index: number; end: number }> = [];
  let m;

  while ((m = regex.exec(body)) !== null) {
    const captured = m[1];
    if (captured === undefined) continue;
    matches.push({ name: captured.trim(), index: m.index, end: m.index + m[0].length });
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];
    if (current === undefined) continue;
    const end = next !== undefined ? next.index : body.length;
    sections.set(current.name, body.slice(current.end, end).trim());
  }

  return sections;
}

function extractSectionContent(body: string, startAfterHeading: number): string {
  const end = findSectionEnd(body, startAfterHeading);
  return body.slice(startAfterHeading, end);
}

function findSectionEnd(body: string, fromIndex: number): number {
  const rest = body.slice(fromIndex);
  const nextHeading = /^## /m.exec(rest);
  return nextHeading ? fromIndex + nextHeading.index : body.length;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
