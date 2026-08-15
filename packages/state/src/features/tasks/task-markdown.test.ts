import { describe, expect, it } from 'vitest';

import {
  parseTasksMarkdown,
  setTaskStatusInMarkdown,
} from './task-markdown.js';

const SAMPLE = `# Feature — Tasks

## Summary

Four tasks.

## Task List

| id | Task | depends_on | Complexity | Status |
|----|------|------------|------------|--------|
| T-01 | Scaffolding | — | S | pending |
| T-02 | Domain layer | T-01 | M | pending |
| T-03 | CLI layer | T-01 | M | in_progress |
| T-04 | Integration | T-02, T-03 | L | done |

## Task Details
`;

describe('parseTasksMarkdown', () => {
  it('parses the Task List table with ids, titles, depends_on, and status', () => {
    const result = parseTasksMarkdown(SAMPLE);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tasks).toHaveLength(4);
    expect(result.value.tasks[0]).toMatchObject({
      id: 'T-01',
      title: 'Scaffolding',
      depends_on: [],
      status: 'pending',
    });
    expect(result.value.tasks[1]).toMatchObject({
      id: 'T-02',
      depends_on: ['T-01'],
      status: 'pending',
    });
    expect(result.value.tasks[3]).toMatchObject({
      id: 'T-04',
      depends_on: ['T-02', 'T-03'],
      status: 'done',
    });
    expect(result.value.tasks[0]?.lineIndex).toBeGreaterThan(0);
  });

  it('treats a unicode em-dash depends_on cell as no dependencies', () => {
    const content = `## Task List

| id | Task | depends_on | Status |
|----|------|------------|--------|
| T-01 | Alone | — | pending |
`;
    const result = parseTasksMarkdown(content);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tasks[0]?.depends_on).toEqual([]);
  });

  it('defaults status to pending and depends_on to [] when those columns are absent', () => {
    const content = `## Task List

| id | Task |
|----|------|
| T-01 | Only required columns |
`;
    const result = parseTasksMarkdown(content);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tasks[0]).toMatchObject({
      id: 'T-01',
      depends_on: [],
      status: 'pending',
    });
  });

  it('returns err TASKS_TABLE_MISSING when the heading is absent', () => {
    const result = parseTasksMarkdown('# No task list here\n');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('TASKS_TABLE_MISSING');
  });

  it('returns err TASKS_COLUMN_MISSING when the Task column is absent', () => {
    const content = `## Task List

| id | Status |
|----|--------|
| T-01 | pending |
`;
    const result = parseTasksMarkdown(content);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('TASKS_COLUMN_MISSING');
  });

  it('returns err TASKS_INVALID_ID for a non T-NN id', () => {
    const content = `## Task List

| id | Task | Status |
|----|------|--------|
| X-01 | Bad | pending |
`;
    const result = parseTasksMarkdown(content);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('TASKS_INVALID_ID');
    expect(result.error.line).toBe(5);
  });

  it('returns err TASKS_DUPLICATE_ID when the same id appears twice', () => {
    const content = `## Task List

| id | Task | Status |
|----|------|--------|
| T-01 | First | pending |
| T-01 | Dup | pending |
`;
    const result = parseTasksMarkdown(content);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('TASKS_DUPLICATE_ID');
  });

  it('returns err TASKS_UNKNOWN_DEPENDENCY when depends_on references a missing id', () => {
    const content = `## Task List

| id | Task | depends_on | Status |
|----|------|------------|--------|
| T-01 | Alone | T-99 | pending |
`;
    const result = parseTasksMarkdown(content);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('TASKS_UNKNOWN_DEPENDENCY');
  });

  it('returns err TASKS_INVALID_STATUS with allowed values in the message', () => {
    const content = `## Task List

| id | Task | Status |
|----|------|--------|
| T-01 | Bad status | blocked |
`;
    const result = parseTasksMarkdown(content);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('TASKS_INVALID_STATUS');
    expect(result.error.message).toContain('pending');
    expect(result.error.message).toContain('skipped');
  });
});

describe('setTaskStatusInMarkdown', () => {
  it('returns err TASKS_STATUS_COLUMN_MISSING when the table has no Status column', () => {
    const content = `## Task List

| id | Task | depends_on |
|----|------|------------|
| T-01 | Alone | — |
`;
    const result = setTaskStatusInMarkdown(content, 'T-01', 'done');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('TASKS_STATUS_COLUMN_MISSING');
    expect(result.error.message).toContain('Status');
  });

  it('returns err TASKS_TASK_NOT_FOUND when the id is absent', () => {
    const result = setTaskStatusInMarkdown(SAMPLE, 'T-99', 'done');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('TASKS_TASK_NOT_FOUND');
  });

  it('changes exactly one Status cell and preserves every other byte', () => {
    const result = setTaskStatusInMarkdown(SAMPLE, 'T-02', 'done');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).not.toBe(SAMPLE);
    expect(result.value.includes('| T-02 | Domain layer | T-01 | M | done')).toBe(
      true,
    );

    // Reconstruct expected by replacing only that cell's status token.
    const expected = SAMPLE.replace(
      '| T-02 | Domain layer | T-01 | M | pending |',
      '| T-02 | Domain layer | T-01 | M | done    |',
    );
    expect(result.value).toBe(expected);
  });
});
