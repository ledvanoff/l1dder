# {{STATE}} Architecture of {{PROJECT_NAME}}

<!--
  Template: knowledge/{as-is,to-be}/architecture.md
  Used by: l1dder init (scaffolding)
  Parsed by: extractSummary() — the ## Summary section
  Updated:
    to-be — after each discovery session (design, architectural decisions)
    as-is — after each delivery iteration (As-Is Promotion)
  Ownership: Architect

  Placeholder markers:
    {{PROJECT_NAME}} — the project name
    {{STATE}}        — "To-Be" or "As-Is"
    {{DATE}}         — the creation/update date
    {{AUTHOR}}       — the author (role or name)
    <!-- TODO: ... -- > — sections that need filling in

  Size discipline:
    Summary: 20-30 lines
    Whole file: ~500 lines recommended, warning at ~1500
    On growth — move stable sections into erd.md, usecases.md, integrations.md
-->

> **State:** {{STATE}} | **Date:** {{DATE}} | **Author:** {{AUTHOR}}

## Summary

<!-- 20-30 lines: stack, architectural style, key layers/modules, principles, deployment -->
<!-- extractSummary() reads ONLY this section in SUMMARY mode -->
<!-- The Summary must be self-sufficient: reading it, the LLM understands the architecture at 80% -->
<!-- Do not use tables and diagrams in the Summary — text only -->

<!-- TODO: Describe the architecture in 20-30 lines. Recommended paragraph structure: -->
<!-- 1. Stack and runtime (2-3 lines) -->
<!-- 2. Architectural style and key modules (5-7 lines) -->
<!-- 3. Key architectural decisions — a list (5-10 lines) -->
<!-- 4. Deployment and infrastructure (2-3 lines) -->

## Details

### Technology Stack

<!-- TODO: Fill in the table -->

| Aspect | Decision |
|--------|---------|
| Language   |         |
| Runtime |        |
| Framework |     |
| Database     |         |
| Tests  |         |
| Build |         |

### Architectural Decisions

<!-- TODO: Numbered decisions with justification -->
<!-- Format: number, aspect, decision, alternatives (briefly), why chosen -->
<!-- A decision = finalized; if TBD — mark it explicitly -->

#### #1. <!-- Aspect -->

**Decision:** <!-- what was chosen -->

**Alternatives:** <!-- what was considered -->

**Justification:** <!-- why exactly this way -->

### Components and Layers

<!-- TODO: Describe the architectural layers or key modules/components -->
<!-- For each: responsibility, dependencies, public API (if applicable) -->

```
<!-- TODO: an ASCII or text diagram of layers / components -->
```

### Architectural Principles

<!-- TODO: The principles that guide the architecture -->

- <!-- Principle 1 -->
- <!-- Principle 2 -->

### Deployment and Infrastructure

<!-- TODO: Environments, CI/CD, monitoring, scaling -->
