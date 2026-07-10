# Use Cases — {{PROJECT_NAME}}

<!--
  Template: knowledge/{as-is,to-be}/usecases.md
  Used by: l1dder init (scaffolding)
  Parsed by: extractSummary() — the ## Summary section
  Updated:
    to-be — after a new scenario is identified or a CLI command is designed
    as-is — after delivery (implemented scenarios)
  Ownership: Product Owner / Analyst

  Placeholder markers:
    {{PROJECT_NAME}} — the project name
    {{STATE}}        — "To-Be" or "As-Is"
    {{DATE}}         — the creation/update date
    {{AUTHOR}}       — the author (role or name)
    <!-- TODO: ... -- > — sections that need filling in

  Identifier format: UC-XX (UC-01, UC-02, ...)
-->

> **State:** {{STATE}} | **Date:** {{DATE}} | **Author:** {{AUTHOR}}

## Summary

<!-- 10-20 lines: an overview table or list of scenarios with ID, name, status -->
<!-- extractSummary() reads ONLY this section in SUMMARY mode -->
<!-- The Summary must be self-sufficient: the LLM understands the key scenarios at 80% -->

<!-- TODO: List the main scenarios -->
<!-- Recommended format: -->

| ID | Use Case | Actor | Status |
|----|----------|-------|--------|
| UC-01 | <!-- TODO --> | | <!-- planned / in-progress / implemented / deprecated --> |

## Details

<!-- TODO: Describe each scenario in a separate section -->

### UC-01: <!-- Scenario name -->

**Actor:** <!-- Who initiates it (role, system) -->

**Description:** <!-- 2-3 sentences: what the actor does and why -->

**Preconditions:**

- <!-- TODO -->

**Main flow:**

1. <!-- Step 1 -->
2. <!-- Step 2 -->
3. <!-- Step 3 -->

**Alternative flows:**

- <!-- Branching: condition → action -->

**Relationships:**

- Architecture: `architecture.md` → <!-- section / decision -->
- Integrations: `integrations.md` → <!-- INT-XX (if applicable) -->
