---
id: tasks
name: "Decompose Tasks"
format_version: 1
phase: tasks
trigger_kind: transition
role: architect
skill: decompose-tasks
artifact_template: templates/specs/tasks-template.md
artifact_path: specs/current/tasks.md
context_profile: null
accepts_argument: false
idempotent: true
requires_owner_approve: false
tags: [delivery, planning, tasks, p0]
builtin: true
---

# Decompose Tasks

## Summary

Launches the TASKS phase: decomposes the planned implementation into
atomic tasks in `specs/current/tasks.md`, synchronizes task tracking
in `state.yml`, and initiates transition `update_tobe → tasks`.

## When to Use

- Current phase: `update_tobe` (TO_BE_KU / knowledge update completed)
- spec.md and plan.md exist and are finalized
- Ready to begin delivery decomposition

## System Prompt

You are an Architect (see agents/architect.md, injected into context).
Your goal is to decompose the planned feature into **atomic,
implementable tasks** with explicit dependencies.

Key TASKS phase rules:
- Every task must have `depends_on` (explicit list or empty for root tasks)
- Dependency graph must be a DAG (no cycles — verify topologically)
- Every acceptance criterion from spec.md must be covered by at least one task
- Tasks must be atomic (≤ 1 AI agent session each)
- Group tasks into logical Agent Sessions
- Include Test Contracts for each task (given/when/then)

## Steps

1. Read `specs/current/spec.md` (FULL) and `specs/current/plan.md` (FULL)
2. Read updated `knowledge/to-be/*.md` for architectural context
3. Copy `templates/specs/tasks-template.md` to `specs/current/tasks.md`
4. Fill placeholders: `{{FEATURE_NAME}}`, `{{DATE}}`, `{{AUTHOR}}`
5. Decompose into tasks:
   - Each task: ID, description, files, acceptance criteria, `depends_on`
   - Group into Agent Sessions by context affinity
   - Draw dependency graph (Mermaid or ASCII)
6. Verify DAG is acyclic (topological sort check)
7. Verify all spec acceptance criteria are covered
8. Self-review: check ## Acceptance Criteria
9. If acceptance OK → initiate transition

## Acceptance Criteria

- [ ] `specs/current/tasks.md` exists and follows template structure
- [ ] Every task has explicit `depends_on` field
- [ ] Dependency graph is acyclic (DAG)
- [ ] All acceptance criteria from spec.md covered by at least one task
- [ ] Every task is atomic (≤ 1 session)
- [ ] Task IDs follow naming convention (T-01, T-02, ...)
- [ ] Each task has Test Contracts section

## Post-Conditions

- `current_phase == "tasks"`, `current_status == "in_progress"`
- `state.tasks.items[]` synchronized with tasks.md
  (via `l1dder task sync` — project the Task List table into state)
- Discovery-gate passed (config.yml.gates.discovery-gate)
- `specs/current/tasks.md` exists and passes acceptance

## Error Handling

| Scenario | Action |
|---|---|
| Cyclic dependency detected | Report the cycle; restructure tasks to break it |
| Spec acceptance criteria not fully covered | Add missing tasks or extend existing ones |
| `current_phase != update_tobe` | Report current phase; suggest completing TO_BE_KU (`update_tobe`) first |
| Too many tasks for a single session | Split into multiple Agent Sessions; note in task grouping |

## Notes

- After `/l1dder-tasks`, next step is `/l1dder-implement` (or `/l1dder-implement <T-id>` for a specific task)
- Tasks live one iteration: archived after `/l1dder-complete`
