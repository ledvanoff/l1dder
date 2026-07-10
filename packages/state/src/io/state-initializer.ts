import type { ClockPort, FileSystemPort, LoggerPort, Result } from '@l1dder/core';
import { NotInitializedError, err, ok } from '@l1dder/core';
import type { Config, State } from '@l1dder/schemas';
import { ConfigSchema, StateSchema } from '@l1dder/schemas';

import type { StateWriter } from './state-writer.js';

/**
 * Dependencies injected into StateInitializer.
 */
export interface StateInitializerDeps {
  readonly stateWriter: StateWriter;
  readonly clock: ClockPort;
  readonly logger: LoggerPort;
  readonly fs: FileSystemPort;
}

/**
 * Options for project initialization.
 */
export interface InitOptions {
  readonly projectDir: string;
  readonly projectName: string;
  readonly brownfield: boolean;
}

/** Error type for initialization failures. */
export type InitError = NotInitializedError;

/**
 * Bootstraps `.l1dder/state.yml` and `config.yml` for new projects (SM8).
 *
 * Greenfield: new project, starts in `discovery` stage at `idle` phase.
 * Brownfield: existing project adopting L1DDER, starts in `delivery` stage.
 */
export class StateInitializer {
  private readonly stateWriter: StateWriter;
  private readonly clock: ClockPort;
  private readonly logger: LoggerPort;
  private readonly fs: FileSystemPort;

  constructor(deps: StateInitializerDeps) {
    this.stateWriter = deps.stateWriter;
    this.clock = deps.clock;
    this.logger = deps.logger;
    this.fs = deps.fs;
  }

  /**
   * Initialize a new L1DDER project.
   *
   * Creates `.l1dder/` directory, `state.yml`, and `config.yml` with
   * appropriate defaults based on greenfield/brownfield mode.
   *
   * @returns `err(NotInitializedError)` if already initialized (message: "already initialized").
   */
  async initialize(
    options: InitOptions,
  ): Promise<Result<void, InitError>> {
    const l1dderDir = `${options.projectDir}/.l1dder`;
    const statePath = `${l1dderDir}/state.yml`;
    const configPath = `${l1dderDir}/config.yml`;

    const alreadyExists = await this.fs.exists(statePath);
    if (alreadyExists) {
      return err(
        new NotInitializedError(
          `${options.projectDir} — already initialized`,
        ),
      );
    }

    await this.fs.mkdir(l1dderDir);

    const now = this.clock.now();
    const state = this.createDefaultState(options, now);
    const config = this.createDefaultConfig();

    const stateResult = await this.stateWriter.writeState(statePath, state);
    if (!stateResult.ok) {
      return err(
        new NotInitializedError(
          `${options.projectDir} — failed to write state.yml`,
        ),
      );
    }

    const configResult = await this.stateWriter.writeConfig(
      configPath,
      config,
    );
    if (!configResult.ok) {
      return err(
        new NotInitializedError(
          `${options.projectDir} — failed to write config.yml`,
        ),
      );
    }

    this.logger.info('Project initialized', {
      projectDir: options.projectDir,
      brownfield: options.brownfield,
    });
    return ok(undefined);
  }

  /**
   * Check whether `.l1dder/state.yml` exists in the given directory.
   */
  async isInitialized(projectDir: string): Promise<boolean> {
    return this.fs.exists(`${projectDir}/.l1dder/state.yml`);
  }

  private createDefaultState(options: InitOptions, now: string): State {
    const stage = options.brownfield ? 'delivery' : 'discovery';
    const stageHistory = options.brownfield
      ? [{ from: 'discovery' as const, to: 'delivery' as const, timestamp: now, reason: 'Brownfield initialization' }]
      : [];

    return StateSchema.parse({
      schema_version: 1,
      project: {
        name: options.projectName,
        stage,
        stage_history: stageHistory,
        created_at: now,
        updated_at: now,
      },
      workflow: {
        current_phase: 'idle',
        current_status: 'in_progress',
        mode: 'main',
        iteration: 0,
        phase_history: [],
        gate_history: [],
      },
      tasks: { items: [] },
      quick_tasks: [],
      knowledge_updates: [],
    });
  }

  private createDefaultConfig(): Config {
    return ConfigSchema.parse({});
  }
}
