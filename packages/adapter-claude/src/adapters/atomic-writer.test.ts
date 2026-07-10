import { describe, it, expect } from 'vitest';
import { InMemoryFileSystem } from '@l1dder/core/testing';
import { AtomicWriter } from './atomic-writer.js';
import { generateMarker } from '../domain/marker.js';

describe('AtomicWriter idempotency (Claude)', () => {
  it('skips write when hash unchanged on repeat generation', async () => {
    const fs = new InMemoryFileSystem();
    const writer = new AtomicWriter(fs);
    const projectRoot = '/project';
    const relativePath = '.claude/skills/foo/SKILL.md';
    const content = `${generateMarker('abc123def456')}\n\n# Skill\n`;
    const request = { relativePath, content, hash: 'abc123def456' };

    const first = await writer.writeAll([request], {
      projectRoot,
      force: false,
      dryRun: false,
    });
    expect(first.created).toContain(relativePath);

    const second = await writer.writeAll([request], {
      projectRoot,
      force: false,
      dryRun: false,
    });
    expect(second.skipped).toContain(relativePath);
    expect(second.updated).toHaveLength(0);
  });
});
