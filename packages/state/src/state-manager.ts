import type {
  ClockPort,
  FileSystemPort,
  LoggerPort,
  Result,
  WorkflowPosition,
  WorkflowProfileId,
} from '@l1dder/core';
import { err, ok } from '@l1dder/core';
import type {
  CorruptedStateError,
  NotInitializedError,
  SchemaValidationError,
} from '@l1dder/core';
import type {
  AgentSessionRecord,
  Config,
  Decision,
  DiscoveryMilestone,
  DiscoveryMilestoneId,
  SkillRun,
  SkillVersion,
  State,
} from '@l1dder/schemas';
import { DecisionSchema, SkillRunSchema, SkillVersionSchema } from '@l1dder/schemas';
import type { L1dderDocument } from '@l1dder/yaml';

import type { ApproverPort } from './ports/approver-port.js';
import type { GateConditionPort } from './ports/gate-condition-port.js';
import { NoopGateConditions } from './ports/gate-condition-port.js';
import { AtomicWriter } from './io/atomic-writer.js';
import { StateLoader } from './io/state-loader.js';
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
import {
  DiscoveryOrchestrator,
  WorkflowProfileService,
} from './features/discovery/index.js';
import type {
  DiscoveryOrchestratorError,
  MilestoneBlocker,
  PlanMilestoneInput,
  WaiveMilestoneInput,
} from './features/discovery/index.js';
import {
  EmptyDeliveryRailIndex,
  WorkflowProjectionService,
  type DebtBacklogIndexPort,
  type DeliveryRailIndexPort,
  type ReadinessEvidencePort,
  type WorkflowProjection,
} from './features/projection/index.js';
import {
  SessionService,
  type SessionEndError,
  type SessionEndInput,
  type SessionServiceError,
  type SessionStartForceOptions,
} from './features/session/index.js';

/**
 * Dependencies injected into StateManager via `create()` factory.
 */
export interface StateManagerDeps {
  readonly fs: FileSystemPort;
  readonly clock: ClockPort;
  readonly logger: LoggerPort;
  readonly approver: ApproverPort;
  readonly driftChecker?: DriftCheckerPort;
  /** Optional debt/backlog index for advisory planning candidates (HARD-4). */
  readonly debtBacklog?: DebtBacklogIndexPort;
  /** Optional READY evidence collector (HARD-4). */
  readonly readiness?: ReadinessEvidencePort;
  /** Optional delivery-rail index for session start / projection (HARD-5). */
  readonly deliveryRails?: DeliveryRailIndexPort;
  /**
   * Optional gate pre-conditions (fail-closed task checks, etc.).
   * Defaults to {@link NoopGateConditions}.
   */
  readonly conditions?: GateConditionPort;
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
  | SchemaValidationError
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
 * Sub-objects `.transition`, `.task`, `.stage`, `.quick`, `.profile`,
 * `.discovery`, `.projection`, `.session` expose namespaced APIs.
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

  /**
   * Explicit workflow profile selection — never infers a profile silently.
   *
   * Use `select` / `clear` to persist; `recommended` is advisory only.
   */
  readonly profile: ProfileFacade;

  /**
   * Discovery milestone mutations and reads — delegates to {@link DiscoveryOrchestrator}.
   *
   * Rejected mutations leave `state.yml` untouched.
   */
  readonly discovery: DiscoveryFacade;

  /**
   * Read-only workflow projection — the single checklist / next-action source.
   */
  readonly projection: ProjectionFacade;

  /**
   * Agent Session start/end against delivery rails — persists only on success.
   */
  readonly session: SessionFacade;

  /** Crash recovery — detects and resolves in-flight transition markers. */
  readonly recovery: CrashRecovery;

  private constructor(
    state: State,
    config: Config,
    stateDoc: L1dderDocument,
    configDoc: L1dderDocument,
    statePath: string,
    configPath: string,
    _projectDir: string,
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

    const orchestrator = new DiscoveryOrchestrator(deps.clock);
    const deliveryRails = deps.deliveryRails ?? new EmptyDeliveryRailIndex();
    const projectionService = new WorkflowProjectionService({
      clock: deps.clock,
      orchestrator,
      ...(deps.debtBacklog !== undefined ? { debtBacklog: deps.debtBacklog } : {}),
      ...(deps.readiness !== undefined ? { readiness: deps.readiness } : {}),
      deliveryRails,
    });

    this.transition = new TransitionFacade(this, transitionPipeline, crashRecovery, deps.clock);
    this.task = new TaskManager(deps.clock, deps.logger);
    this.quick = new QuickTaskManager(deps.clock, deps.logger, deps.driftChecker);
    this.stage = new StageManager(deps.clock, deps.logger, orchestrator);
    this.profile = new ProfileFacade(this, new WorkflowProfileService());
    this.discovery = new DiscoveryFacade(this, orchestrator);
    this.projection = new ProjectionFacade(this, projectionService);
    this.session = new SessionFacade(
      this,
      new SessionService({ clock: deps.clock }),
      deliveryRails,
    );
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
    const stateLoader = new StateLoader({ fs: deps.fs, logger });
    const stateInitializer = new StateInitializer({
      stateWriter,
      clock: deps.clock,
      logger,
      fs: deps.fs,
    });

    const stateResult = await stateLoader.load(statePath);
    if (!stateResult.ok) {
      // Preserve SchemaValidationError so CLI/doctor can surface Zod path+message
      // (DF-002/028). Do not wrap into CorruptedStateError.
      return err(stateResult.error);
    }

    if (stateResult.value.migrated) {
      logger.info('Loaded state after schema migration', {
        statePath,
        schema_version: stateResult.value.state.schema_version,
        backupPath: stateResult.value.backupPath,
      });
    }

    const configResult = await stateReader.readConfig(configPath);
    if (!configResult.ok) {
      return err(configResult.error);
    }

    // Cleanup orphaned .next files from previous crashes
    await atomicWriter.cleanupOrphaned(l1dderDir);

    // Wire transition pipeline (AS-8)
    const crashRecovery = new CrashRecovery();
    const conditions = deps.conditions ?? new NoopGateConditions();
    const transitionPipeline = new TransitionPipeline({
      idempotency: new IdempotencyChecker(),
      stageGuard: new StageGuard(logger),
      gateEngine: new GateEngine(deps.approver, logger, deps.clock, conditions),
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
 * Thin facade over {@link SessionService} exposed as `StateManager.session`.
 *
 * Loads delivery rails from the injected index and persists only on success.
 */
class SessionFacade {
  private readonly manager: StateManager;
  private readonly service: SessionService;
  private readonly deliveryRails: DeliveryRailIndexPort;

  constructor(
    manager: StateManager,
    service: SessionService,
    deliveryRails: DeliveryRailIndexPort,
  ) {
    this.manager = manager;
    this.service = service;
    this.deliveryRails = deliveryRails;
  }

  /**
   * Start an Agent Session and persist `workflow.session` on success.
   *
   * @param sessionId - Requested session id (e.g. `HARD-5`)
   * @param profile - Fallback / selected profile when rails are unknown
   * @param forceOptions - Optional audited `--force --reason` bypass
   */
  async start(
    sessionId: string,
    profile: WorkflowProfileId,
    forceOptions?: SessionStartForceOptions,
  ): Promise<Result<void, SessionServiceError | CorruptedStateError>> {
    const rails = await this.deliveryRails.load();
    const result = this.service.start(
      this.manager.stateSnapshot(),
      sessionId,
      rails,
      profile,
      forceOptions,
    );
    if (!result.ok) {
      return result;
    }
    return this.manager.applyAndSave(() => result.value);
  }

  /**
   * End the active Agent Session, append history, and clear the rail.
   *
   * @param input - Outcome, evidence, and optional next action
   */
  async end(
    input: SessionEndInput,
  ): Promise<
    Result<AgentSessionRecord, SessionEndError | CorruptedStateError>
  > {
    const result = this.service.end(this.manager.stateSnapshot(), input);
    if (!result.ok) {
      return result;
    }
    const saved = await this.manager.applyAndSave(() => result.value.state);
    if (!saved.ok) {
      return saved;
    }
    return ok(result.value.record);
  }
}

/**
 * Thin facade over {@link WorkflowProjectionService} exposed as `StateManager.projection`.
 *
 * Commands must consume this read model instead of constructing the service.
 */
class ProjectionFacade {
  private readonly manager: StateManager;
  private readonly service: WorkflowProjectionService;

  constructor(manager: StateManager, service: WorkflowProjectionService) {
    this.manager = manager;
    this.service = service;
  }

  /**
   * Build the full workflow projection for the current in-memory state.
   */
  async project(): Promise<WorkflowProjection> {
    return this.service.project(
      this.manager.stateSnapshot(),
      this.manager.configSnapshot(),
    );
  }
}

/**
 * Thin facade over {@link DiscoveryOrchestrator} exposed as `StateManager.discovery`.
 *
 * Ensures milestones are initialized before mutations and persists only on success.
 */
class DiscoveryFacade {
  private readonly manager: StateManager;
  private readonly orchestrator: DiscoveryOrchestrator;

  constructor(manager: StateManager, orchestrator: DiscoveryOrchestrator) {
    this.manager = manager;
    this.orchestrator = orchestrator;
  }

  /**
   * Ordered 7-milestone checklist (virtual defaults when uninitialized).
   */
  list(): readonly DiscoveryMilestone[] {
    return this.orchestrator.list(this.manager.stateSnapshot());
  }

  /**
   * Current discovery cursor.
   */
  current(): DiscoveryMilestoneId | null {
    return this.orchestrator.current(this.manager.stateSnapshot());
  }

  /**
   * Coded blockers for a milestone.
   */
  blockers(id: DiscoveryMilestoneId): readonly MilestoneBlocker[] {
    return this.orchestrator.blockers(this.manager.stateSnapshot(), id);
  }

  /**
   * Whether every applicable milestone is closed.
   */
  isReady(): boolean {
    return this.orchestrator.isReady(this.manager.stateSnapshot());
  }

  /**
   * Persist canonical milestone records when missing (idempotent).
   */
  async initialize(): Promise<Result<void, DiscoveryOrchestratorError | CorruptedStateError>> {
    return this.applyOrchestrator((state) => this.orchestrator.initialize(state));
  }

  /**
   * Start brainstorming (`pending → brainstorming`).
   */
  async startBrainstorm(
    id: DiscoveryMilestoneId,
  ): Promise<Result<void, DiscoveryOrchestratorError | CorruptedStateError>> {
    return this.applyOrchestrator((state) => this.orchestrator.startBrainstorm(state, id));
  }

  /**
   * Start work (`planned → in_progress`).
   */
  async startWork(
    id: DiscoveryMilestoneId,
  ): Promise<Result<void, DiscoveryOrchestratorError | CorruptedStateError>> {
    return this.applyOrchestrator((state) => this.orchestrator.startWork(state, id));
  }

  /**
   * Plan a milestone after brainstorm.
   */
  async plan(
    id: DiscoveryMilestoneId,
    input: PlanMilestoneInput,
  ): Promise<Result<void, DiscoveryOrchestratorError | CorruptedStateError>> {
    return this.applyOrchestrator((state) => this.orchestrator.plan(state, id, input));
  }

  /**
   * Complete a milestone with evidence paths.
   */
  async complete(
    id: DiscoveryMilestoneId,
    evidence: readonly string[],
  ): Promise<Result<void, DiscoveryOrchestratorError | CorruptedStateError>> {
    return this.applyOrchestrator((state) =>
      this.orchestrator.complete(state, id, evidence),
    );
  }

  /**
   * Audited waiver of a milestone.
   */
  async waive(
    id: DiscoveryMilestoneId,
    input: WaiveMilestoneInput,
  ): Promise<Result<void, DiscoveryOrchestratorError | CorruptedStateError>> {
    return this.applyOrchestrator((state) => this.orchestrator.waive(state, id, input));
  }

  /**
   * Reopen a closed milestone with an audit reason.
   */
  async reopen(
    id: DiscoveryMilestoneId,
    reason: string,
  ): Promise<Result<void, DiscoveryOrchestratorError | CorruptedStateError>> {
    return this.applyOrchestrator((state) =>
      this.orchestrator.reopen(state, id, reason),
    );
  }

  /**
   * Mark a conditional milestone `not_applicable`.
   */
  async markNotApplicable(
    id: DiscoveryMilestoneId,
    rationale: string,
  ): Promise<Result<void, DiscoveryOrchestratorError | CorruptedStateError>> {
    return this.applyOrchestrator((state) =>
      this.orchestrator.markNotApplicable(state, id, rationale),
    );
  }

  /**
   * Run an orchestrator mutation against an initialized state; persist only on ok.
   */
  private async applyOrchestrator(
    mutate: (state: State) => Result<State, DiscoveryOrchestratorError>,
  ): Promise<Result<void, DiscoveryOrchestratorError | CorruptedStateError>> {
    const snapshot = this.manager.stateSnapshot();
    const initialized = this.orchestrator.initialize(snapshot);
    if (!initialized.ok) {
      return initialized;
    }

    const result = mutate(initialized.value);
    if (!result.ok) {
      return result;
    }

    return this.manager.applyAndSave(() => result.value);
  }
}

/**
 * Thin facade over {@link WorkflowProfileService} exposed as `StateManager.profile`.
 *
 * Persists profile changes via {@link StateManager.applyAndSave}.
 */
class ProfileFacade {
  private readonly manager: StateManager;
  private readonly service: WorkflowProfileService;

  constructor(manager: StateManager, service: WorkflowProfileService) {
    this.manager = manager;
    this.service = service;
  }

  /**
   * Select an explicit workflow profile and persist it.
   *
   * Profiles are never inferred — callers must choose deliberately.
   */
  async select(
    profile: WorkflowProfileId,
  ): Promise<Result<void, CorruptedStateError>> {
    return this.manager.applyAndSave((state) =>
      this.service.selectProfile(state, profile),
    );
  }

  /**
   * Clear the selected workflow profile (`null` = enforcement off) and persist.
   */
  async clear(): Promise<Result<void, CorruptedStateError>> {
    return this.manager.applyAndSave((state) => this.service.clearProfile(state));
  }

  /**
   * Advisory profile suggestion from the current project stage.
   *
   * Does not mutate state — surface to the user and call {@link select} explicitly.
   */
  recommended(): WorkflowProfileId {
    return this.service.recommendedProfile(this.manager.stateSnapshot());
  }
}

/**
 * Thin facade over TransitionPipeline exposed as `StateManager.transition`.
 *
 * Coordinates: execute pipeline → set in-flight marker → persist → apply new
 * state with the marker cleared → persist.
 *
 * The pipeline decides before anything is written, so a rejected transition
 * (including {@link ProfileRouteError}) touches neither memory nor disk.
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
   * Execute a phase transition with a crash-safe in-flight marker.
   *
   * Flow:
   * 1. Execute pipeline (validate → guard → gate → apply) against a snapshot
   * 2. Set `_in_flight_transition` marker + save (crash point #1)
   * 3. Apply new state with the marker cleared + save (crash point #2 —
   *    resolved on next load)
   *
   * The decision comes first on purpose: writing the marker before validation
   * meant a refused transition still rewrote `project.updated_at`, so "rejected
   * without mutation" only held semantically (DEBT-004).
   */
  async execute(
    request: TransitionRequest,
  ): Promise<Result<TransitionOutcome, TransitionPipelineError | CorruptedStateError>> {
    const state = this.manager.stateSnapshot() as State;
    const config = this.manager.configSnapshot() as Config;

    // 1. Decide first — a rejected request leaves state and disk untouched.
    const result = await this.pipeline.execute(state, config, request);
    if (!result.ok) {
      return err(result.error);
    }

    if (request.dryRun) {
      return ok(result.value.outcome);
    }

    // 2. Open the crash-safety window around the write itself.
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

    const markerSaved = await this.manager.save();
    if (!markerSaved.ok) {
      this.manager._updateState((s) => this.recovery.clearMarker(s));
      return err(markerSaved.error);
    }

    // 3. Apply new state + clear marker + save.
    const newState = this.recovery.clearMarker(result.value.state);
    this.manager._updateState(() => newState);

    const saveResult = await this.manager.save();
    if (!saveResult.ok) {
      return err(saveResult.error);
    }

    return ok(result.value.outcome);
  }
}
