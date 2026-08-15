import { recommendProfile } from '@l1dder/core';
import type { WorkflowProfileId } from '@l1dder/core';
import type { State } from '@l1dder/schemas';

/**
 * Explicit workflow profile selection API.
 *
 * Profiles are never inferred silently — callers must choose via
 * {@link selectProfile} (or clear via {@link clearProfile}).
 * {@link recommendedProfile} is advisory only.
 */
export class WorkflowProfileService {
  /**
   * Set an explicit workflow profile on `state.workflow.profile`.
   *
   * Returns a new state object; does not persist.
   */
  selectProfile(state: State, profile: WorkflowProfileId): State {
    return {
      ...state,
      workflow: {
        ...state.workflow,
        profile,
      },
    };
  }

  /**
   * Clear the selected workflow profile (`null` = enforcement off).
   *
   * Returns a new state object; does not persist.
   */
  clearProfile(state: State): State {
    return {
      ...state,
      workflow: {
        ...state.workflow,
        profile: null,
      },
    };
  }

  /**
   * Advisory profile suggestion based on `state.project.stage`.
   *
   * MUST NOT be used to silently select a route — surface the recommendation
   * and obtain an explicit choice via {@link selectProfile}.
   */
  recommendedProfile(state: State): WorkflowProfileId {
    return recommendProfile(state.project.stage);
  }
}
