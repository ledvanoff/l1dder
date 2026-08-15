---
id: decompose-tasks
name: "Decompose Tasks"
format_version: 1
phase: tasks
roles: [architect, developer]
trigger: auto
priority: 1
context_profile: null
tags: [delivery, planning, tasks]
builtin: true
---

# Decompose Tasks

## Summary

Run the TASKS phase: decompose the technical plan into atomic tasks
with dependencies (`depends_on`), acceptance criteria, and effort estimates.

## When to Use

- The Phase Machine transitioned to TASKS (trigger: auto)
- The user runs `/l1dder-tasks` (slash command)
- After `update_tobe` (TO_BE_KU) is complete (or PLAN, if KU was skipped)

## Steps

1. Read `specs/current/spec.md` and `specs/current/plan.md` — what and how to implement
2. Read `standards/conventions.md` for testing and structure conventions
3. Decompose the plan into atomic tasks (each ≤ 1 AI-agent session)
4. For each task define:
   - A unique id (T1, T2, ...)
   - Title and description
   - Acceptance criteria (verifiable)
   - `depends_on` — a list of predecessor task ids
   - Estimated effort (S/M/L)
5. Build the Dependency Graph (verify the absence of cycles)
6. Determine the execution order (topological sort)
7. Produce `specs/current/tasks.md` from the `templates/specs/tasks-template.md` template
8. Self-review: all acceptance criteria from spec.md are covered by tasks

## Validation

- [ ] `specs/current/tasks.md` exists and contains all mandatory sections
- [ ] Every task has `depends_on` (an empty array if there are no dependencies)
- [ ] The dependency graph is acyclic (DAG)
- [ ] All acceptance criteria from `spec.md` are covered by at least one task
- [ ] Every task is atomic (≤ 1 session)

## Output

- `specs/current/tasks.md` — task decomposition with dependencies
