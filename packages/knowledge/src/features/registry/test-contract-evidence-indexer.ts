/**
 * Indexes `@tc` markers in package Vitest files for registry evidence checks.
 *
 * Marker format (comment above the proving test):
 * ```ts
 * // @tc TC-001-05-A
 * it('returns err when transition is forbidden', () => { ... });
 * ```
 *
 * Positive/expected-behavior tests are valid evidence — no requirement that
 * the test "must fail" or represent a bug fix.
 */

import type {
  FileSystemPort,
  TestContractEvidence,
  TestContractEvidenceIndex,
  TestContractEvidencePort,
  TestContractMarkerWarning,
} from '@l1dder/core';
import { join } from 'node:path';

import {
  collectPackageTsFiles,
  listPackageDirs,
  toPosixRelative,
} from './package-ts-walk.js';

/** Stable TC id shape used for marker validation. */
const TC_ID_RE = /^TC-\d{3}-\d{2}-[A-Z]$/u;

/** Line matching `// @tc …`. */
const TC_MARKER_RE = /^(\s*)\/\/\s*@tc\b(.*)$/u;

/** Dependencies for {@link TestContractEvidenceIndexer}. */
export interface TestContractEvidenceIndexerDeps {
  readonly fs: FileSystemPort;
}

/**
 * Scans package `src` trees for `*.test.ts` / `*.spec.ts` `@tc` markers.
 */
export class TestContractEvidenceIndexer implements TestContractEvidencePort {
  private readonly fs: FileSystemPort;

  constructor(deps: TestContractEvidenceIndexerDeps) {
    this.fs = deps.fs;
  }

  /**
   * Scan package test trees and return evidence + marker warnings.
   *
   * @param projectRoot - Absolute project root
   * @returns Deterministically sorted evidence index
   */
  async index(projectRoot: string): Promise<TestContractEvidenceIndex> {
    const packagesRoot = join(projectRoot, 'packages');
    const packageDirs = await listPackageDirs(this.fs, packagesRoot);

    const evidence: TestContractEvidence[] = [];
    const markerWarnings: TestContractMarkerWarning[] = [];
    let scannedFiles = 0;
    let markerCount = 0;

    for (const packageDir of packageDirs) {
      const srcRoot = join(packageDir, 'src');
      if (!(await this.fs.exists(srcRoot))) continue;

      const testFiles = await collectPackageTsFiles(this.fs, srcRoot, 'test');
      for (const absFile of testFiles) {
        scannedFiles += 1;
        let content: string;
        try {
          content = await this.fs.readFile(absFile);
        } catch {
          continue;
        }
        const relFile = toPosixRelative(projectRoot, absFile);
        const parsed = parseTestFileMarkers(content, relFile);
        markerCount += parsed.markerCount;
        evidence.push(...parsed.evidence);
        markerWarnings.push(...parsed.markerWarnings);
      }
    }

    evidence.sort(compareEvidence);
    markerWarnings.sort(compareMarkerWarning);

    return {
      evidence,
      markerWarnings,
      scannedFiles,
      markerCount,
    };
  }
}

/** Parse result for one test file. */
interface FileParseResult {
  readonly evidence: TestContractEvidence[];
  readonly markerWarnings: TestContractMarkerWarning[];
  readonly markerCount: number;
}

/**
 * Parse `@tc` markers and following `it`/`test` titles from one file.
 *
 * @param content - Raw test file source
 * @param file - Repo-relative POSIX path
 * @returns Evidence and warnings for this file
 */
function parseTestFileMarkers(content: string, file: string): FileParseResult {
  const evidence: TestContractEvidence[] = [];
  const markerWarnings: TestContractMarkerWarning[] = [];
  let markerCount = 0;

  const lines = content.split(/\n/u);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const markerMatch = TC_MARKER_RE.exec(line);
    if (markerMatch === null) continue;

    markerCount += 1;
    const markerLine = i + 1;
    const raw = line.trim();
    const idPart = (markerMatch[2] ?? '').trim();
    const ids = splitContractIds(idPart);

    if (ids.length === 0) {
      markerWarnings.push({
        file,
        line: markerLine,
        raw,
        message: `@tc marker has no contract ids at ${file}:${String(markerLine)}`,
      });
      continue;
    }

    const invalidIds = ids.filter((id) => !TC_ID_RE.test(id));
    if (invalidIds.length > 0) {
      markerWarnings.push({
        file,
        line: markerLine,
        raw,
        message: `Invalid @tc contract id(s) ${invalidIds.join(', ')} at ${file}:${String(markerLine)}`,
      });
      // Still try to attach evidence for any valid ids on the same marker.
    }

    const validIds = ids.filter((id) => TC_ID_RE.test(id));
    const following = findImmediatelyFollowingTest(content, i, lines);
    if (following === undefined) {
      markerWarnings.push({
        file,
        line: markerLine,
        raw,
        message: `@tc marker must directly precede an it()/test() call at ${file}:${String(markerLine)}`,
      });
      continue;
    }

    for (const contractId of validIds) {
      evidence.push({
        contractId,
        file,
        title: following.title,
        line: following.line,
      });
    }
  }

  return { evidence, markerWarnings, markerCount };
}

/**
 * Split marker payload into TC ids (comma and/or whitespace separated).
 *
 * @param payload - Text after `@tc`
 * @returns Non-empty tokens
 */
function splitContractIds(payload: string): string[] {
  if (payload.length === 0) return [];
  return payload
    .split(/[,\s]+/u)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** Located `it`/`test` title after a marker. */
interface FollowingTest {
  readonly title: string;
  readonly line: number;
}

/** Line that starts an `it`/`test` call (modifiers / generics allowed). */
const TEST_CALL_START_RE =
  /^(?:it|test)(?:\.[A-Za-z]+)*(?:\s*<[^>]*>)?\s*\(/u;

/**
 * Find an `it`/`test` that the marker directly precedes.
 *
 * Skips only blank lines and comment-only lines (including other `@tc`
 * markers and block-comment interiors). The first substantive line must
 * begin the test call; otherwise no evidence is produced.
 *
 * @param content - Full file source
 * @param markerLineIndex - 0-based marker line index
 * @param lines - Source split into lines
 * @returns Title + 1-based line, or undefined when adjacency is violated
 */
function findImmediatelyFollowingTest(
  content: string,
  markerLineIndex: number,
  lines: readonly string[],
): FollowingTest | undefined {
  let inBlockComment = false;

  for (let i = markerLineIndex + 1; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const classified = classifyLine(line, inBlockComment);
    inBlockComment = classified.inBlockCommentAfter;

    if (
      classified.kind === 'blank' ||
      classified.kind === 'comment'
    ) {
      continue;
    }

    const trimmed = classified.code.trimStart();
    if (!TEST_CALL_START_RE.test(trimmed)) {
      return undefined;
    }

    return parseTestCallAtLine(content, lines, i);
  }

  return undefined;
}

/** Classification of one source line relative to comment state. */
interface LineClassification {
  readonly kind: 'blank' | 'comment' | 'code';
  /** Non-comment code fragment on this line (may be empty for comment/blank). */
  readonly code: string;
  readonly inBlockCommentAfter: boolean;
}

/**
 * Classify a line as blank, comment-only, or code-bearing.
 *
 * Tracks block comments across lines. A line is `comment` when every
 * non-whitespace character belongs to a line or block comment.
 *
 * @param line - Raw line (no trailing newline)
 * @param inBlockComment - Whether a block comment is open at line start
 * @returns Classification and updated block-comment state
 */
function classifyLine(
  line: string,
  inBlockComment: boolean,
): LineClassification {
  let i = 0;
  let inBlock = inBlockComment;
  let sawCode = false;
  let code = '';

  while (i < line.length) {
    const ch = line[i] ?? '';
    const next = line[i + 1] ?? '';

    if (inBlock) {
      if (ch === '*' && next === '/') {
        inBlock = false;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (ch === '/' && next === '*') {
      inBlock = true;
      i += 2;
      continue;
    }

    if (ch === '/' && next === '/') {
      // Rest of line is a line comment.
      break;
    }

    if (ch === ' ' || ch === '\t' || ch === '\r') {
      if (sawCode) code += ch;
      i += 1;
      continue;
    }

    sawCode = true;
    code += ch;
    i += 1;
  }

  if (!sawCode) {
    return {
      kind: line.trim().length === 0 && !inBlockComment ? 'blank' : 'comment',
      code: '',
      inBlockCommentAfter: inBlock,
    };
  }

  return {
    kind: 'code',
    code,
    inBlockCommentAfter: inBlock,
  };
}

/**
 * Parse the title of an `it`/`test` call that starts on `lineIndex`.
 *
 * @param content - Full file source
 * @param lines - Source split into lines
 * @param lineIndex - 0-based line where the call begins
 * @returns Title + 1-based line, or undefined when the title cannot be read
 */
function parseTestCallAtLine(
  content: string,
  lines: readonly string[],
  lineIndex: number,
): FollowingTest | undefined {
  let offset = 0;
  for (let i = 0; i < lineIndex && i < lines.length; i++) {
    offset += (lines[i] ?? '').length + 1;
  }
  if (offset > content.length) offset = content.length;

  const slice = content.slice(offset);
  const startMatch = /^\s*((?:it|test)(?:\.[A-Za-z]+)*(?:\s*<[^>]*>)?\s*\()/u.exec(
    slice,
  );
  if (startMatch === null || startMatch[1] === undefined) {
    return undefined;
  }

  let cursor = startMatch[0].length;
  const skipped = skipEachTableArgs(slice, cursor);
  if (skipped === undefined) {
    return undefined;
  }
  cursor = skipped;

  const title = readStringLiteral(slice, cursor);
  if (title === undefined) {
    return undefined;
  }

  return { title: title.value, line: lineIndex + 1 };
}

/**
 * After `it.each`, skip a leading `[…])` table argument and the next `(`.
 *
 * For plain `it('…'`, returns the same cursor (caller reads the string).
 *
 * @param source - Slice starting after the marker
 * @param cursor - Position just after the first `(` of the call
 * @returns Cursor at the start of the title argument, or undefined if malformed
 */
function skipEachTableArgs(
  source: string,
  cursor: number,
): number | undefined {
  let i = skipWs(source, cursor);
  if (i >= source.length) return undefined;

  if (source[i] !== '[') {
    return i;
  }

  const afterTable = skipBalanced(source, i, '[', ']');
  if (afterTable === undefined) return undefined;
  i = skipWs(source, afterTable);
  if (source[i] !== ')') return undefined;
  i = skipWs(source, i + 1);
  if (source[i] !== '(') return undefined;
  return skipWs(source, i + 1);
}

/**
 * Read a `'…'` / `"…"` / `` `…` `` string literal at `cursor`.
 *
 * @param source - Source slice
 * @param cursor - Position of the opening quote
 * @returns Unescaped value, or undefined when not a string literal
 */
function readStringLiteral(
  source: string,
  cursor: number,
): { readonly value: string } | undefined {
  const quote = source[cursor];
  if (quote !== "'" && quote !== '"' && quote !== '`') {
    return undefined;
  }

  let i = cursor + 1;
  let value = '';
  while (i < source.length) {
    const ch = source[i] ?? '';
    if (ch === '\\') {
      const next = source[i + 1] ?? '';
      value += next;
      i += 2;
      continue;
    }
    if (ch === quote) {
      return { value };
    }
    // Template literals with `${` are not supported as TC titles.
    if (quote === '`' && ch === '$' && source[i + 1] === '{') {
      return undefined;
    }
    value += ch;
    i += 1;
  }
  return undefined;
}

/**
 * Skip balanced brackets starting at `openIndex` (which must be `open`).
 *
 * @param source - Source text
 * @param openIndex - Index of the opening bracket
 * @param open - Opening bracket char
 * @param close - Closing bracket char
 * @returns Index just after the matching close, or undefined
 */
function skipBalanced(
  source: string,
  openIndex: number,
  open: string,
  close: string,
): number | undefined {
  if (source[openIndex] !== open) return undefined;
  let depth = 0;
  let inString: string | undefined;
  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i] ?? '';
    if (inString !== undefined) {
      if (ch === '\\') {
        i += 1;
        continue;
      }
      if (ch === inString) inString = undefined;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      inString = ch;
      continue;
    }
    if (ch === open) {
      depth += 1;
      continue;
    }
    if (ch === close) {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return undefined;
}

/**
 * @param source - Text
 * @param index - Start index
 * @returns Index of first non-whitespace character at/after `index`
 */
function skipWs(source: string, index: number): number {
  let i = index;
  while (i < source.length) {
    const ch = source[i] ?? '';
    if (ch !== ' ' && ch !== '\t' && ch !== '\n' && ch !== '\r') break;
    i += 1;
  }
  return i;
}

/**
 * @param a - Left evidence
 * @param b - Right evidence
 * @returns Byte-order comparator by file then line
 */
function compareEvidence(
  a: TestContractEvidence,
  b: TestContractEvidence,
): number {
  if (a.file !== b.file) return a.file < b.file ? -1 : 1;
  if (a.line !== b.line) return a.line < b.line ? -1 : 1;
  if (a.contractId === b.contractId) return 0;
  return a.contractId < b.contractId ? -1 : 1;
}

/**
 * @param a - Left warning
 * @param b - Right warning
 * @returns Byte-order comparator by file then line
 */
function compareMarkerWarning(
  a: TestContractMarkerWarning,
  b: TestContractMarkerWarning,
): number {
  if (a.file !== b.file) return a.file < b.file ? -1 : 1;
  if (a.line !== b.line) return a.line < b.line ? -1 : 1;
  return 0;
}
