import { describe, expect, it } from 'vitest';

import { L1dderError } from '../errors/l1dder-error.js';
import { ToolAlreadyRegisteredError, ToolRegistry } from './registry.js';
import type { Tool, ToolContext } from './tool.js';
import { AdapterRegistry } from '../integrations/adapter.js';
import type { AIIdeAdapter } from '../ports/ide-adapter.js';

function createMockTool(id: string): Tool {
  return {
    meta: { id, name: `Tool ${id}`, description: `Mock tool ${id}`, version: '1.0.0' },
    execute: (_input: unknown, _ctx: ToolContext) => Promise.resolve({}),
  };
}

function createMockAdapter(id: string): AIIdeAdapter {
  return {
    id,
    manifest: {
      id,
      name: `Adapter ${id}`,
      version: 1,
      outputs: {},
      marker: '<!-- L1DDER:MANAGED -->',
      managedPrefix: 'l1dder-',
    },
    transformForInstall: () => Promise.resolve([]),
    generate: () => Promise.resolve({ created: [], updated: [], skipped: [], errors: [] }),
    validate: () => Promise.resolve({ checks: [], passed: true }),
  };
}

describe('ToolRegistry', () => {
  it('starts empty', () => {
    const registry = new ToolRegistry();
    expect(registry.list()).toEqual([]);
  });

  it('registers and retrieves a tool', () => {
    const registry = new ToolRegistry();
    const tool = createMockTool('my-tool');
    registry.register(tool);

    expect(registry.get('my-tool')).toBe(tool);
  });

  it('returns undefined for unknown tool', () => {
    const registry = new ToolRegistry();
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('lists all registered tools', () => {
    const registry = new ToolRegistry();
    registry.register(createMockTool('a'));
    registry.register(createMockTool('b'));

    expect(registry.list()).toHaveLength(2);
  });

  it('throws ToolAlreadyRegisteredError on duplicate', () => {
    const registry = new ToolRegistry();
    const tool = createMockTool('dup');
    registry.register(tool);

    expect(() => {
      registry.register(createMockTool('dup'));
    }).toThrow(ToolAlreadyRegisteredError);
  });

  it('ToolAlreadyRegisteredError is instanceof L1dderError', () => {
    const error = new ToolAlreadyRegisteredError('test');
    expect(error).toBeInstanceOf(L1dderError);
    expect(error.code).toBe('TOOL_ALREADY_REGISTERED');
  });
});

describe('AdapterRegistry', () => {
  it('starts empty', () => {
    const registry = new AdapterRegistry();
    expect(registry.list()).toEqual([]);
  });

  it('registers and retrieves an adapter', () => {
    const registry = new AdapterRegistry();
    const adapter = createMockAdapter('cursor');
    registry.register(adapter);

    expect(registry.get('cursor')).toBe(adapter);
  });

  it('returns undefined for unknown adapter', () => {
    const registry = new AdapterRegistry();
    expect(registry.get('unknown')).toBeUndefined();
  });

  it('lists all registered adapters', () => {
    const registry = new AdapterRegistry();
    registry.register(createMockAdapter('cursor'));
    registry.register(createMockAdapter('claude-code'));

    expect(registry.list()).toHaveLength(2);
  });
});
