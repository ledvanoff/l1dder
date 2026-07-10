import type {
  ClockPort,
  FileSystemPort,
  LoggerPort,
  Result,
  WorkflowPosition,
} from '@l1dder/core';
import {
  CorruptedStateError,
  err,
  ok,
} from '@l1dder/core';
import type { NotInitializedError } from '@l1dder/core';
import type { Config, Decision, SkillRun, SkillVersion, State } from '@l1dder/schemas';
import { DecisionSchema, SkillRunSchema, SkillVersionSchema } from '@l1dder/schemas';
import type { L1dderDocument } from '@l1dder/yaml';

import type { ApproverPort } from './ports/approver-port.js';
import { AtomicWriter } from './io/atomic-writer.js';
import { StateReader } from './io/state-reader.js';
import { StateWriter } from './io/state-writer.js';
import {
  StateInitializer,
  type InitOptions,
} from './io/state-initializer.js';
import {
  TransitionPipeline,
  IdempotencyChecker,
  StageGuard,
  GateEngine,
  PhaseStatusManager,
  RollbackHandler,
  CrashRecovery,
} from './features/transitions/index.js';
import type {
  TransitionRequest,
  TransitionOutcome,
  TransitionPipelineError,
} from './features/transitions/index.js';
import { TaskManager } from './features/tasks/index.js';
import { QuickTaskManager } from './features/quick/index.js';
import type { DriftCheckerPort } from './features/quick/index.js';
import { StageManager } from './features/stage/index.js';

/**
 * Dependencies injected into StateManager via `create()` factory.
 */
export interface StateManagerDeps {
  readonly fs: FileSystemPort;
  readonly clock: ClockPort;
  readonly logger: LoggerPort;
  readonly approver: ApproverPort;
  readonly driftChecker?: DriftCheckerPort;
}

/**
 * Options for StateManager creation.
 */
export interface StateManagerOptions {
  readonly projectDir: string;
}

/**
 * Union of errors that can occur when creating/loading a StateManager.
 */
export type StateManagerLoadError =
  | NotInitializedError
  | CorruptedStateError;

/**
 * Facade for all state operations in L1DDER (SM9).
 *
 * Composition root of `@l1dder/state` — wires I/O layer, transition pipeline,
 * task management, stage management, and quick mode.
 *
 * Created via async `StateManager.create()` factory which loads and validates
 * state.yml + config.yml. Returns a ready-to-use instance.
 *
 * Sub-objects `.transition`, `.task`, `.stage`, `.quick` expose namespaced APIs
 * (stubs in AS-7, wired in AS-8 and AS-9).
 */
export class StateManager {
  private state: State;
  private config: Config;
  private stateDoc: L1dderDocument;
  private configDoc: L1dderDocument;

  private readonly statePath: string;
  private readonly configPath: string;
  private readonly stateWriter: StateWriter;
  private readonly stateInitializer: StateInitializer;
  private readonly deps: StateManagerDeps;

  /** Phase transition pipeline — validates, guards, gates, applies transitions. */
  readonly transition: TransitionFacade;

  /** Task management — CRUD, dependency-aware start, toposort auto-pick. */
  readonly task: TaskManager;

  /** Quick/Fast mode task lifecycle — start, commit, drift detection. */
  readonly quick: QuickTaskManager;

  /** Project Stage management — discovery → delivery → maintenance. */
  readonly stage: StageManager;

  /** Crash recovery — detects and resolves in-flight transition markers. */
  readonly recovery: CrashRecovery;

  private constructor(
    state: State,
    config: Config,
    stateDoc: L1dderDocument,
    configDoc: L1dderDocument,
    statePath: string,
    configPath: string,
    projectDir: string,
    stateWriter: StateWriter,
    stateInitializer: StateInitializer,
    deps: StateManagerDeps,
    transitionPipeline: TransitionPipeline,
    crashRecovery: CrashRecovery,
  ) {
    this.state = state;
    this.config = config;
    this.stateDoc = stateDoc;
    this.configDoc = configDoc;
    this.statePath = statePath;
    this.configPath = configPath;
    this.stateWriter = stateWriter;
    this.stateInitializer = stateInitializer;
    this.deps = deps;
    this.recovery = crashRecovery;

    this.transition = new TransitionFacade(this, transitionPipeline, crashRecovery, deps.clock);
    this.task = new TaskManager(deps.clock, deps.logger);
    this.quick = new QuickTaskManager(deps.clock, deps.logger, deps.driftChecker);
    this.stage = new StageManager(deps.clock, deps.logger, deps.fs, projectDir);
  }

  /**
   * Async factory: loads state.yml + config.yml, validates, returns ready instance.
   *
   * @returns `ok(StateManager)` on success,
   *          `err(NotInitializedError)` if files are missing,
   *          `err(CorruptedStateError)` if files are invalid.
   */
  static async create(
    deps: StateManagerDeps,
    options: StateManagerOptions,
  ): Promise<Result<StateManager, StateManagerLoadError>> {
    const l1dderDir = `${options.projectDir}/.l1dder`;
    const statePath = `${l1dderDir}/state.yml`;
    const configPath = `${l1dderDir}/config.yml`;

    const logger = deps.logger;
    const atomicWriter = new AtomicWriter({ fs: deps.fs, logger });
    const stateWriter = new StateWriter({ atomicWriter, logger });
    const stateReader = new StateReader({ fs: deps.fs, logger });
    const stateInitializer = new StateInitializer({
      stateWriter,
      clock: deps.clock,
      logger,
      fs: deps.fs,
    });

    const stateResult = await stateReader.readState(statePath);
    if (!stateResult.ok) {
      if (stateResult.error.code === 'NOT_INITIALIZED') {
        return err(stateResult.error);
      }
      return err(
        new CorruptedStateError(
          statePath,
          stateResult.error.message,
        ),
      );
    }

    const configResult = await stateReader.readConfig(configPath);
    if (!configResult.ok) {
      if (configResult.error.code === 'NOT_INITIALIZED') {
        return err(configResult.error);
      }
      return err(
        new CorruptedStateError(
          configPath,
          configResult.error.message,
        ),
      );
    }

    // Cleanup orphaned .next files from previous crashes
    await atomicWriter.cleanupOrphaned(l1dderDir);

    // Wire transition pipeline (AS-8)
    const crashRecovery = new CrashRecovery();
    const transitionPipeline = new TransitionPipeline({
      idempotency: new IdempotencyChecker(),
      stageGuard: new StageGuard(logger),
      gateEngine: new GateEngine(deps.approver, logger, deps.clock),
      phaseStatus: new PhaseStatusManager(),
      rollback: new RollbackHandler(),
      clock: deps.clock,
      logger,
    });

    logger.debug('StateManager created', {
      projectDir: options.projectDir,
      phase: stateResult.value.state.workflow.current_phase,
    });

    return ok(
      new StateManager(
        stateResult.value.state,
        configResult.value.config,
        stateResult.value.document,
        configResult.value.document,
        statePath,
        configPath,
        options.projectDir,
        stateWriter,
        stateInitializer,
        deps,
        transitionPipeline,
        crashRecovery,
      ),
    );
  }

  /**
   * Current workflow position snapshot (PM15).
   */
  currentPosition(): WorkflowPosition {
    return {
      phase: this.state.workflow.current_phase,
      status: this.state.workflow.current_status,
      mode: this.state.workflow.mode,
      stage: this.state.project.stage,
      iteration: this.state.workflow.iteration,
    };
  }

  /**
   * Deep-frozen copy of the current state.
   */
  stateSnapshot(): Readonly<State> {
    return structuredClone(this.state);
  }

  /**
   * Deep-frozen copy of the current config.
   */
  configSnapshot(): Readonly<Config> {
    return structuredClone(this.config);
  }

  /**
   * Persist current in-memory state to disk with round-trip comment preservation.
   */
  async save(): Promise<Result<void, CorruptedStateError>> {
    const now = this.deps.clock.now();
    this.state = {
      ...this.state,
      project: { ...this.state.project, updated_at: now },
    };

    return this.stateWriter.writeState(
      this.statePath,
      this.state,
      this.stateDoc,
    );
  }

  /**
   * Initialize a new project (delegates to StateInitializer).
   */
  static async init(
    deps: StateManagerDeps,
    options: InitOptions,
  ): Promise<Result<void, NotInitializedError>> {
    const logger = deps.logger;
    const atomicWriter = new AtomicWriter({ fs: deps.fs, logger });
    const stateWriter = new StateWriter({ atomicWriter, logger });
    const initializer = new StateInitializer({
      stateWriter,
      clock: deps.clock,
      logger,
      fs: deps.fs,
    });

    return initializer.initialize(options);
  }

  /**
   * Atomically update in-memory state and persist to disk in one step.
   *
   * Preferred over manual `_updateState()` + `save()` from external callers.
   * Guarantees no forgotten `save()` calls.
   */
  async applyAndSave(
    updater: (state: State) => State,
  ): Promise<Result<void, CorruptedStateError>> {
    this.state = updater(this.state);
    return this.save();
  }

  /**
   * Record an architectural decision in the Decision Ledger (advisory, append-only).
   *
   * Decisions are intended to be added by the AI specify/plan flow. The `id`
   * and `timestamp` are required; all other fields default per `DecisionSchema`.
   *
   * No CLI is exposed for this in MVP — consumption is via the `addDecision()`
   * API called by the specify/plan agent.
   */
  async addDecision(
    input: Omit<Decision, 'timestamp'>,
  ): Promise<Result<void, CorruptedStateError>> {
    const decision = DecisionSchema.parse({
      ...input,
      timestamp: this.deps.clock.now(),
    });
    return this.applyAndSave((state) => ({
      ...state,
      decisions: [...state.decisions, decision],
    }));
  }

  /**
   * Record a skill activation outcome in the telemetry ledger (E5, advisory,
   * append-only).
   *
   * Intended call site: wherever a skill-driven session/task concludes (CLI
   * or slash-command flow) — recording is deliberately opt-in via this API
   * rather than auto-instrumented at every invocation point (DEC-6-6; see
   * `specs/iter-6-hygiene-sessions/spec.md` OQ-6-2), keeping the write path
   * minimally invasive. Consumed by `l1dder doctor --deep --section skills`.
   */
  async recordSkillRun(
    input: Omit<SkillRun, 'timestamp'>,
  ): Promise<Result<void, CorruptedStateError>> {
    const run = SkillRunSchema.parse({
      ...input,
      timestamp: this.deps.clock.now(),
    });
    return this.applyAndSave((state) => ({
      ...state,
      skillRuns: [...state.skillRuns, run],
    }));
  }

  /**
   * Record a skill content version in the versioning ledger (E5, advisory,
   * append-only). Rollback is out of scope for Iteration 6 (backlog) — this
   * only records `contentHash` history for future drift analysis.
   */
  async recordSkillVersion(
    input: Omit<SkillVersion, 'timestamp'>,
  ): Promise<Result<void, CorruptedStateError>> {
    const version = SkillVersionSchema.parse({
      ...input,
      timestamp: this.deps.clock.now(),
    });
    return this.applyAndSave((state) => ({
      ...state,
      skillVersions: [...state.skillVersions, version],
    }));
  }

  /**
   * Update the in-memory state. Used by sub-objects (transition, task, etc.)
   * to apply mutations that will be persisted on `save()`.
   *
   * @internal — should only be called by feature managers, not external consumers.
   */
  _updateState(updater: (state: State) => State): void {
    this.state = updater(this.state);
  }

  /**
   * Read-only access to current in-memory state for feature managers.
   * @internal
   */
  get _state(): Readonly<State> {
    return this.state;
  }

  /**
   * Read-only access to current in-memory config for feature managers.
   * @internal
   */
  get _config(): Readonly<Config> {
    return this.config;
  }
}

/**
 * Thin facade over TransitionPipeline exposed as `StateManager.transition`.
 *
 * Coordinates: set in-flight marker → persist → execute pipeline → clear marker → persist.
 */
class TransitionFacade {
  private readonly manager: StateManager;
  private readonly pipeline: TransitionPipeline;
  private readonly recovery: CrashRecovery;
  private readonly clock: ClockPort;

  constructor(
    manager: StateManager,
    pipeline: TransitionPipeline,
    recovery: CrashRecovery,
    clock: ClockPort,
  ) {
    this.manager = manager;
    this.pipeline = pipeline;
    this.recovery = recovery;
    this.clock = clock;
  }

  /**
   * Execute a phase transition with crash-safe in-flight marker.
   *
   * Flow:
   * 1. Set `_in_flight_transition` marker + save (crash point #1)
   * 2. Execute pipeline (validate → guard → gate → apply)
   * 3. Clear marker + save (crash point #2 — resolved on next load)
   */
  async execute(
    request: TransitionRequest,
  ): Promise<Result<TransitionOutcome, TransitionPipelineError | CorruptedStateError>> {
    const state = this.manager.stateSnapshot() as State;
    const config = this.manager.configSnapshot() as Config;

    // 1. Set in-flight marker before starting (crash-safety)
    this.manager._updateState((s) =>
      this.recovery.setMarker(
        s,
        s.workflow.current_phase,
        request.to,
        request.actor,
        request.trigger,
        this.clock,
      ),
    );

    if (!request.dryRun) {
      const saveResult = await this.manager.save();
      if (!saveResult.ok) {
        this.manager._updateState((s) => this.recovery.clearMarker(s));
        return err(saveResult.error);
      }
    }

    // 2. Execute transition pipeline
    const result = await this.pipeline.execute(state, config, request);

    if (!result.ok) {
      // Rollback marker on failure
      this.manager._updateState((s) => this.recovery.clearMarker(s));
      if (!request.dryRun) {
        await this.manager.save();
      }
      return err(result.error);
    }

    // 3. Apply new state + clear marker + save
    const newState = this.recovery.clearMarker(result.value.state);
    this.manager._updateState(() => newState);

    if (!request.dryRun) {
      const saveResult = await this.manager.save();
      if (!saveResult.ok) {
        return err(saveResult.error);
      }
    }

    return ok(result.value.outcome);
  }
}
