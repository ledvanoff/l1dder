import { describe, expect, it } from 'vitest';
import { InMemoryFileSystem, NullLogger } from '@l1dder/core/testing';
import { stringifyYaml } from '@l1dder/yaml';

import { AtomicWriter } from './atomic-writer.js';
import {
  DEFAULT_INSTALL_STATE,
  InstallStateReader,
  InstallStateWriter,
} from './install-state-io.js';

function createIo(fs?: InMemoryFileSystem) {
  const fileSystem = fs ?? new InMemoryFileSystem();
  const logger = new NullLogger();
  const atomicWriter = new AtomicWriter({ fs: fileSystem, logger });
  const reader = new InstallStateReader({ fs: fileSystem, logger });
  const writer = new InstallStateWriter({ atomicWriter, logger });
  return { reader, writer, fs: fileSystem };
}

const SAMPLE_STATE = {
  schema_version: 1 as const,
  targets: {
    cursor: [
      {
        path: '.cursor/rules/l1dder.mdc',
        hash: 'abc123',
        source: 'rule:l1dder',
        profile: null,
        target: 'cursor',
        timestamp: '2026-06-29T00:00:00Z',
      },
    ],
  },
};

describe('InstallStateReader', () => {
  it('returns default install-state when file is missing', async () => {
    const { reader } = createIo();
    const result = await reader.read('/project/.l1dder/install-state.yml');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(DEFAULT_INSTALL_STATE);
    }
  });

  it('round-trips written install-state', async () => {
    const { reader, writer } = createIo();
    const path = '/project/.l1dder/install-state.yml';

    const writeResult = await writer.write(path, SAMPLE_STATE);
    expect(writeResult.ok).toBe(true);

    const readResult = await reader.read(path);
    expect(readResult.ok).toBe(true);
    if (readResult.ok) {
      expect(readResult.value).toEqual(SAMPLE_STATE);
    }
  });

  it('returns err when YAML is corrupted', async () => {
    const fs = new InMemoryFileSystem();
    const path = '/project/.l1dder/install-state.yml';
    await fs.writeFile(path, '{ invalid yaml: [');

    const { reader } = createIo(fs);
    const result = await reader.read(path);
    expect(result.ok).toBe(false);
  });
});

describe('InstallStateWriter', () => {
  it('writes valid YAML that reader can parse', async () => {
    const fs = new InMemoryFileSystem();
    const { writer } = createIo(fs);
    const path = '/project/.l1dder/install-state.yml';

    await writer.write(path, SAMPLE_STATE);
    const raw = await fs.readFile(path);
    expect(raw).toBe(stringifyYaml(SAMPLE_STATE));
  });
});
