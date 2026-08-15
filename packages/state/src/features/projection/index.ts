/**
 * @l1dder/state/features/projection — Workflow projection read model.
 *
 * @packageDocumentation
 */

export {
  WorkflowProjectionService,
} from './workflow-projection-service.js';
export type {
  GateProjection,
  MilestoneChecklistItem,
  MilestoneProjection,
  PhaseProjection,
  ProfileProjection,
  ProgressProjection,
  ProjectionBlocker,
  ProjectionBlockerCode,
  ProjectionBlockerLevel,
  ReadinessProjection,
  RecoveryProjection,
  SessionProjection,
  StageProjection,
  WorkflowProjection,
  WorkflowProjectionDeps,
} from './workflow-projection-service.js';

export {
  PRIMARY_ACTION_COMMANDS,
  PRIMARY_ACTION_REQUIRED_INPUTS,
  resolvePrimaryAction,
} from './primary-action.js';
export type {
  PrimaryAction,
  PrimaryActionInput,
  PrimaryActionKind,
  PrimaryActionRequiredInput,
} from './primary-action.js';

export { EmptyDebtBacklogIndex } from './debt-backlog-index-port.js';
export type {
  DebtBacklogIndexPort,
  PlanningCandidate,
} from './debt-backlog-index-port.js';

export { EmptyDeliveryRailIndex } from './delivery-rail-index-port.js';
export type {
  DeliveryRailIndexPort,
  DeliveryRailSession,
} from './delivery-rail-index-port.js';

export { EmptyReadinessEvidence } from './readiness-evidence-port.js';
export type {
  ReadinessEvidence,
  ReadinessEvidencePort,
  ReadinessGap,
  ReadinessGapCode,
} from './readiness-evidence-port.js';
