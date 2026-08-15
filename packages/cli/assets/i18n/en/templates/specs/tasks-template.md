# {{FEATURE_NAME}} — Task Decomposition

<!--
  Template: specs/current/tasks.md
  Phase Machine phase: TASKS (created by /l1dder-tasks)
  Used by: /l1dder-tasks (slash command; scaffolding + AI generation based on plan.md)
  Parsed by:
    - extractSummary() — the ## Summary section (dynamic zone, priority 1 — never trim)
    - parseTasksMarkdown() — the ## Task List table (columns: id, Task, depends_on, Status)
  Updated: within the TASKS and IMPLEMENT phases (task statuses are updated)
  Ownership: Architect (decomposition), Developer (execution)
  Lifecycle: short-term (per-feature, one iteration)
  Inputs: specs/current/spec.md, specs/current/plan.md

  Placeholder markers:
    {{FEATURE_NAME}} — the feature/task name (from spec.md)
    {{DATE}}         — the creation date
    {{AUTHOR}}       — the author (role or name)
    {{TOTAL_TASKS}}  — the total number of tasks
    <!-- TODO: ... -- > — sections that need filling in

  Migration note:
    Tasks written before per-task Test Contract ids stay valid.
    When updating, link each task's Test Contracts to TC-* ids from the
    spec.md AI Contract / plan.md Test Contracts. There is no separate
    ai-tasks.md file. Keep the ## Task List column names English
    (id / Task / depends_on / Status) so parseTasksMarkdown can read them.

  Validation (l1dder doctor):
    - ## Summary exists and is non-empty
    - ## Task List contains a table with a depends_on column
    - Every task has a unique id (T-XX format)
    - depends_on references are valid (no references to non-existent ids)
    - No cyclic dependencies (DAG — directed acyclic graph)
    - Each task details section lists Test Contract id(s) when the task has testable logic
    - plan.md exists and is complete (prerequisite)
    - No unfilled {{...}} markers in the final document

  State tracking:
    - Task status is updated via StateManager.task.start() / .complete() / .block()
    - depends_on guard: a task cannot move to started if its dependencies are not done
    - Topological sorting determines the recommended order (`l1dder task list`)
-->

> **Feature:** {{FEATURE_NAME}} | **Date:** {{DATE}} | **Author:** {{AUTHOR}}

## Summary

<!-- 3-5 lines: the number of tasks, overall complexity, the critical path -->
<!-- extractSummary() reads ONLY this section in SUMMARY mode -->
<!-- The Summary must be self-sufficient: reading it, the LLM understands the decomposition at 80% -->

<!-- TODO: Describe the decomposition in 3-5 lines -->
Decomposition of {{FEATURE_NAME}} into {{TOTAL_TASKS}} tasks.

<!-- TODO: Add: overall complexity estimate (simple/medium/complex), the critical path (the longest dependency chain), the recommended order -->

## Task List

<!-- A table of all tasks with dependencies -->
<!-- depends_on — a MANDATORY field (an architectural requirement PM12, B3) -->
<!-- depends_on format: comma-separated ids or "—" if there are no dependencies -->
<!-- Status: pending | in_progress | done | skipped -->
<!-- Complexity: S (< 1h) | M (1-4h) | L (4-8h) | XL (> 8h) -->
<!-- Column names stay English (id / Task / depends_on / Status) for parseTasksMarkdown -->

| id | Task | depends_on | Complexity | Status |
|----|--------|-----------|------------|--------|
| T-01 | <!-- TODO --> | — | S / M / L / XL | pending |
| T-02 | <!-- TODO --> | T-01 | S / M / L / XL | pending |
| T-03 | <!-- TODO --> | T-01 | S / M / L / XL | pending |
| T-04 | <!-- TODO --> | T-02, T-03 | S / M / L / XL | pending |

<!-- TODO: Add tasks. Recommendations:
  - 3-8 tasks for a typical feature (more → split the feature)
  - The first task — often scaffolding/setup (depends_on: —)
  - The last task — often integration/testing (depends_on: all previous)
  - Each task — an atomic unit of work (one PR or one commit)
-->

### Dependency Graph

<!-- A visualization of the dependencies (optional, for complex graphs) -->

```
T-01 ──→ T-02 ──┐
     ──→ T-03 ──┼──→ T-04
```

## Task Details

<!-- A detailed description of each task -->
<!-- For each: what to do, acceptance criteria, Test Contract id(s), affected files -->
<!-- Test Contracts use TC-* ids from the spec.md AI Contract / plan.md -->

### T-01: <!-- TODO: name -->

<!-- TODO: Task description -->

**depends_on:** —

**Acceptance Criteria:**

- [ ] <!-- TODO: criterion 1 -->
- [ ] <!-- TODO: criterion 2 -->

**Test Contracts:**

<!-- Required when the task has testable logic. Use TC-* ids from the AI Contract. -->
<!-- Format: "`TC-NNN-MM-L` — given X → expect Y" -->
<!-- Delete the section only if the task has no testable logic (scaffolding, configs) -->
- `TC-001-01-A` — <!-- TODO: given X → expect Y -->

**Files:**

- <!-- TODO: files that will be affected -->

---

### T-02: <!-- TODO: name -->

<!-- TODO: Task description -->

**depends_on:** T-01

**Acceptance Criteria:**

- [ ] <!-- TODO: criterion 1 -->
- [ ] <!-- TODO: criterion 2 -->

**Test Contracts:**

- `TC-001-01-A` — <!-- TODO: given X → expect Y -->

**Files:**

- <!-- TODO: files that will be affected -->

---

### T-03: <!-- TODO: name -->

<!-- TODO: Task description -->

**depends_on:** T-01

**Acceptance Criteria:**

- [ ] <!-- TODO: criterion 1 -->
- [ ] <!-- TODO: criterion 2 -->

**Test Contracts:**

- `TC-001-01-A` — <!-- TODO: given X → expect Y -->

**Files:**

- <!-- TODO: files that will be affected -->

---

### T-04: <!-- TODO: name -->

<!-- TODO: Task description -->

**depends_on:** T-02, T-03

**Acceptance Criteria:**

- [ ] <!-- TODO: criterion 1 -->
- [ ] <!-- TODO: criterion 2 -->

**Test Contracts:**

- `TC-001-01-A` — <!-- TODO: given X → expect Y -->

**Files:**

- <!-- TODO: files that will be affected -->
