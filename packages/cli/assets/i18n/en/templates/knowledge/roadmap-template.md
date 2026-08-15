# Roadmap — {{PROJECT_NAME}}

<!--
  Template: knowledge/roadmap.md
  Used by: l1dder init (scaffolding)
  Parsed by: extractSummary() — the ## Summary section
  Updated: after every Agent Session that changes plan, status, or pools
  Ownership: Product Owner / project author

  Placeholders replaced by 'l1dder init': PROJECT_NAME, DATE, AUTHOR.

  Note: roadmap.md is the human control plane. It is NOT split into as-is/to-be.
  Machine state lives separately; this file is not parsed as free prose.
-->

> **Date:** {{DATE}} | **Author:** {{AUTHOR}}

<!--
  How to use this file
  - You own this control plane; keep it short and scannable.
  - The CLI stores machine state separately and never parses free prose here.
  - Milestone order is fixed: IDEA → PRODUCT → ARCH → INTEGRATIONS → DATA → STANDARDS → READY.
  - Bypass a gate only with an explicit written reason (Decision / waiver).
-->

## Summary

<!-- Product goal and MVP boundary. extractSummary() reads ONLY this section. -->
<!-- TODO: One short paragraph — what success looks like for the first shippable product -->

{{PROJECT_NAME}} — <!-- product goal in 2–4 sentences -->.

### In MVP

- <!-- TODO: must-ship capability -->

### Not in MVP

- <!-- TODO: explicitly deferred (with short why) -->

## Discovery Control Plane

<!-- Statuses: pending | brainstorming | planned | in_progress | in_review | complete | not_applicable -->
<!-- Only INTEGRATIONS and STANDARDS may be not_applicable — and only with a written rationale. -->
<!-- Keep exactly one current open milestone; finish or waive before advancing. -->

| Milestone | Status | Brainstorm summary | Planned Agent Sessions | Evidence |
|-----------|--------|--------------------|------------------------|----------|
| IDEA | pending | <!-- TODO: problem, audience, alternatives --> | <!-- e.g. AS-IDEA-1 --> | <!-- link or note --> |
| PRODUCT | pending | — | — | — |
| ARCH | pending | — | — | — |
| INTEGRATIONS | pending | — | — | — |
| DATA | pending | — | — | — |
| STANDARDS | pending | — | — | — |
| READY | pending | — | — | — |

## MVP Feature Map

<!-- IDs: FEAT-NNN, UC-NNN-MM (first number must match parent FEAT). Replace example rows. -->

| Feature | Use cases | Status | Notes |
|---------|-----------|--------|-------|
| FEAT-001 — Example core capability <!-- example — replace --> | UC-001-01, UC-001-02 | planned | <!-- example — replace --> |
| FEAT-002 — Example supporting capability <!-- example — replace --> | UC-002-01 | planned | <!-- example — replace --> |

## Delivery Plan

<!-- Stable iteration/session IDs. depends_on lists prior IDs. Replace the example row. -->

| ID | Scope | depends_on | Covers (FEAT/UC) | Status |
|----|-------|------------|------------------|--------|
| ITER-001 / AS-001 <!-- example — replace --> | <!-- example scope --> | — | FEAT-001 / UC-001-01 | pending |

## Risks & Decisions

| Risk / Decision | Impact | Mitigation / link |
|-----------------|--------|-------------------|
| <!-- TODO or DEC-001 --> | <!-- high / medium / low --> | <!-- link or note --> |

## Technical Debt

<!-- Parking lot for non-blocking defects and conscious shortcuts. IDs: DEBT-NNN. -->
<!-- Lifecycle: open → nominated → scheduled → done | wontfix. Never auto-schedule. -->
<!-- Severity: low | medium | high. Blocker/critical work does not belong here. -->

### DEBT-001 — Example deferred cleanup <!-- example — replace -->

- **severity:** medium
- **status:** open
- **What:** <!-- short description of the debt -->
- **Why deferred:** <!-- why it was parked -->
- **How to pick up:** <!-- Hygiene / Delivery / Quick after nomination -->

## Long-term Backlog

<!-- Deferred feature / scope / research / infra. IDs: BL-NNN. -->
<!-- Lifecycle: open → nominated → scheduled → done | wontfix. Never auto-schedule. -->
<!-- A BL-* becomes a FEAT-* only through a Feature Discovery session. -->
<!-- priority: P1 | P2 | P3 · kind: feature | scope | research | infra -->

### BL-001 — Example future initiative <!-- example — replace -->

- **priority:** P2
- **kind:** feature
- **status:** open
- **What:** <!-- short description -->
- **Why deferred:** <!-- why not in MVP -->
- **How to pick up:** <!-- Feature Discovery → FEAT-* → Delivery Plan -->
