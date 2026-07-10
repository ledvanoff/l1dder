import { describe, it, expect } from 'vitest';
import { InMemoryFileSystem } from '@l1dder/core/testing';
import { AtomicWriter, type WriteRequest, type WriteOptions } from './atomic-writer.js';
import { generateMarker } from '../domain/marker.js';

function createWriter(fs: InMemoryFileSystem): AtomicWriter {
  return new AtomicWriter(fs);
}

function createOptions(overrides?: Partial<WriteOptions>): WriteOptions {
  return {
    projectRoot: '/project',
    force: false,
    dryRun: false,
    ...overrides,
  };
}

function createRequest(overrides?: Partial<WriteRequest>): WriteRequest {
  return {
    relativePath: '.cursor/commands/l1dder-specify.md',
    content: `${generateMarker('abc123def456')}\n\n# Specify\n`,
    hash: 'abc123def456',
    ...overrides,
  };
}

describe('AtomicWriter', () => {
  it('creates new file atomically', async () => {
    const fs = new InMemoryFileSystem();
    const writer = createWriter(fs);
    const req = createRequest();
    const report = await writer.writeAll([req], createOptions());

    expect(report.created).toContain(req.relativePath);
    const content = await fs.readFile(`/project/${req.relativePath}`);
    expect(content).toBe(req.content);
  });

  it('skips file with same hash (idempotent)', async () => {
    const fs = new InMemoryFileSystem();
    const writer = createWriter(fs);
    const req = createRequest();

    const absPath = `/project/${req.relativePath}`;
    await fs.writeFile(absPath, req.content);

    const report = await writer.writeAll([req], createOptions());
    expect(report.skipped).toContain(req.relativePath);
    expect(report.created).toHaveLength(0);
    expect(report.updated).toHaveLength(0);
  });

  it('updates file with different hash', async () => {
    const fs = new InMemoryFileSystem();
    const writer = createWriter(fs);

    const absPath = '/project/.cursor/commands/l1dder-specify.md';
    await fs.writeFile(absPath, `${generateMarker('aaa111bbb222')}\n\nOld content\n`);

    const req = createRequest();
    const report = await writer.writeAll([req], createOptions());
    expect(report.updated).toContain(req.relativePath);

    const content = await fs.readFile(absPath);
    expect(content).toBe(req.content);
  });

  it('skips user-owned file (no marker)', async () => {
    const fs = new InMemoryFileSystem();
    const writer = createWriter(fs);

    const absPath = '/project/.cursor/commands/l1dder-specify.md';
    await fs.writeFile(absPath, '# User owned content\n');

    const req = createRequest();
    const report = await writer.writeAll([req], createOptions());
    expect(report.skipped).toContain(req.relativePath);

    const content = await fs.readFile(absPath);
    expect(content).toBe('# User owned content\n');
  });

  it('force overwrites user-owned file', async () => {
    const fs = new InMemoryFileSystem();
    const writer = createWriter(fs);

    const absPath = '/project/.cursor/commands/l1dder-specify.md';
    await fs.writeFile(absPath, '# User owned content\n');

    const req = createRequest();
    const report = await writer.writeAll([req], createOptions({ force: true }));
    expect(report.updated).toContain(req.relativePath);

    const content = await fs.readFile(absPath);
    expect(content).toBe(req.content);
  });

  it('dry-run returns report without writing', async () => {
    const fs = new InMemoryFileSystem();
    const writer = createWriter(fs);
    const req = createRequest();

    const report = await writer.writeAll([req], createOptions({ dryRun: true }));
    expect(report.created).toContain(req.relativePath);

    const exists = await fs.exists(`/project/${req.relativePath}`);
    expect(exists).toBe(false);
  });

  it('continues on per-file error (best-effort)', async () => {
    const fs = new InMemoryFileSystem();
    const failingFs = Object.create(fs) as InMemoryFileSystem;
    let callCount = 0;
    failingFs.rename = (_from: string, _to: string) => {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error('Permission denied'));
      return fs.rename(_from, _to);
    };

    const writer = new AtomicWriter(failingFs);

    const req1 = createRequest({ relativePath: 'file1.md', hash: 'aaa111bbb222' });
    const req2 = createRequest({ relativePath: 'file2.md', hash: 'ccc333ddd444' });

    const report = await writer.writeAll([req1, req2], createOptions());
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0]).toMatchObject({ path: 'file1.md' });
    expect(report.created).toContain('file2.md');
  });

  it('handles multiple creates', async () => {
    const fs = new InMemoryFileSystem();
    const writer = createWriter(fs);

    const requests: WriteRequest[] = [
      createRequest({ relativePath: 'a.md', hash: 'aaa111bbb222' }),
      createRequest({ relativePath: 'b.md', hash: 'ccc333ddd444' }),
      createRequest({ relativePath: 'c.md', hash: 'eee555fff666' }),
    ];

    const report = await writer.writeAll(requests, createOptions());
    expect(report.created).toHaveLength(3);
    expect(report.errors).toHaveLength(0);
  });
});
