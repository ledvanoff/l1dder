import { CURRENT_SCHEMA_VERSION, StateSchema, type State } from '@l1dder/schemas';

import { initialDiscoverySlice } from '../features/discovery/discovery-orchestrator.js';

/** Input for building the canonical default project state. */
export interface CreateInitialStateInput {
  readonly projectName: string;
  readonly brownfield: boolean;
  readonly now: string;
}

/**
 * Build the canonical initial `.l1dder/state.yml` object.
 *
 * Greenfield → stage `discovery` + empty `stage_history`.
 * Brownfield → stage `delivery` + one history entry (`Brownfield initialization`).
 * Both modes receive the same 7 pending discovery milestones (`current: idea`) —
 * milestone state is orthogonal to project stage.
 *
 * Always goes through {@link StateSchema.parse} so schema defaults apply.
 */
export function createInitialState(input: CreateInitialStateInput): State {
  const stage = input.brownfield ? 'delivery' : 'discovery';
  const stageHistory = input.brownfield
    ? [
        {
          from: 'discovery' as const,
          to: 'delivery' as const,
          timestamp: input.now,
          reason: 'Brownfield initialization',
        },
      ]
    : [];

  return StateSchema.parse({
    schema_version: CURRENT_SCHEMA_VERSION,
    project: {
      name: input.projectName,
      stage,
      stage_history: stageHistory,
      created_at: input.now,
      updated_at: input.now,
    },
    workflow: {
      current_phase: 'idle',
      current_status: 'in_progress',
      mode: 'main',
      profile: null,
      iteration: 0,
      phase_history: [],
      gate_history: [],
    },
    discovery: initialDiscoverySlice(),
    tasks: { items: [] },
    quick_tasks: [],
    knowledge_updates: [],
  });
}
