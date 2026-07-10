import { describe, expect, it } from 'vitest';
import { IdeAdapterRegistry } from '@l1dder/core';
import type { AIIdeAdapter, AdapterManifest, TransformedInstallFile } from '@l1dder/core';

import { checkIde } from './ide.js';
import type { CliContext } from '../../../context.js';

function makeCtx(): CliContext {
  return { cwd: '/project' } as unknown as CliContext;
}

function stubAdapter(overrides: {
  id: string;
  manifest?: Partial<AdapterManifest>;
  files?: readonly TransformedInstallFile[];
}): AIIdeAdapter {
  const manifest: AdapterManifest = {
    id: overrides.id,
    name: `${overrides.id} IDE`,
    version: 1,
    outputs: { commands: { directory: '.x/commands', filePattern: '{id}.md', frontMatter: [] } },
    marker: '<!-- MANAGED -->',
    managedPrefix: 'l1dder-',
    ...overrides.manifest,
  };

  return {
    id: overrides.id,
    manifest,
    transformForInstall: () => Promise.resolve(overrides.files ?? []),
    generate: () => Promise.resolve({ created: [], updated: [], skipped: [], errors: [] }),
    validate: () => Promise.resolve({ checks: [], passed: true }),
  };
}

function file(source: string): TransformedInstallFile {
  return { path: 'x', hash: 'h', source, content: '', profile: null, target: 'x' };
}

describe('checkIde', () => {
  it('reports ide-empty warn when no adapters are registered', async () => {
    const registry = new IdeAdapterRegistry();
    const checks = await checkIde(makeCtx(), registry);
    expect(checks).toEqual([{ id: 'ide-empty', level: 'warn', message: 'No IDE adapters registered' }]);
  });

  it('passes for a fully-declared adapter whose actual output matches', async () => {
    const registry = new IdeAdapterRegistry();
    registry.register(stubAdapter({ id: 'cursor', files: [file('command:doctor-probe')] }));

    const checks = await checkIde(makeCtx(), registry);
    expect(checks).toEqual([
      { id: 'ide-cursor', level: 'pass', message: 'cursor: manifest complete, declared outputs match actual' },
    ]);
  });

  it('fails when manifest.name is undocumented (equals id)', async () => {
    const registry = new IdeAdapterRegistry();
    registry.register(
      stubAdapter({ id: 'cursor', manifest: { name: 'cursor' }, files: [file('command:doctor-probe')] }),
    );

    const checks = await checkIde(makeCtx(), registry);
    expect(checks[0]?.level).toBe('fail');
    expect(checks[0]?.message).toContain('undocumented');
  });

  it('fails when manifest.outputs is empty', async () => {
    const registry = new IdeAdapterRegistry();
    registry.register(stubAdapter({ id: 'cursor', manifest: { outputs: {} } }));

    const checks = await checkIde(makeCtx(), registry);
    expect(checks[0]?.level).toBe('fail');
    expect(checks[0]?.message).toContain('no output kinds');
  });

  it('fails when a declared output kind produces no matching file (claimed but not delivered)', async () => {
    const registry = new IdeAdapterRegistry();
    registry.register(stubAdapter({ id: 'cursor', files: [] }));

    const checks = await checkIde(makeCtx(), registry);
    expect(checks[0]?.level).toBe('fail');
    expect(checks[0]?.message).toContain('declares "commands" output but transformForInstall() produced none');
  });

  it('fails when transformForInstall produces an undeclared output kind', async () => {
    const registry = new IdeAdapterRegistry();
    registry.register(
      stubAdapter({ id: 'cursor', files: [file('command:doctor-probe'), file('rule:l1dder')] }),
    );

    const checks = await checkIde(makeCtx(), registry);
    expect(checks[0]?.level).toBe('fail');
    expect(checks[0]?.message).toContain('undeclared "rules" output');
  });

  it('produces one record per adapter', async () => {
    const registry = new IdeAdapterRegistry();
    registry.register(stubAdapter({ id: 'cursor', files: [file('command:doctor-probe')] }));
    registry.register(stubAdapter({ id: 'claude', files: [file('command:doctor-probe')] }));

    const checks = await checkIde(makeCtx(), registry);
    expect(checks.map((c) => c.id).sort()).toEqual(['ide-claude', 'ide-cursor']);
  });
});
