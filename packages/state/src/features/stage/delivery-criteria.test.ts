import { describe, expect, it } from 'vitest';
import { InMemoryFileSystem } from '@l1dder/core/testing';

import { createTestConfig } from '../../testing.js';
import { DeliveryCriteriaChecker, isSkeletonFile } from './delivery-criteria.js';

const PROJECT_ROOT = '/project';

/** Minimal content that passes skeleton check: >200 chars, no skeleton markers. */
const MATURE_SUMMARY = `## Summary\n\n${'x'.repeat(250)}\n\n## Details\n\nFull details here.`;

/** Content that fails skeleton check: summary too short. */
const SKELETON_SUMMARY = `## Summary\n\nTODO: fill this in\n\n## Details\n\nSome details.`;

/** Build an InMemoryFileSystem pre-populated with all mature discovery artifacts. */
function createMatureFs(): InMemoryFileSystem {
  const fs = new InMemoryFileSystem();
  void fs.writeFile(`${PROJECT_ROOT}/knowledge/idea.md`, MATURE_SUMMARY);
  void fs.writeFile(`${PROJECT_ROOT}/knowledge/roadmap.md`, MATURE_SUMMARY);
  void fs.writeFile(`${PROJECT_ROOT}/knowledge/to-be/architecture.md`, MATURE_SUMMARY);
  void fs.writeFile(`${PROJECT_ROOT}/knowledge/to-be/erd.md`, 'erDiagram\n  User { string id }');
  void fs.writeFile(`${PROJECT_ROOT}/knowledge/to-be/usecases.md`, MATURE_SUMMARY);
  void fs.writeFile(`${PROJECT_ROOT}/design/project-stage.md`, '# Stage spec');
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

  describe('evaluate — all milestones met', () => {
    it('returns all criteria met for a fully mature project', async () => {
      const fs = createMatureFs();
      const config = createTestConfig();

      const result = await checker.evaluate(fs, PROJECT_ROOT, config);

      expect(checker.allMet(result)).toBe(true);
      expect(result.every((c) => c.met)).toBe(true);
    });
  });

  describe('evaluate — missing files', () => {
    it('reports idea not met when knowledge/idea.md is absent', async () => {
      const fs = createMatureFs();
      await fs.deleteFile(`${PROJECT_ROOT}/knowledge/idea.md`);
      const config = createTestConfig();

      const result = await checker.evaluate(fs, PROJECT_ROOT, config);

      const idea = result.find((c) => c.id === 'idea');
      expect(idea?.met).toBe(false);
      expect(idea?.detail).toMatch(/not found/i);
    });

    it('reports roadmap not met when knowledge/roadmap.md is absent', async () => {
      const fs = createMatureFs();
      await fs.deleteFile(`${PROJECT_ROOT}/knowledge/roadmap.md`);
      const config = createTestConfig();

      const result = await checker.evaluate(fs, PROJECT_ROOT, config);

      const roadmap = result.find((c) => c.id === 'roadmap');
      expect(roadmap?.met).toBe(false);
    });

    it('reports architecture not met when to-be/architecture.md is absent', async () => {
      const fs = createMatureFs();
      await fs.deleteFile(`${PROJECT_ROOT}/knowledge/to-be/architecture.md`);
      const config = createTestConfig();

      const result = await checker.evaluate(fs, PROJECT_ROOT, config);

      const arch = result.find((c) => c.id === 'architecture');
      expect(arch?.met).toBe(false);
    });

    it('reports usecases not met (no throw) when to-be/usecases.md is absent', async () => {
      const fs = createMatureFs();
      await fs.deleteFile(`${PROJECT_ROOT}/knowledge/to-be/usecases.md`);
      const config = createTestConfig();

      const result = await checker.evaluate(fs, PROJECT_ROOT, config);

      const uc = result.find((c) => c.id === 'usecases');
      expect(uc?.met).toBe(false);
    });
  });

  describe('evaluate — skeleton files', () => {
    it('reports idea not met when idea.md is a skeleton', async () => {
      const fs = createMatureFs();
      await fs.writeFile(`${PROJECT_ROOT}/knowledge/idea.md`, SKELETON_SUMMARY);
      const config = createTestConfig();

      const result = await checker.evaluate(fs, PROJECT_ROOT, config);

      const idea = result.find((c) => c.id === 'idea');
      expect(idea?.met).toBe(false);
      expect(idea?.detail).toMatch(/skeleton/i);
    });

    it('reports architecture not met when architecture.md has no ## Details', async () => {
      const fs = createMatureFs();
      await fs.writeFile(
        `${PROJECT_ROOT}/knowledge/to-be/architecture.md`,
        `## Summary\n\n${'x'.repeat(250)}\n\n## Overview\n\nSome overview.`,
      );
      const config = createTestConfig();

      const result = await checker.evaluate(fs, PROJECT_ROOT, config);

      const arch = result.find((c) => c.id === 'architecture');
      expect(arch?.met).toBe(false);
      expect(arch?.detail).toMatch(/Details/i);
    });
  });

  describe('evaluate — data model (erd)', () => {
    it('reports data model not met when erd.md has no erDiagram', async () => {
      const fs = createMatureFs();
      await fs.writeFile(`${PROJECT_ROOT}/knowledge/to-be/erd.md`, '## Summary\n\nEntity description.');
      const config = createTestConfig();

      const result = await checker.evaluate(fs, PROJECT_ROOT, config);

      const dm = result.find((c) => c.id === 'data_model');
      expect(dm?.met).toBe(false);
      expect(dm?.detail).toMatch(/erDiagram/i);
    });

    it('reports data model met when erd.md contains erDiagram', async () => {
      const fs = createMatureFs();
      const config = createTestConfig();

      const result = await checker.evaluate(fs, PROJECT_ROOT, config);

      const dm = result.find((c) => c.id === 'data_model');
      expect(dm?.met).toBe(true);
    });
  });

  describe('evaluate — design files', () => {
    it('reports design criterion not met when design/ is empty', async () => {
      const fs = createMatureFs();
      await fs.deleteFile(`${PROJECT_ROOT}/design/project-stage.md`);
      const config = createTestConfig();

      const result = await checker.evaluate(fs, PROJECT_ROOT, config);

      const design = result.find((c) => c.id === 'design');
      expect(design?.met).toBe(false);
    });

    it('reports design criterion met when at least min_design_files .md files exist', async () => {
      const fs = createMatureFs();
      const config = createTestConfig();

      const result = await checker.evaluate(fs, PROJECT_ROOT, config);

      const design = result.find((c) => c.id === 'design');
      expect(design?.met).toBe(true);
    });
  });

  describe('evaluate — M2 conditional milestones', () => {
    it('omits erd milestone when require_erd_not_skeleton is false', async () => {
      const fs = createMatureFs();
      const config = createTestConfig({
        stage: { delivery_criteria: { require_erd_not_skeleton: false } },
      });

      const result = await checker.evaluate(fs, PROJECT_ROOT, config);

      const dm = result.find((c) => c.id === 'data_model');
      expect(dm).toBeUndefined();
    });

    it('omits idea milestone when require_idea_not_skeleton is false', async () => {
      const fs = new InMemoryFileSystem();
      const config = createTestConfig({
        stage: { delivery_criteria: { require_idea_not_skeleton: false } },
      });

      const result = await checker.evaluate(fs, PROJECT_ROOT, config);

      expect(result.find((c) => c.id === 'idea')).toBeUndefined();
    });
  });

  describe('allMet', () => {
    it('returns false when any criterion is not met', async () => {
      const fs = new InMemoryFileSystem();
      const config = createTestConfig();

      const result = await checker.evaluate(fs, PROJECT_ROOT, config);

      expect(checker.allMet(result)).toBe(false);
    });

    it('returns true when all criteria are met', async () => {
      const fs = createMatureFs();
      const config = createTestConfig();

      const result = await checker.evaluate(fs, PROJECT_ROOT, config);

      expect(checker.allMet(result)).toBe(true);
    });
  });
});
