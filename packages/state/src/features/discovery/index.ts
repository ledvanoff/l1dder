/**
 * @l1dder/state/features/discovery — Discovery orchestrator and workflow profiles.
 *
 * @packageDocumentation
 */

export {
  DiscoveryOrchestrator,
  initialDiscoveryMilestone,
  initialDiscoverySlice,
} from './discovery-orchestrator.js';
export type {
  DiscoveryOrchestratorError,
  MilestoneBlocker,
  MilestoneBlockerCode,
  PlanMilestoneInput,
  WaiveMilestoneInput,
} from './discovery-orchestrator.js';

export { WorkflowProfileService } from './workflow-profile-service.js';
