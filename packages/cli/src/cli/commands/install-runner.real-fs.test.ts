import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { NullLogger } from '@l1dder/core/testing';
import type {
  AdapterContext,
  AdapterManifest,
  AIIdeAdapter,
  GenerationReport,
  TransformedInstallFile,
  ValidationReport,
} from '@l1dder/core';

import { createNodeFs } from '../adapters/node-fs.js';
import { runTargetInstall } from './install-runner.js';

const NOW = '2026-01-15T10:00:00Z';
const fixedClock = { now: () => NOW };

const fakeManifest: AdapterManifest = {
  id: 'fake',
  name: 'Fake Adapter',
  version: 1,
  outputs: {
    skills: { directory: '.fake/skills', structure: '{skill-id}/SKILL.md' },
  },
  marker: '<!-- L1DDER:MANAGED hash:{hash} -->',
  managedPrefix: 'l1dder-',
};

function makeFakeAdapter(transformed: readonly TransformedInstallFile[]): AIIdeAdapter {
  return {
    id: 'fake',
    manifest: fakeManifest,
    transformForInstall: () => Promise.resolve(transformed),
    generate: (): Promise<GenerationReport> => Promise.reject(new Error('not used in this test')),
    validate: (): Promise<ValidationReport> => Promise.reject(new Error('not used in this test')),
  };
}

const adapterCtx = {} as unknown as AdapterContext;

function installStateYaml(entries: { path: string; hash: string }[]): string {
  const items = entries
    .map(
      (e) =>
        `    - path: "${e.path}"\n      hash: "${e.hash}"\n      source: built-in\n      profile: null\n      target: fake\n      timestamp: "${NOW}"`,
    )
    .join('\n');
  return `schema_version: 1\ntargets:\n  fake:\n${items}\n`;
}

/**
 * `install-runner.test.ts` covers `sync --prune`'s empty-parent-dir cleanup
 * (T-10) against `InMemoryFileSystem`. This suite (T-13) re-runs the same
 * scenario through the production Node `FileSystemPort` (`createNodeFs`)
 * against a real temporary directory, so the real `fs.promises.rmdir` /
 * `fs.promises.unlink` calls exercised by `runTargetInstall` are validated
 * end-to-end, not just their in-memory stand-ins.
 */
describe('runTargetInstall — prune empty-dir cleanup against the real filesystem (T-13)', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'l1dder-install-runner-real-fs-'));
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('removes the orphaned skill file and its now-empty directory from real disk', async () => {
    const fs = createNodeFs();

    mkdirSync(join(projectRoot, '.l1dder'), { recursive: true });
    writeFileSync(
      join(projectRoot, '.l1dder', 'install-state.yml'),
      installStateYaml([{ path: '.fake/skills/old-skill/SKILL.md', hash: 'old-hash' }]),
    );
    mkdirSync(join(projectRoot, '.fake', 'skills', 'old-skill'), { recursive: true });
    writeFileSync(join(projectRoot, '.fake', 'skills', 'old-skill', 'SKILL.md'), '# stale skill');

    const result = await runTargetInstall(
      { fs, logger: new NullLogger(), clock: fixedClock },
      {
        projectRoot,
        targetId: 'fake',
        adapter: makeFakeAdapter([]),
        adapterCtx,
        force: false,
        dryRun: false,
        prune: true,
      },
    );

    expect(result.pruned).toContain('.fake/skills/old-skill/SKILL.md');
    expect(result.errors).toHaveLength(0);
    expect(existsSync(join(projectRoot, '.fake', 'skills', 'old-skill', 'SKILL.md'))).toBe(false);
    expect(existsSync(join(projectRoot, '.fake', 'skills', 'old-skill'))).toBe(false);
  });

  it('keeps the shared parent directory when a sibling skill is still managed', async () => {
    const fs = createNodeFs();

    mkdirSync(join(projectRoot, '.l1dder'), { recursive: true });
    writeFileSync(
      join(projectRoot, '.l1dder', 'install-state.yml'),
      installStateYaml([
        { path: '.fake/skills/old-skill/SKILL.md', hash: 'old-hash' },
        { path: '.fake/skills/keep-skill/SKILL.md', hash: 'keep-hash' },
      ]),
    );
    mkdirSync(join(projectRoot, '.fake', 'skills', 'old-skill'), { recursive: true });
    writeFileSync(join(projectRoot, '.fake', 'skills', 'old-skill', 'SKILL.md'), '# stale skill');
    mkdirSync(join(projectRoot, '.fake', 'skills', 'keep-skill'), { recursive: true });
    writeFileSync(join(projectRoot, '.fake', 'skills', 'keep-skill', 'SKILL.md'), '# kept skill');

    const keptFile: TransformedInstallFile = {
      path: '.fake/skills/keep-skill/SKILL.md',
      hash: 'keep-hash',
      source: 'built-in',
      content: '# kept skill',
      profile: null,
      target: 'fake',
    };

    const result = await runTargetInstall(
      { fs, logger: new NullLogger(), clock: fixedClock },
      {
        projectRoot,
        targetId: 'fake',
        adapter: makeFakeAdapter([keptFile]),
        adapterCtx,
        force: false,
        dryRun: false,
        prune: true,
      },
    );

    expect(result.pruned).toContain('.fake/skills/old-skill/SKILL.md');
    expect(existsSync(join(projectRoot, '.fake', 'skills', 'old-skill'))).toBe(false);
    expect(existsSync(join(projectRoot, '.fake', 'skills'))).toBe(true);
    expect(existsSync(join(projectRoot, '.fake', 'skills', 'keep-skill', 'SKILL.md'))).toBe(true);
  });
});
