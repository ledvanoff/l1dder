/**
 * @l1dder/state/testing — test utilities, fixture factories, in-memory adapters.
 *
 * Import as `import { createTestState, createTestConfig, createTestStateManager } from '@l1dder/state/testing'`.
 *
 * @packageDocumentation
 */

import type { State, Config } from '@l1dder/schemas';
import {
  CURRENT_SCHEMA_VERSION,
  StateSchema,
  ConfigSchema,
} from '@l1dder/schemas';
import {
  FixedClock,
  InMemoryFileSystem,
  NullLogger,
} from '@l1dder/core/testing';
import { stringifyYaml } from '@l1dder/yaml';

import { SoloApprover } from './adapters/solo-approver.js';
import { StateManager } from './state-manager.js';

const DEFAULT_TIMESTAMP = '2026-01-01T00:00:00Z';

/**
 * Create a valid State object with sensible defaults, optionally merged with overrides.
 *
 * Uses `StateSchema.parse()` to ensure the result always passes validation.
 */
export function createTestState(overrides?: Record<string, unknown>): State {
  const base = {
    schema_version: CURRENT_SCHEMA_VERSION,
    project: {
      name: 'test-project',
      stage: 'discovery',
      stage_history: [],
      created_at: DEFAULT_TIMESTAMP,
      updated_at: DEFAULT_TIMESTAMP,
    },
    workflow: {
      current_phase: 'idle',
      current_status: 'in_progress',
      mode: 'main',
      profile: null,
      session: null,
      session_history: [],
      iteration: 0,
      phase_history: [],
      gate_history: [],
    },
    tasks: { items: [] },
    quick_tasks: [],
    knowledge_updates: [],
  };

  return StateSchema.parse(deepMerge(base, overrides ?? {}));
}

/**
 * Create a valid Config object with sensible defaults, optionally merged with overrides.
 *
 * Uses `ConfigSchema.parse()` to ensure the result always passes validation.
 */
export function createTestConfig(
  overrides?: Record<string, unknown>,
): Config {
  return ConfigSchema.parse(overrides ?? {});
}

/**
 * Create a fully-wired StateManager backed by InMemoryFileSystem.
 *
 * Writes state.yml + config.yml into the in-memory FS, then creates a
 * StateManager via the standard `create()` factory. Returns a functional
 * manager ready for testing.
 */
export async function createTestStateManager(
  overrides?: {
    state?: Record<string, unknown>;
    config?: Record<string, unknown>;
  },
): Promise<StateManager> {
  const fs = new InMemoryFileSystem();
  const logger = new NullLogger();
  const clock = new FixedClock(DEFAULT_TIMESTAMP);
  const approver = new SoloApprover(clock);

  const state = createTestState(overrides?.state);
  const config = createTestConfig(overrides?.config);

  const projectDir = '/test-project';
  const l1dderDir = `${projectDir}/.l1dder`;
  await fs.mkdir(l1dderDir);
  await fs.writeFile(`${l1dderDir}/state.yml`, stringifyYaml(state));
  await fs.writeFile(`${l1dderDir}/config.yml`, stringifyYaml(config));

  const result = await StateManager.create(
    { fs, clock, logger, approver },
    { projectDir },
  );

  if (!result.ok) {
    throw new Error(
      `createTestStateManager failed: ${result.error.message}`,
    );
  }

  return result.value;
}

/**
 * Deep merge two objects. Arrays are replaced, not concatenated.
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    const existing = result[key];
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      existing !== null &&
      typeof existing === 'object' &&
      !Array.isArray(existing)
    ) {
      result[key] = deepMerge(
        existing as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}
