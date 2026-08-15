# {{FEATURE_NAME}} — Technical Plan

<!--
  Template: specs/current/plan.md
  Phase Machine phase: PLAN (created by /l1dder-plan)
  Used by: /l1dder-plan (slash command; scaffolding + AI generation based on spec.md)
  Parsed by: extractSummary() — the ## Summary section (dynamic zone, priority 1 — never trim)
  Updated: within the PLAN phase of the current iteration
  Ownership: Architect / Tech Lead (the PLAN phase roles)
  Lifecycle: short-term (per-feature, one iteration)
  Inputs: specs/current/spec.md (including Implementation Preferences + AI Contract)

  Placeholder markers:
    {{FEATURE_NAME}} — the feature/task name (from spec.md)
    {{DATE}}         — the creation date
    {{AUTHOR}}       — the author (role or name)
    <!-- TODO: ... -- > — sections that need filling in

  Migration note:
    Plans written before coverage / Test Contracts sections stay valid.
    When updating, align Coverage and Test Contracts with the AI Contract ids
    in spec.md. There is no separate ai-spec.md / ai-plan.md file.

  Validation (l1dder doctor):
    - ## Summary exists and is non-empty
    - ## File Changes contains at least one entry
    - ## Coverage lists the FEAT/UC this plan covers (must match spec AI Contract)
    - ## Test Contracts lists required TC-* ids (must match spec AI Contract)
    - spec.md exists and is complete (prerequisite)
    - No unfilled {{...}} markers in the final document
-->

> **Feature:** {{FEATURE_NAME}} | **Date:** {{DATE}} | **Author:** {{AUTHOR}}

## Summary

<!-- 5-8 lines: the technical approach, key decisions, risk level -->
<!-- extractSummary() reads ONLY this section in SUMMARY mode -->
<!-- The Summary must be self-sufficient: reading it, the LLM understands the plan at 80% -->

<!-- TODO: Describe the technical plan in 5-8 lines -->
A technical implementation plan for {{FEATURE_NAME}}.

<!-- TODO: Add: the chosen approach (1-2 sentences), affected components, complexity estimate (low/medium/high), the main risk -->

## Coverage

<!-- Which FEAT/UC this plan covers — MUST match the AI Contract in spec.md -->

| Kind | Id | Notes |
|------|----|-------|
| feature | FEAT-001 | <!-- TODO: replace with the real FEAT-* from spec AI Contract --> |
| usecase | UC-001-01 | <!-- TODO: list every UC-* covered by this plan --> |

## Options Considered + Recommended

<!-- Discovery/plan-mode: list 2-3 approaches; mark exactly one as RECOMMENDED -->
<!-- Options may be copied into ADR and state.decisions[] for significant decisions -->

| # | Option | Pros | Cons | Verdict |
|---|---|---|---|---|
| 1 | <!-- TODO --> | | | recommended / rejected |
| 2 | <!-- TODO --> | | | recommended / rejected |

**Recommended:** <!-- TODO: name the recommended option and one-line rationale -->

## Technical Approach

<!-- The chosen technical approach with justification -->
<!-- If there were alternatives — briefly describe why this one was chosen -->
<!-- References to patterns from architecture.md / design/*.md if applicable -->

<!-- TODO: Describe the approach -->

### Approach

<!-- TODO: A detailed description of the chosen approach -->

### Alternatives Considered

<!-- TODO: Alternatives and why they were rejected (or: "the obvious approach, no alternatives") -->

| # | Alternative | Pros | Cons | Why rejected |
|---|---|---|---|---|
| 1 | <!-- TODO --> | | | |

## Architecture Impact

<!-- Which architectural artifacts this feature affects -->
<!-- Used for the To-Be Knowledge Update after discovery -->

### Knowledge Files Affected

<!-- TODO: Which knowledge files will need updating after implementation -->

| File | Change type | What exactly |
|------|---------------|------------|
| `knowledge/to-be/architecture.md` | update / none | <!-- TODO --> |
| `knowledge/to-be/erd.md` | update / none | <!-- TODO --> |
| `knowledge/to-be/usecases.md` | update / none | <!-- TODO --> |
| `knowledge/to-be/integrations.md` | update / none | <!-- TODO --> |

### Design Decisions

<!-- TODO: New architectural decisions made in this plan (if any) -->
<!-- Format: a short decision + justification; reference DEC-* ids when assigned -->

## File Changes

<!-- A concrete list of files/modules that will be created/modified/deleted -->
<!-- The basis for task decomposition (the TASKS phase) -->

<!-- TODO: Fill in the table -->

| File / module | Action | Description of changes |
|----------------|----------|-------------------|
| <!-- TODO --> | create / modify / delete | <!-- TODO --> |

## Plan Dependencies

<!-- Dependencies on other tasks / iterations / Agent Sessions (not npm packages) -->
<!-- Align with roadmap rails and tasks.md depends_on where applicable -->

<!-- TODO: List blocking work outside this plan (or: "none") -->

| Depends on | Kind | Why |
|------------|------|-----|
| <!-- e.g. HARD-5 / T-11 / ITER-003 --> | iteration / task / session | <!-- TODO --> |

## Dependencies

<!-- External dependencies: new packages, services, APIs -->
<!-- If there are no dependencies — the section can be deleted -->

### New Packages

<!-- TODO: New npm packages (or: "no new dependencies required") -->

| Package | Version | Purpose | Size (approx) |
|-------|--------|-----------|-----------------|
| <!-- TODO --> | | | |

### External Services

<!-- TODO: External services/APIs (or: "not applicable") -->

## Test Contracts

<!-- Required Test Contracts for this plan — IDs MUST match spec.md AI Contract -->
<!-- Each TC is implemented alongside the code (Contract-First). Format: "given X → expect Y" -->

<!-- TODO: List TC-* ids and one-line behavioral expectations -->

| Id | Requirement |
|----|-------------|
| TC-001-01-A | <!-- TODO: given X → expect Y --> |

## Risks

<!-- Technical risks and mitigation strategies -->
<!-- If there are no risks — the section can be deleted -->

<!-- TODO: List the risks -->

| # | Risk | Probability | Impact | Mitigation |
|---|------|-------------|---------|-----------|
| 1 | <!-- TODO --> | low / medium / high | low / medium / high | <!-- TODO --> |
