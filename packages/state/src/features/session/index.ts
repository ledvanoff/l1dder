/**
 * @l1dder/state/features/session — Agent Session start/end and roadmap rail guard.
 *
 * @packageDocumentation
 */

export {
  RoadmapRailGuard,
  nextEligibleSession,
} from './roadmap-rail-guard.js';
export type {
  RailGuardAllow,
  RailGuardError,
  RailGuardErrorCode,
} from './roadmap-rail-guard.js';

export { SessionService } from './session-service.js';
export type {
  SessionEndError,
  SessionEndEvidenceRequiredError,
  SessionEndInput,
  SessionEndResult,
  SessionForceRequiredError,
  SessionNotActiveError,
  SessionServiceDeps,
  SessionServiceError,
  SessionStartForceOptions,
} from './session-service.js';
