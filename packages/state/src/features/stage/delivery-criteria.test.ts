import { describe, expect, it } from 'vitest';
import { InMemoryFileSystem } from '@l1dder/core/testing';

import { createTestConfig } from '../../testing.js';
import { DeliveryCriteriaChecker, isSkeletonFile } from './delivery-criteria.js';

const PROJECT_ROOT = '/project';

/** Minimal content that passes skeleton check: >200 chars, no skeleton markers. */
const MATURE_SUMMARY = `## Summary\n\n${'x'.repeat(250)}\n\n## Details\n\nFull details here.`;

/** Content that fails skeleton check: summary too short. */
const SKELETON_SUMMARY = `## Summary\n\nTODO: fill this in\n\n## Details\n\nSome details.`;

/** Build an InMemoryFileSystem pre-populated with mapped discovery artifact files. */
function createMatureFs(): InMemoryFileSystem {
  const fs = new InMemoryFileSystem();
  void fs.writeFile(`${PROJECT_ROOT}/knowledge/idea.md`, MATURE_SUMMARY);
  void fs.writeFile(`${PROJECT_ROOT}/knowledge/to-be/architecture.md`, MATURE_SUMMARY);
  void fs.writeFile(`${PROJECT_ROOT}/knowledge/to-be/erd.md`, 'erDiagram\n  User { string id }');
  void fs.writeFile(`${PROJECT_ROOT}/knowledge/to-be/usecases.md`, MATURE_SUMMARY);
  return fs;
}

describe('isSkeletonFile', () => {
  it('returns true when ## Summary is absent', () => {
    expect(isSkeletonFile('# Title\n\nNo summary section here.')).toBe(true);
  });

  it('returns true when Summary is shorter than 200 chars', () => {
    expect(isSkeletonFile('## Summary\n\nToo short.')).toBe(true);
  });

  it('returns true when Summary contains TODO', () => {
    expect(isSkeletonFile(`## Summary\n\nTODO: fill this in. ${'x'.repeat(200)}`)).toBe(true);
  });

  it('returns true when Summary contains TBD', () => {
    expect(isSkeletonFile(`## Summary\n\nTBD. ${'x'.repeat(200)}`)).toBe(true);
  });

  it('returns true when Summary contains placeholder', () => {
    expect(isSkeletonFile(`## Summary\n\nThis is a placeholder. ${'x'.repeat(200)}`)).toBe(true);
  });

  it('returns false for mature Summary (>200 chars, no markers)', () => {
    expect(isSkeletonFile(MATURE_SUMMARY)).toBe(false);
  });
});

describe('DeliveryCriteriaChecker', () => {
  const checker = new DeliveryCriteriaChecker();

  it('returns file evidence criteria with canonical milestone ids (no roadmap)', async () => {
    const fs = createMatureFs();
    const config = createTestConfig();

    const result = await checker.evaluate(fs, PROJECT_ROOT, config);

    expect(checker.allMet(result)).toBe(true);
    const ids = result.map((c) => c.id);
    expect(ids).toContain('idea');
    expect(ids).toContain('product');
    expect(ids).toContain('architecture');
    expect(ids).toContain('data');
    expect(ids).not.toContain('roadmap');
    expect(ids).not.toContain('usecases');
    expect(ids).not.toContain('data_model');
  });

  it('reports product not met when usecases.md is absent', async () => {
    const fs = createMatureFs();
    await fs.deleteFile(`${PROJECT_ROOT}/knowledge/to-be/usecases.md`);
    const config = createTestConfig();

    const result = await checker.evaluate(fs, PROJECT_ROOT, config);

    const product = result.find((c) => c.id === 'product');
    expect(product?.met).toBe(false);
  });

  it('reports data not met when erd.md has no erDiagram', async () => {
    const fs = createMatureFs();
    await fs.writeFile(`${PROJECT_ROOT}/knowledge/to-be/erd.md`, '## Summary\n\nEntity description.');
    const config = createTestConfig();

    const result = await checker.evaluate(fs, PROJECT_ROOT, config);

    const data = result.find((c) => c.id === 'data');
    expect(data?.met).toBe(false);
    expect(data?.detail).toMatch(/erDiagram/i);
  });

  it('reports idea not met when idea.md is a skeleton', async () => {
    const fs = createMatureFs();
    await fs.writeFile(`${PROJECT_ROOT}/knowledge/idea.md`, SKELETON_SUMMARY);
    const config = createTestConfig();

    const result = await checker.evaluate(fs, PROJECT_ROOT, config);

    const idea = result.find((c) => c.id === 'idea');
    expect(idea?.met).toBe(false);
    expect(idea?.detail).toMatch(/skeleton/i);
  });

  it('omits data when require_erd_not_skeleton is false', async () => {
    const fs = createMatureFs();
    const config = createTestConfig({
      stage: { delivery_criteria: { require_erd_not_skeleton: false } },
    });

    const result = await checker.evaluate(fs, PROJECT_ROOT, config);

    expect(result.find((c) => c.id === 'data')).toBeUndefined();
  });
});
