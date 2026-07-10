/**
 * @l1dder/context/testing — test utilities for consuming packages.
 *
 * Exports mock implementations, fixture profiles, and factory helpers.
 *
 * @packageDocumentation
 */

import type { WorkflowPosition, FileSystemPort, ClockPort } from '@l1dder/core';
import { Phase, PhaseStatus, WorkflowMode, ProjectStage } from '@l1dder/core';
import type { ContextConfig } from '@l1dder/schemas';
import type { TokenCounterPort } from './ports/token-counter.js';
import { ContextEngine } from './context-engine.js';
import type { ContextEngineDeps } from './context-engine.js';

// ─── Mock TokenCounter ───

/** Mock token counter that returns text.length / ratio (default 3). */
export class MockTokenCounter implements TokenCounterPort {
  readonly calls: string[] = [];

  constructor(private readonly charsPerToken: number = 3.0) {}

  count(text: string): number {
    this.calls.push(text);
    if (text.length === 0) return 0;
    return Math.ceil(text.length / this.charsPerToken);
  }
}

// ─── Mock FileSystem ───

/** In-memory file system for testing context pipeline. */
export class InMemoryContextFs implements FileSystemPort {
  private readonly files = new Map<string, string>();

  constructor(files?: Record<string, string>) {
    if (files) {
      for (const [path, content] of Object.entries(files)) {
        this.files.set(path, content);
      }
    }
  }

  readFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) {
      return Promise.reject(new Error(`File not found: ${path}`));
    }
    return Promise.resolve(content);
  }

  writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content);
    return Promise.resolve();
  }

  rename(from: string, to: string): Promise<void> {
    const content = this.files.get(from);
    if (content === undefined) return Promise.reject(new Error(`File not found: ${from}`));
    this.files.set(to, content);
    this.files.delete(from);
    return Promise.resolve();
  }

  exists(path: string): Promise<boolean> {
    return Promise.resolve(this.files.has(path));
  }

  stat(path: string): Promise<{ size: number; mtimeMs: number; isFile: boolean; isDirectory: boolean }> {
    const content = this.files.get(path);
    if (content === undefined) return Promise.reject(new Error(`File not found: ${path}`));
    return Promise.resolve({ size: content.length, mtimeMs: Date.now(), isFile: true, isDirectory: false });
  }

  mkdir(_path: string): Promise<void> {
    return Promise.resolve();
  }

  deleteFile(path: string): Promise<void> {
    if (!this.files.has(path)) return Promise.reject(new Error(`File not found: ${path}`));
    this.files.delete(path);
    return Promise.resolve();
  }

  readDir(path: string): Promise<readonly string[]> {
    const prefix = path.endsWith('/') ? path : `${path}/`;
    const entries: string[] = [];
    for (const key of this.files.keys()) {
      if (key.startsWith(prefix)) {
        const rest = key.slice(prefix.length);
        const segment = rest.split('/')[0];
        if (segment && !entries.includes(segment)) {
          entries.push(segment);
        }
      }
    }
    return Promise.resolve(entries);
  }

  removeDir(_path: string): Promise<void> {
    return Promise.resolve();
  }

  /** Add a file to the in-memory FS. */
  addFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  /** Check if a file was written. */
  hasFile(path: string): boolean {
    return this.files.has(path);
  }
}

// ─── Mock Clock ───

/** Fixed clock that returns a predetermined timestamp. */
export class FixedContextClock implements ClockPort {
  constructor(private readonly iso: string = '2026-05-11T12:00:00.000Z') {}

  now(): string {
    return this.iso;
  }
}

// ─── Default test config ───

/** Default ContextConfig for tests. */
export const TEST_CONTEXT_CONFIG: ContextConfig = {
  token_budget: 120_000,
  reserved_tokens: 30_000,
  chars_per_token: 3.0,
  overrides: {},
  extra_files: [],
};

// ─── Fixture positions ───

/** Fixture: IMPLEMENT × delivery position. */
export const IMPLEMENT_DELIVERY: WorkflowPosition = {
  phase: Phase.IMPLEMENT,
  status: PhaseStatus.IN_PROGRESS,
  mode: WorkflowMode.MAIN,
  stage: ProjectStage.DELIVERY,
  iteration: 1,
};

/** Fixture: SPECIFY × discovery position. */
export const SPECIFY_DISCOVERY: WorkflowPosition = {
  phase: Phase.SPECIFY,
  status: PhaseStatus.IN_PROGRESS,
  mode: WorkflowMode.MAIN,
  stage: ProjectStage.DISCOVERY,
  iteration: 1,
};

/** Fixture: IDLE × delivery position. */
export const IDLE_DELIVERY: WorkflowPosition = {
  phase: Phase.IDLE,
  status: PhaseStatus.IN_PROGRESS,
  mode: WorkflowMode.MAIN,
  stage: ProjectStage.DELIVERY,
  iteration: 0,
};

// ─── Factory ───

/** Create a test ContextEngine with optional overrides. */
export function createTestContextEngine(
  overrides?: Partial<ContextEngineDeps>,
): ContextEngine {
  const deps: ContextEngineDeps = {
    fs: overrides?.fs ?? new InMemoryContextFs(),
    clock: overrides?.clock ?? new FixedContextClock(),
    config: overrides?.config ?? TEST_CONTEXT_CONFIG,
    tokenCounter: overrides?.tokenCounter ?? new MockTokenCounter(),
  };
  return ContextEngine.create(deps);
}
