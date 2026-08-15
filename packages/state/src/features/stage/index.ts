/**
 * @l1dder/state/features/stage — Project Stage management.
 *
 * @packageDocumentation
 */

export { StageManager, STAGE_FORCE_DECISION_PREFIX } from './stage-manager.js';
export type { StageManagerError, AdvanceInfo } from './stage-manager.js';
export { DeliveryCriteriaChecker, isSkeletonFile } from './delivery-criteria.js';
export type { DeliveryCriteriaResult, CriterionResult } from './delivery-criteria.js';
export { recommend } from './readiness-recommender.js';
export type { DiscoveryMilestone, ReadinessRecommendation } from './readiness-recommender.js';
export { evaluateHygieneCadence } from './hygiene-cadence.js';
export type { HygieneCadenceResult } from './hygiene-cadence.js';
