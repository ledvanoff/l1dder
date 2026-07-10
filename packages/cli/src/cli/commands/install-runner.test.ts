import { describe, expect, it } from 'vitest';

import { InMemoryFileSystem, FixedClock, NullLogger } from '@l1dder/core/testing';
import type {
  AdapterContext,
  AdapterManifest,
  AIIdeAdapter,
  GenerationReport,
  TransformedInstallFile,
  ValidationReport,
} from '@l1dder/core';

import { runTargetInstall } from './install-runner.js';

const NOW = '2026-01-15T10:00:00Z';

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

/** Minimal adapter stub — only `transformForInstall` is exercised by `runTargetInstall`. */
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

describe('runTargetInstall — prune empty-dir cleanup (T-10)', () => {
  it('removes the skill directory left empty after pruning its only managed file', async () => {
    const fs = new InMemoryFileSystem();
    const projectRoot = '/project';

    await fs.writeFile(
      `${projectRoot}/.l1dder/install-state.yml`,
      installStateYaml([{ path: '.fake/skills/old-skill/SKILL.md', hash: 'old-hash' }]),
    );
    await fs.writeFile(`${projectRoot}/.fake/skills/old-skill/SKILL.md`, '# stale skill');

    const result = await runTargetInstall(
      { fs, logger: new NullLogger(), clock: new FixedClock(NOW) },
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
    expect(await fs.exists(`${projectRoot}/.fake/skills/old-skill/SKILL.md`)).toBe(false);
    expect(await fs.exists(`${projectRoot}/.fake/skills/old-skill`)).toBe(false);
  });

  it('does not remove a parent directory that still holds another managed skill', async () => {
    const fs = new InMemoryFileSystem();
    const projectRoot = '/project';

    await fs.writeFile(
      `${projectRoot}/.l1dder/install-state.yml`,
      installStateYaml([
        { path: '.fake/skills/old-skill/SKILL.md', hash: 'old-hash' },
        { path: '.fake/skills/keep-skill/SKILL.md', hash: 'keep-hash' },
      ]),
    );
    await fs.writeFile(`${projectRoot}/.fake/skills/old-skill/SKILL.md`, '# stale skill');
    await fs.writeFile(`${projectRoot}/.fake/skills/keep-skill/SKILL.md`, '# kept skill');

    const keptFile: TransformedInstallFile = {
      path: '.fake/skills/keep-skill/SKILL.md',
      hash: 'keep-hash',
      source: 'built-in',
      content: '# kept skill',
      profile: null,
      target: 'fake',
    };

    const result = await runTargetInstall(
      { fs, logger: new NullLogger(), clock: new FixedClock(NOW) },
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
    // The orphaned skill's own directory is removed...
    expect(await fs.exists(`${projectRoot}/.fake/skills/old-skill`)).toBe(false);
    // ...but the shared parent stays, since the other skill is still managed there.
    expect(await fs.exists(`${projectRoot}/.fake/skills`)).toBe(true);
    expect(await fs.exists(`${projectRoot}/.fake/skills/keep-skill/SKILL.md`)).toBe(true);
  });

  it('does not clean up empty directories in dry-run mode', async () => {
    const fs = new InMemoryFileSystem();
    const projectRoot = '/project';

    await fs.writeFile(
      `${projectRoot}/.l1dder/install-state.yml`,
      installStateYaml([{ path: '.fake/skills/old-skill/SKILL.md', hash: 'old-hash' }]),
    );
    await fs.writeFile(`${projectRoot}/.fake/skills/old-skill/SKILL.md`, '# stale skill');

    const result = await runTargetInstall(
      { fs, logger: new NullLogger(), clock: new FixedClock(NOW) },
      {
        projectRoot,
        targetId: 'fake',
        adapter: makeFakeAdapter([]),
        adapterCtx,
        force: false,
        dryRun: true,
        prune: true,
      },
    );

    expect(result.orphaned).toContain('.fake/skills/old-skill/SKILL.md');
    expect(result.pruned).toHaveLength(0);
    expect(await fs.exists(`${projectRoot}/.fake/skills/old-skill/SKILL.md`)).toBe(true);
  });
});
