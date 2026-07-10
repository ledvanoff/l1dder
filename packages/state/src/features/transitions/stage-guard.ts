import type { Result, LoggerPort } from '@l1dder/core';
import { StageGuardError, ok, err } from '@l1dder/core';
import type { Config, Phase, State } from '@l1dder/schemas';

/**
 * Phases allowed per project stage (default whitelist).
 *
 * Discovery: only specify/plan/update-tobe are natural;
 * Delivery: all phases except review;
 * Maintenance: mostly idle + quick/fast + implement for hotfixes.
 */
const STAGE_ALLOWED_PHASES: Record<string, readonly Phase[]> = {
  discovery: [
    'idle', 'specify', 'plan', 'update_tobe', 'tasks', 'hygiene',
    'quick_plan', 'quick_implement', 'quick_complete',
    'fast_implement', 'fast_complete',
  ],
  delivery: [
    'idle', 'specify', 'plan', 'update_tobe', 'tasks',
    'implement', 'update_asis', 'complete', 'hygiene',
    'quick_plan', 'quick_implement', 'quick_complete',
    'fast_implement', 'fast_complete',
  ],
  maintenance: [
    'idle', 'specify', 'plan', 'update_tobe', 'tasks',
    'implement', 'update_asis', 'complete', 'hygiene',
    'quick_plan', 'quick_implement', 'quick_complete',
    'fast_implement', 'fast_complete',
  ],
};

/**
 * Validates whether a target phase is allowed by the current Project Stage (PS4, PS6).
 *
 * Reads `config.stage.enforcement.restrict_phases` to determine enforcement level:
 * - `"enforced"` → blocks forbidden transitions with `StageGuardError`
 * - `"advisory"` → logs warning but allows
 * - `"off"` → always allows
 *
 * When no stage config or no allowed-phases list exists, the guard is permissive.
 */
export class StageGuard {
  private readonly logger: LoggerPort;

  constructor(logger: LoggerPort) {
    this.logger = logger;
  }

  /**
   * Check whether `targetPhase` is allowed by the current project stage.
   */
  check(
    state: State,
    config: Config,
    targetPhase: Phase,
  ): Result<void, StageGuardError> {
    const currentStage = state.project.stage;
    const enforcement = config.stage.enforcement.restrict_phases;

    if (enforcement === 'off') {
      return ok(undefined);
    }

    const allowedPhases = STAGE_ALLOWED_PHASES[currentStage];
    if (!allowedPhases) {
      return ok(undefined);
    }

    const isAllowed = allowedPhases.includes(targetPhase);
    if (isAllowed) {
      return ok(undefined);
    }

    if (enforcement === 'advisory') {
      this.logger.warn(
        `Phase "${targetPhase}" is not recommended in project stage "${currentStage}"`,
        { phase: targetPhase, stage: currentStage },
      );
      return ok(undefined);
    }

    // enforcement === 'enforced'
    return err(new StageGuardError(targetPhase, currentStage));
  }
}
