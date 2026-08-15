---
id: implement
name: "Implement Task"
format_version: 1
phase: implement
trigger_kind: transition
role: developer
skill: implement-task
artifact_template: null
artifact_path: null
context_profile: null
accepts_argument: true
idempotent: true
requires_owner_approve: false
tags: [delivery, implementation, code, p0]
builtin: true
---

# Implement Task

## Summary

Implements one (or specified) task from `specs/current/tasks.md`: writes code,
tests, passes acceptance, updates task status in state.yml. Supports
repeated invocations for multi-task implementation within a single
IMPLEMENT phase.

## When to Use

- Current phase: `TASKS` (first call → transition `TASKS → IMPLEMENT`)
  or `IMPLEMENT` (repeated call — no transition, continue working)
- There are pending tasks in `state.tasks.items[]` or tasks.md
- Optionally: user passed task id (`/l1dder-implement T-03`)

## System Prompt

You are a Developer (see agents/developer.md, injected into context).
Your goal is to implement one atomic task (code + tests), pass the project's
own conventions, and update task status in state.yml.

Key IMPLEMENT phase rules:
- Derive stack, layout, and code style from the **project's** standards — do not
  assume the L1DDER framework's own toolchain
- Read `standards/conventions.md` (and `standards/.base/*` if present) for
  language, testing, lint, typing, docs, and import rules
- Read `knowledge/to-be/architecture.md` for the chosen stack, module layout,
  and dependency rules
- Hexagonal Lite (or the architecture pattern named in conventions): keep domain
  logic free of direct I/O; use ports/adapters where the project requires them
- Tests are mandatory for business logic per the project's test conventions
- depends_on guard: task cannot start if dependencies are not done (PM12)

You do NOT update knowledge/* (that is AS_IS_KU / `update_asis`, the next phase).
You do NOT rewrite tasks.md (decomposition is already done). You only implement.

## Context Profile

(Context automatically assembled by ContextEngine.render(IMPLEMENT, developer).)

Expected:
- specs/current/spec.md (FULL) — what we implement (business goal)
- specs/current/plan.md (FULL) — how (technical approach)
- specs/current/tasks.md (FULL) — current task
- knowledge/to-be/architecture.md (FULL for developer) — target architecture / stack
- knowledge/to-be/erd.md (FULL for developer) — data model
- knowledge/as-is/* (FULL) — current implementation
- agents/developer.md (persona)
- skills/built-in/implement-task.md (skill steps)
- standards/conventions.md (FULL for developer) — code style + verify commands
- standards/.base/* (if present) — generated base config the project overrides
- state.yml snapshot (current phase, task statuses)

## Steps

(Complements skills/built-in/implement-task.md → ## Steps;
executed AFTER skill steps as orchestration-level.)

1. Load project verification contract (do this once per session before coding):
   - Read `standards/conventions.md` and note the documented commands for
     **test**, **lint**, and **typecheck** (or language-equivalent static check)
   - Skim `standards/.base/*` when present for default scripts / tooling
   - Skim `knowledge/to-be/architecture.md` for stack and source-tree layout
   - If a command is not documented: ask the user, or probe common project
     manifests (e.g. `package.json` scripts, `Makefile`, `pyproject.toml`,
     `Cargo.toml`) — never assume a framework-default toolchain
2. Determine task:
   - If argument passed (e.g. `T-03`) — find it in `state.tasks.items[]`
   - Otherwise — `task = stateManager.task.next()` (PM12: toposort + first pending with deps met)
   - If no task found — report: "All tasks completed or blocked. Use /l1dder-update-asis for As-Is Promotion."
3. Check depends_on guard (PM12):
   - If dependencies not done — report and suggest picking a different task or unblocking
4. Via CLI: `l1dder transition --to implement --trigger-source slash --slash-command implement`
   (if not already in IMPLEMENT)
   - Idempotent: if already in IMPLEMENT — no-op for transition; continue from step 5
5. Mark task status = in_progress, started_at = now
6. Study existing code in the modules the task names (paths come from tasks.md /
   architecture — not from any hard-coded framework tree)
7. Implement functionality per skill steps (implement-task.md ## Steps)
8. Write tests per the project's test conventions (from standards)
9. Run the project's **test** command from step 1; ensure it passes
10. Run the project's **lint** command from step 1 (if documented); fix errors
11. Run the project's **typecheck** / static-analysis command from step 1 (if
    documented); fix errors. If none is documented, skip and note the gap
12. Self-review: check ## Acceptance Criteria + the task's own criteria
13. If acceptance OK — mark task status = done via CLI
14. Report result to user + suggest next step (`/l1dder-next` or another
    `/l1dder-implement <id>`)

## Acceptance Criteria

BEFORE marking task status = done, AI must verify:

- [ ] Project **test** command (from standards / discovered scripts) exits 0
- [ ] Project **lint** command exits 0 when such a command is documented
- [ ] Project **typecheck** / static check exits 0 when such a command is documented
- [ ] Public API documentation rules from `standards/conventions.md` are met
      (JSDoc, docstrings, or the project's equivalent)
- [ ] Language/typing rules from conventions are met (no bypasses the project forbids)
- [ ] Task acceptance criteria (from tasks.md) are met — checklist passed
- [ ] All impacted files from tasks.md are actually changed/created

If any criterion is not met — do NOT mark task as done. See ## Error Handling.

## Post-Conditions

- `current_phase == "implement"`, `current_status == "in_progress"`
- `state.tasks.items[<id>].status == "done"`, `completed_at` set
- `phase_history[-1]` (if transition occurred) contains
  `trigger: { kind: slash, command: implement }`
- Code + tests land in the source tree the project's architecture describes
- Documented verify commands from standards all exit 0 (or gaps explicitly noted)

If ALL tasks have status `done` or `skipped` — AI must hint:
"All tasks completed. Next step: /l1dder-update-asis" (or `/l1dder-next`).

## Error Handling

| Scenario | Action |
|---|---|
| Tests fail after implementation | Do not mark task done; fix failures; re-run acceptance |
| Lint errors | Fix errors (or add a justified inline suppress only if conventions allow) |
| Typecheck / static-analysis errors | Fix properly; do not weaken typing to silence the tool |
| Verify commands not documented | Ask user or discover from project manifests; note the gap in the report |
| depends_on guard fail (DependenciesNotMetError) | Report: "Task T-X depends on T-Y, T-Z; they are not done. First: /l1dder-implement T-Y" |
| CLI exit 3 (ForbiddenTransitionError) | Forward stderr; usually means attempting IMPLEMENT not from TASKS |
| CLI exit 4 (StageGuardError) | Report: "IMPLEMENT is a delivery phase. Run `l1dder stage advance` or use Quick Mode" |
| Implementation reveals missing requirement in spec.md | Report to user; suggest rollback to SPECIFY or document in Open Questions |

## Examples

### Without argument (next available task)

```
User: /l1dder-implement

AI: (reads standards + architecture for verify commands and layout)
   (reads state, finds next available task via task.next())
   "Current task: T-03 'Implement PaymentGateway model'.
   Dependencies (T-01, T-02) — done.
   Files to change: <paths from tasks.md / architecture>.
   Verify commands (from standards): <test>, <lint>, <typecheck>.
   Marking task as started, beginning implementation..."

(writes code + tests; runs project verify commands; checks acceptance)

AI: ✓ T-03 completed.
    Changed: <files>.
    Tests passed, lint clean, typecheck clean (per project standards).
    Progress: 3/8 tasks done.
    Next available: T-04 (depends on T-03 — now unblocked).
    Next step: /l1dder-implement T-04  (or /l1dder-next)
```

### All tasks done

```
User: /l1dder-implement

AI: ✓ All tasks in current iteration completed (8/8 done).
    Next workflow step:
    /l1dder-update-asis — As-Is Promotion (knowledge/as-is/* update)
    After that → /l1dder-complete to archive specs.
    (Normal re-entry: /l1dder-next)
```

## Notes

- IMPLEMENT is the only phase with N tasks; phase transition (TASKS → IMPLEMENT)
  happens **once**, then N invocations run idempotently (no transition, only task tracking)
- Transition `implement → update_asis` blocked by guard: "all tasks done or skipped" (PM11)
- For urgent fixes within IMPLEMENT — use Quick Mode: `l1dder quick "..."` in a new terminal
- Never hard-code another repo's toolchain (e.g. a specific test runner or package tree);
  always derive verify commands from this project's standards
