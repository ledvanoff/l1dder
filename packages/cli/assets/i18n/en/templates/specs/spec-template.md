# {{FEATURE_NAME}} — Specification

<!--
  Template: specs/current/spec.md
  Phase Machine phase: SPECIFY (created by /l1dder.specify)
  Used by: l1dder specify (scaffolding + AI generation)
  Parsed by: extractSummary() — the ## Summary section (dynamic zone, priority 1 — never trim)
  Updated: within the SPECIFY phase of the current iteration
  Ownership: Product Owner / Analyst / Designer (the SPECIFY phase roles)
  Lifecycle: short-term (per-feature, one iteration)

  Placeholder markers:
    {{FEATURE_NAME}} — the feature/task name
    {{DATE}}         — the creation date
    {{AUTHOR}}       — the author (role or name)
    <!-- TODO: ... -- > — sections that need filling in

  Validation (l1dder doctor):
    - ## Summary exists and is non-empty
    - ## Implementation Preferences exists (an architectural requirement)
    - No unfilled {{...}} markers in the final document
    - No <!-- TODO --> without an owner after SPECIFY is complete
-->

> **Feature:** {{FEATURE_NAME}} | **Date:** {{DATE}} | **Author:** {{AUTHOR}}

## Summary

<!-- 5-8 lines: what the feature is, which problem it solves, the scale of changes -->
<!-- extractSummary() reads ONLY this section in SUMMARY mode -->
<!-- The Summary must be self-sufficient: reading it, the LLM understands the task at 80% -->

<!-- TODO: Describe the feature in 5-8 lines -->
{{FEATURE_NAME}} — <!-- a short description: what it is and why (1 sentence) -->.

<!-- TODO: Add 3-5 sentences: the core problem, the proposed solution, scope -->

## Problem

<!-- A description of the problem this feature solves -->
<!-- What does not work / what is missing / what gap exists? -->
<!-- Include: user pain, technical debt, or a business need -->

<!-- TODO: Describe the problem -->

### Current Behavior

<!-- TODO: How the system behaves now (or: "the functionality is absent") -->

### Expected Behavior

<!-- TODO: How the system should behave after implementation -->

## Solution

<!-- A high-level description of the solution: WHAT we do (not HOW) -->
<!-- Focus on the user outcome, not on technical details -->
<!-- Technical details go into plan.md (the PLAN phase) -->

<!-- TODO: Describe the solution -->

## Implementation Preferences

<!-- MANDATORY SECTION (an architectural requirement — architecture.md, a GSD insight) -->
<!-- The user's answers to the AI's clarifying questions about implementation details -->
<!-- The AI asks questions depending on the feature type, the user records the answers -->
<!-- This section feeds into the PLAN phase as mandatory context -->

<!--
  Typical questions by feature type:
  - Visual/UI: layout, density, states (loading/empty/error), accessibility, theming
  - API/CLI: response format, flags, error handling, versioning
  - Content: data structure, tone, depth, localization
  - Integration: sync/async, retry strategy, fallback, timeouts
  - Data model: soft/hard delete, unique constraints, indexes
-->

<!-- TODO: Record the implementation preferences (AI questions + user answers) -->

## Scope

<!-- What is included in this iteration — an explicit list of deliverables -->

<!-- TODO: List what is included -->
- <!-- deliverable 1 -->
- <!-- deliverable 2 -->
- <!-- deliverable 3 -->

## Out of Scope

<!-- What is explicitly NOT included in this iteration (bound expectations) -->
<!-- Helps the AI avoid expanding scope on its own -->

<!-- TODO: List what is NOT included -->
- <!-- exclusion 1 -->
- <!-- exclusion 2 -->

## Open Questions

<!-- Questions that remained unanswered after SPECIFY -->
<!-- Status: blocking (blocks PLAN) or deferred (can be resolved later) -->

<!-- TODO: List the open questions (or delete the section if none) -->

| # | Question | Status | Resolution |
|---|--------|--------|---------|
| 1 | <!-- TODO --> | blocking / deferred | — |
