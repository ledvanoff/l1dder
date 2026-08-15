import { err, ok } from '@l1dder/core';
import type { Result } from '@l1dder/core';
import type { TaskStatus } from '@l1dder/schemas';

/** Stable task id shape accepted by the tasks.md parser (`T-01`…`T-999`). */
const TASK_ID_PATTERN = /^T-\d{2,3}$/;

/** Allowed Status cell values (case-insensitive). */
const TASK_STATUSES = ['pending', 'in_progress', 'done', 'skipped'] as const;

/** Stable error codes produced by the tasks.md parser / writer. */
export type TaskMarkdownErrorCode =
  | 'TASKS_TABLE_MISSING'
  | 'TASKS_COLUMN_MISSING'
  | 'TASKS_INVALID_ID'
  | 'TASKS_DUPLICATE_ID'
  | 'TASKS_UNKNOWN_DEPENDENCY'
  | 'TASKS_INVALID_STATUS'
  | 'TASKS_STATUS_COLUMN_MISSING'
  | 'TASKS_TASK_NOT_FOUND';

/**
 * Structured error from parsing or surgically updating a `tasks.md` document.
 *
 * Callers branch on {@link TaskMarkdownError.code}; `line` is 1-based when
 * the failure is tied to a specific source line.
 */
export interface TaskMarkdownError {
  readonly code: TaskMarkdownErrorCode;
  readonly message: string;
  readonly line?: number;
}

/** One parsed task row from the `## Task List` table. */
export interface ParsedTaskRow {
  readonly id: string;
  readonly title: string;
  readonly depends_on: readonly string[];
  readonly status: TaskStatus;
  /** Zero-based line index of the table row in the source document. */
  readonly lineIndex: number;
}

/** Result of a successful {@link parseTasksMarkdown} call. */
export interface ParsedTasksDocument {
  readonly tasks: readonly ParsedTaskRow[];
}

/**
 * Parse the `## Task List` markdown table from a `specs/<feature>/tasks.md`.
 *
 * Locates the first markdown table after the heading, resolves columns by
 * header name (case-insensitive), and validates ids / dependencies / status.
 * Never throws — failures return a structured {@link TaskMarkdownError}.
 *
 * @param content - Full markdown document text
 */
export function parseTasksMarkdown(
  content: string,
): Result<ParsedTasksDocument, TaskMarkdownError> {
  const lines = splitLines(content);
  const headingIndex = lines.findIndex((line) =>
    /^##\s+Task List\s*$/i.test(line.trim()),
  );
  if (headingIndex < 0) {
    return err({
      code: 'TASKS_TABLE_MISSING',
      message: 'Missing "## Task List" heading in tasks.md',
    });
  }

  const headerLineIndex = findTableHeaderLine(lines, headingIndex + 1);
  if (headerLineIndex < 0) {
    return err({
      code: 'TASKS_TABLE_MISSING',
      message: 'Missing task table after "## Task List"',
      line: headingIndex + 1,
    });
  }

  const headerLine = lines[headerLineIndex];
  if (headerLine === undefined) {
    return err({
      code: 'TASKS_TABLE_MISSING',
      message: 'Missing task table after "## Task List"',
      line: headingIndex + 1,
    });
  }

  const headers = splitTableRow(headerLine).map((cell) => cell.trim());
  const columns = resolveColumns(headers);
  if (!columns.ok) {
    return err({
      ...columns.error,
      line: headerLineIndex + 1,
    });
  }

  const separatorIndex = headerLineIndex + 1;
  const separator = lines[separatorIndex];
  if (separator === undefined || !isSeparatorRow(separator)) {
    return err({
      code: 'TASKS_TABLE_MISSING',
      message: 'Missing markdown table separator after the Task List header',
      line: headerLineIndex + 1,
    });
  }

  const tasks: ParsedTaskRow[] = [];
  const seenIds = new Set<string>();

  for (let i = separatorIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) break;
    if (!line.trim().startsWith('|')) break;
    if (isSeparatorRow(line)) continue;

    const cells = splitTableRow(line);
    const idCell = cells[columns.value.id]?.trim() ?? '';
    const titleCell = cells[columns.value.task]?.trim() ?? '';
    const dependsCell =
      columns.value.dependsOn !== undefined
        ? (cells[columns.value.dependsOn]?.trim() ?? '')
        : '';
    const statusCell =
      columns.value.status !== undefined
        ? (cells[columns.value.status]?.trim() ?? '')
        : '';

    if (!TASK_ID_PATTERN.test(idCell)) {
      return err({
        code: 'TASKS_INVALID_ID',
        message: `Invalid task id "${idCell}" (expected T-NN or T-NNN)`,
        line: i + 1,
      });
    }

    if (seenIds.has(idCell)) {
      return err({
        code: 'TASKS_DUPLICATE_ID',
        message: `Duplicate task id "${idCell}"`,
        line: i + 1,
      });
    }
    seenIds.add(idCell);

    const statusResult = parseStatusCell(statusCell);
    if (!statusResult.ok) {
      return err({
        ...statusResult.error,
        line: i + 1,
      });
    }

    tasks.push({
      id: idCell,
      title: titleCell,
      depends_on: parseDependsOnCell(dependsCell),
      status: statusResult.value,
      lineIndex: i,
    });
  }

  for (const task of tasks) {
    for (const dep of task.depends_on) {
      if (!seenIds.has(dep)) {
        return err({
          code: 'TASKS_UNKNOWN_DEPENDENCY',
          message: `Task "${task.id}" depends on unknown id "${dep}"`,
          line: task.lineIndex + 1,
        });
      }
    }
  }

  return ok({ tasks });
}

/**
 * Replace only the Status cell of the row for `taskId`, preserving every other
 * byte of the document (including padding/alignment and trailing newline style).
 *
 * @param content - Full markdown document text
 * @param taskId - Task id whose Status cell should change
 * @param status - New status value written into the cell
 */
export function setTaskStatusInMarkdown(
  content: string,
  taskId: string,
  status: TaskStatus,
): Result<string, TaskMarkdownError> {
  const parsed = parseTasksMarkdown(content);
  if (!parsed.ok) {
    return parsed;
  }

  const lines = splitLines(content);
  const headingIndex = lines.findIndex((line) =>
    /^##\s+Task List\s*$/i.test(line.trim()),
  );
  const headerLineIndex = findTableHeaderLine(lines, headingIndex + 1);
  if (headerLineIndex < 0) {
    return err({
      code: 'TASKS_TABLE_MISSING',
      message: 'Missing task table after "## Task List"',
    });
  }

  const headerLine = lines[headerLineIndex];
  if (headerLine === undefined) {
    return err({
      code: 'TASKS_TABLE_MISSING',
      message: 'Missing task table after "## Task List"',
    });
  }

  const headers = splitTableRow(headerLine).map((cell) => cell.trim());
  const columns = resolveColumns(headers);
  if (!columns.ok) {
    return err(columns.error);
  }

  if (columns.value.status === undefined) {
    return err({
      code: 'TASKS_STATUS_COLUMN_MISSING',
      message:
        'Task List table has no Status column — add a Status column to the "## Task List" table before updating task status',
      line: headerLineIndex + 1,
    });
  }

  const task = parsed.value.tasks.find((row) => row.id === taskId);
  if (task === undefined) {
    return err({
      code: 'TASKS_TASK_NOT_FOUND',
      message: `Task "${taskId}" not found in "## Task List"`,
    });
  }

  const line = lines[task.lineIndex];
  if (line === undefined) {
    return err({
      code: 'TASKS_TASK_NOT_FOUND',
      message: `Task "${taskId}" not found in "## Task List"`,
    });
  }

  const updatedLine = replaceStatusCell(line, columns.value.status, status);
  const nextLines = [...lines];
  nextLines[task.lineIndex] = updatedLine;

  const endsWithNewline = content.endsWith('\n');
  const joined = nextLines.join('\n');
  return ok(endsWithNewline ? `${joined}\n` : joined);
}

/** Column indexes resolved from the Task List header row. */
interface ResolvedColumns {
  readonly id: number;
  readonly task: number;
  readonly dependsOn?: number;
  readonly status?: number;
}

/**
 * Resolve required/optional Task List columns by header name.
 */
function resolveColumns(
  headers: readonly string[],
): Result<ResolvedColumns, TaskMarkdownError> {
  let id: number | undefined;
  let task: number | undefined;
  let dependsOn: number | undefined;
  let status: number | undefined;

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (header === undefined) continue;
    const key = header.toLowerCase();
    if (key === 'id') {
      id = i;
    } else if (key === 'task') {
      task = i;
    } else if (key === 'depends_on') {
      dependsOn = i;
    } else if (key === 'status') {
      status = i;
    }
  }

  if (id === undefined) {
    return err({
      code: 'TASKS_COLUMN_MISSING',
      message: 'Task List table is missing required column "id"',
    });
  }
  if (task === undefined) {
    return err({
      code: 'TASKS_COLUMN_MISSING',
      message: 'Task List table is missing required column "Task"',
    });
  }

  return ok({
    id,
    task,
    ...(dependsOn !== undefined ? { dependsOn } : {}),
    ...(status !== undefined ? { status } : {}),
  });
}

/**
 * Find the first markdown table header row at or after `fromIndex`.
 */
function findTableHeaderLine(
  lines: readonly string[],
  fromIndex: number,
): number {
  for (let i = fromIndex; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) break;
    const trimmed = line.trim();
    if (trimmed.startsWith('##')) break;
    if (!trimmed.startsWith('|')) continue;
    const next = lines[i + 1];
    if (next !== undefined && isSeparatorRow(next)) {
      return i;
    }
  }
  return -1;
}

/**
 * True when a line is a markdown table separator (`|---|---|`).
 */
function isSeparatorRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|')) return false;
  const cells = splitTableRow(trimmed);
  if (cells.length === 0) return false;
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

/**
 * Split a markdown table row into cell strings (without leading/trailing pipes).
 */
function splitTableRow(line: string): string[] {
  const trimmed = line.trim();
  const withoutEdges = trimmed
    .replace(/^\|/, '')
    .replace(/\|$/, '');
  return withoutEdges.split('|');
}

/**
 * Parse a depends_on cell into task ids.
 *
 * `-`, `—`, or empty means no dependencies.
 */
function parseDependsOnCell(cell: string): string[] {
  const trimmed = cell.trim();
  if (trimmed === '' || trimmed === '-' || trimmed === '—') {
    return [];
  }
  return trimmed
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/**
 * Parse a Status cell; empty defaults to `pending`.
 */
function parseStatusCell(
  cell: string,
): Result<TaskStatus, TaskMarkdownError> {
  const trimmed = cell.trim();
  if (trimmed === '') {
    return ok('pending');
  }
  const normalized = trimmed.toLowerCase();
  if ((TASK_STATUSES as readonly string[]).includes(normalized)) {
    return ok(normalized as TaskStatus);
  }
  return err({
    code: 'TASKS_INVALID_STATUS',
    message: `Invalid Status "${cell}" (allowed: ${TASK_STATUSES.join(' | ')})`,
  });
}

/**
 * Replace the Status cell at `statusIndex` while preserving the rest of the line.
 *
 * Keeps leading/trailing cell whitespace and pads the inner value so the cell
 * width stays the same when the new status is shorter or equal in length.
 */
function replaceStatusCell(
  line: string,
  statusIndex: number,
  status: TaskStatus,
): string {
  const pipes: number[] = [];
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '|') {
      pipes.push(i);
    }
  }

  const left = pipes[statusIndex];
  const right = pipes[statusIndex + 1];
  if (left === undefined || right === undefined) {
    return line;
  }

  const cell = line.slice(left + 1, right);
  const lead = cell.match(/^\s*/)?.[0] ?? '';
  const trail = cell.match(/\s*$/)?.[0] ?? '';
  const innerWidth = Math.max(0, cell.length - lead.length - trail.length);

  const newCell =
    status.length <= innerWidth
      ? `${lead}${status}${' '.repeat(innerWidth - status.length)}${trail}`
      : `${lead}${status}${trail}`;

  return `${line.slice(0, left + 1)}${newCell}${line.slice(right)}`;
}

/**
 * Split document text into lines without dropping a trailing empty line marker.
 *
 * `split('\n')` already yields a trailing empty string when the document ends
 * with `\n`; callers re-join with the original newline style.
 */
function splitLines(content: string): string[] {
  if (content === '') return [''];
  const endsWithNewline = content.endsWith('\n');
  const withoutTrailing = endsWithNewline ? content.slice(0, -1) : content;
  return withoutTrailing.split('\n');
}
