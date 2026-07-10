# {{FEATURE_NAME}} — Iteration Summary

<!--
  Template: specs/current/summary.md (or an entry appended to archive/worklog.md)
  Phase Machine phase: COMPLETE (written while running the complete-iteration skill)
  Used by: the complete-iteration skill — a structural "plan vs actual + lessons" retrospective
  Purpose: capture what was implemented, where it diverged from the plan, decisions,
           problems and their fixes, the DoD result, and what comes next.
  Lifecycle: short-term (per-iteration); the durable record lives in archive/worklog.md
  Source: AI-Driven Methodology summary-template (M5)

  Placeholder markers (MUST be identical across en/ru):
    {{FEATURE_NAME}} — the feature/iteration name (from spec.md)
    {{DATE}}         — the closing date
    {{AUTHOR}}       — the author (role or name)
    <!-- TODO: ... -- > — sections that need filling in

  Note: this is an advisory template, not a CLI artifact. There is no l1dder command
        that generates it; the complete-iteration skill prompts the AI to fill it in.
-->

> **Feature:** {{FEATURE_NAME}} | **Date:** {{DATE}} | **Author:** {{AUTHOR}}

## Implemented

<!-- TODO: List what was actually built — artifacts and a one-line description each -->
- `path/to/artifact` — <!-- TODO: what it does -->
- `path/to/artifact` — <!-- TODO: what it does -->

## Deviations from Plan

<!-- TODO: What changed relative to plan.md and why. If nothing — write "no deviations". -->

## Decisions

<!-- TODO: Architectural/technical decisions made during implementation. If significant — open an ADR. -->

- **Decision:** <!-- TODO --> — **Rationale:** <!-- TODO --> — **ADR/link:** <!-- TODO (if any) -->

## Problems & Resolutions

<!-- TODO: What went wrong and how it was fixed. -->

- **Problem:** <!-- TODO --> → **Resolution:** <!-- TODO -->

## DoD Result

<!-- TODO: Copy the acceptance criteria from plan.md/tasks.md; mark pass/fail with a note -->

- [ ] <!-- TODO: criterion from plan.md --> — pass/fail + note
- [ ] <!-- TODO: criterion from plan.md --> — pass/fail + note
- [ ] Lint passes
- [ ] Tests pass

## Next

<!-- TODO: The next task/iteration and any non-blocking loose ends -->
- <!-- TODO -->
