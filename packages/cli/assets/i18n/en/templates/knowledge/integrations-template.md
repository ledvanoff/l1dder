# External Integrations — {{PROJECT_NAME}}

<!--
  Template: knowledge/{as-is,to-be}/integrations.md
  Used by: l1dder init (scaffolding)
  Parsed by: extractSummary() — the ## Summary section
  Updated:
    to-be — after a decision on a new integration / adapter is made
    as-is — after delivery (connected integrations)
  Ownership: Architect / Developer

  Placeholder markers:
    {{PROJECT_NAME}} — the project name
    {{STATE}}        — "To-Be" or "As-Is"
    {{DATE}}         — the creation/update date
    {{AUTHOR}}       — the author (role or name)
    <!-- TODO: ... -- > — sections that need filling in

  Identifier format: INT-XX (INT-01, INT-02, ...)
  Statuses: planned | in-progress | connected | deprecated
-->

> **State:** {{STATE}} | **Date:** {{DATE}} | **Author:** {{AUTHOR}}

## Summary

<!-- 10-15 lines: an overview of integrations — which external systems, overall status -->
<!-- extractSummary() reads ONLY this section in SUMMARY mode -->
<!-- The Summary must be self-sufficient: the LLM understands the integration landscape at 80% -->

<!-- TODO: Describe the integrations in 10-15 lines -->
<!-- Recommended format: -->
<!-- The project integrates with N external systems: -->
<!-- - Category 1: system A (status), system B (status) -->
<!-- - Category 2: system C (status) -->

## Details

### Integrations Table

<!-- TODO: Fill in the table -->

| ID | Integration | Type | Protocol | Status | Priority |
|----|-----------|-----|----------|--------|-----------|
| INT-01 | <!-- TODO --> | <!-- API / SDK / File / Event --> | <!-- REST / gRPC / WebSocket / CLI --> | <!-- planned / in-progress / connected / deprecated --> | <!-- P0 / P1 / P2 / P3 --> |

### INT-01: <!-- Integration name -->

**Type:** <!-- API / SDK / File / Event -->

**Description:** <!-- 2-3 sentences: what we integrate and why -->

**Technical details:**

- Protocol: <!-- REST / gRPC / WebSocket / CLI -->
- Data format: <!-- JSON / YAML / Protobuf -->
- Authentication: <!-- API Key / OAuth / mTLS / none -->
- Dependencies (packages): <!-- npm packages, if any -->

**Status:** <!-- planned / in-progress / connected / deprecated -->

**Relationships:**

- Architecture: `architecture.md` → <!-- section / decision -->
- Scenarios: `usecases.md` → <!-- UC-XX (if applicable) -->
