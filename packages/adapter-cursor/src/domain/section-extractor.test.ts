import { describe, expect, it } from 'vitest';

import { extractSkillSections } from './section-extractor.js';

describe('extractSkillSections', () => {
  it('extracts all supported sections', () => {
    const sections = extractSkillSections(`# Demo

## Summary

Short summary.

## When to Use

- During planning

## Steps

1. First
2. Second

## Validation

- Output exists

## Output

- specs/current/spec.md

## Notes

Keep it deterministic.
`);

    expect(sections).toEqual({
      summary: 'Short summary.',
      whenToUse: '- During planning',
      steps: '1. First\n2. Second',
      validation: '- Output exists',
      output: '- specs/current/spec.md',
      notes: 'Keep it deterministic.',
    });
  });

  it('ignores unsupported headings', () => {
    const sections = extractSkillSections(`## Summary

Summary text.

## Examples

Ignored section.

## Steps

1. Keep supported sections only.
`);

    expect(sections).toEqual({
      summary: 'Summary text.',
      steps: '1. Keep supported sections only.',
    });
  });

  it('matches headings case-insensitively', () => {
    const sections = extractSkillSections(`## SUMMARY

Uppercase summary.

## when to use

Lowercase section.
`);

    expect(sections.summary).toBe('Uppercase summary.');
    expect(sections.whenToUse).toBe('Lowercase section.');
  });

  it('returns empty object when no known sections exist', () => {
    const sections = extractSkillSections(`# Title

Plain markdown without H2 skill sections.
`);

    expect(sections).toEqual({});
  });

  it('trims section bodies without removing inner formatting', () => {
    const sections = extractSkillSections(`## Steps

1. First

2. Second

   - nested note
`);

    expect(sections.steps).toBe('1. First\n\n2. Second\n\n   - nested note');
  });

  it('uses the last occurrence when a section repeats', () => {
    const sections = extractSkillSections(`## Summary

Old summary.

## Steps

1. Do work

## Summary

Current summary.
`);

    expect(sections.summary).toBe('Current summary.');
    expect(sections.steps).toBe('1. Do work');
  });
});
