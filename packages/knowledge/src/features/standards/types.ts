import type { BaseMeta, SessionDiscipline, WorkflowBaseParsed } from '@l1dder/schemas';

export type { BaseMeta, SessionDiscipline };

/** Override entry parsed from user's `## Overrides` Markdown table. */
export interface OverrideEntry {
  readonly key: string;
  readonly value: string;
  readonly reason: string;
}

/**
 * Parsed base conventions YAML.
 *
 * Typed as record with known meta section. Individual sections (language, naming, etc.)
 * are accessed dynamically. Full Zod schema (ConventionsBaseSchema) is deferred to a
 * future task — here we validate structure and meta.
 */
export interface ConventionsBase {
  readonly meta: BaseMeta;
  readonly [section: string]: unknown;
}

/**
 * Parsed base workflow YAML.
 *
 * `session_discipline` is typed; other sections are accessed dynamically.
 * Validated via `WorkflowBaseSchema` (`@l1dder/schemas`) in `loadBaseWorkflow()` —
 * this is a direct alias of its inferred output type (single source of truth),
 * so `loadBaseWorkflow()` no longer needs an unsafe cast to bridge the two.
 */
export type WorkflowBase = WorkflowBaseParsed;

/** Merged standards: base YAML + user overrides from Markdown. */
export interface MergedStandards {
  readonly conventions: {
    readonly base: ConventionsBase;
    readonly overrides: Map<string, OverrideEntry>;
  };
  readonly workflow: {
    readonly base: WorkflowBase;
    readonly overrides: Map<string, OverrideEntry>;
  };
}
