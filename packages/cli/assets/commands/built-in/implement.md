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
Your goal is to implement one atomic task (code + tests), pass
conventions, update task status in state.yml.

Key IMPLEMENT phase rules:
- Hexagonal Lite: domain logic without side-effects, I/O through ports
- TypeScript strict, no `any`, ESM-only, named exports only
- JSDoc on every public API
- Tests mandatory for business logic (`*.test.ts` co-located)
- Linter and `tsc --noEmit` clean
- depends_on guard: task cannot start if dependencies are not done (PM12)

You do NOT update knowledge/* (that is AS_IS_KU, the next phase).
You do NOT rewrite tasks.md (decomposition is already done). You only implement.

## Context Profile

(Context automatically assembled by ContextEngine.render(IMPLEMENT, developer).)

Expected:
- specs/current/spec.md (FULL) — what we implement (business goal)
- specs/current/plan.md (FULL) — how (technical approach)
- specs/current/tasks.md (FULL) — current task
- knowledge/to-be/architecture.md (FULL for developer) — target architecture
- knowledge/to-be/erd.md (FULL for developer) — data model
- knowledge/as-is/* (FULL) — current implementation
- agents/developer.md (persona)
- skills/built-in/implement-task.md (skill steps)
- standards/conventions.md (FULL for developer) — code style
- state.yml snapshot (current phase, task statuses)

## Steps

(Complements skills/built-in/implement-task.md → ## Steps;
executed AFTER skill steps as orchestration-level.)

1. Determine task:
   - If argument passed (e.g. `T-03`) — find it in `state.tasks.items[]`
   - Otherwise — `task = stateManager.task.next()` (PM12: toposort + first pending with deps met)
   - If no task found — report: "All tasks completed or blocked. Use /l1dder-update-asis for As-Is Promotion."
2. Check depends_on guard (PM12):
   - If dependencies not done — report and suggest picking a different task or unblocking
3. Via CLI: `l1dder transition --to implement --trigger-source slash --slash-command implement`
   (if not already in IMPLEMENT)
   - Idempotent: if already in IMPLEMENT — no-op for transition; continue from step 4
4. Mark task status = in_progress, started_at = now
5. Study existing code in affected modules
6. Implement functionality per skill steps (implement-task.md ## Steps 5-7)
7. Write tests per skill steps (step 8)
8. Run tests (`pnpm vitest run`), ensure they pass
9. Run linter (`pnpm lint`), fix errors
10. Run `tsc --noEmit`, fix type errors
11. Self-review: check ## Acceptance Criteria
12. If acceptance OK — mark task status = done via CLI
13. Report result to user + suggest next step

## Acceptance Criteria

BEFORE marking task status = done, AI must verify:

- [ ] Code compiles (`tsc --noEmit` exit 0)
- [ ] All tests pass (`vitest run` exit 0)
- [ ] Linter clean (`eslint` exit 0)
- [ ] Every exported function/class has JSDoc
- [ ] No `any` in TypeScript (where unavoidable — JSDoc comment with justification)
- [ ] Task acceptance criteria (from tasks.md) are met — checklist passed
- [ ] All impacted files from tasks.md ## Files actually changed/created

If any criterion is not met — do NOT mark task as done. See ## Error Handling.

## Post-Conditions

- `current_phase == "implement"`, `current_status == "in_progress"`
- `state.tasks.items[<id>].status == "done"`, `completed_at` set
- `phase_history[-1]` (if transition occurred) contains
  `trigger: { kind: slash, command: implement }`
- Code + tests in the corresponding `packages/` directories
- `tsc --noEmit`, `vitest`, `eslint` — all exit 0

If ALL tasks have status `done` or `skipped` — AI must hint:
"All tasks completed. Next step: /l1dder-update-asis".

## Error Handling

| Scenario | Action |
|---|---|
| Tests fail after implementation | Do not mark task done; fix failures; re-run acceptance |
| Linter errors | Fix errors (or add inline-disable with justification if warranted) |
| `tsc --noEmit` type errors | Fix types; do NOT add `any` to suppress |
| depends_on guard fail (DependenciesNotMetError) | Report: "Task T-X depends on T-Y, T-Z; they are not done. First: /l1dder-implement T-Y" |
| CLI exit 3 (ForbiddenTransitionError) | Forward stderr; usually means attempting IMPLEMENT not from TASKS |
| CLI exit 4 (StageGuardError) | Report: "IMPLEMENT is a delivery phase. Run `l1dder stage advance` or use Quick Mode" |
| Implementation reveals missing requirement in spec.md | Report to user; suggest rollback to SPECIFY or document in Open Questions |

## Examples

### Without argument (next available task)

```
User: /l1dder-implement

AI: (reads state, finds next available task via task.next())
   "Current task: T-03 'Implement PaymentGateway model'.
   Dependencies (T-01, T-02) — done.
   Files to change: packages/payment/src/models/gateway.ts,
                    tests/gateway.test.ts.
   Marking task as started, beginning implementation..."

(writes code + tests; runs test+lint+tsc; checks acceptance)

AI: ✓ T-03 completed.
    Changed: packages/payment/src/models/gateway.ts (+87 lines),
             tests/gateway.test.ts (+45 lines, 6 test cases).
    Tests passed (6/6), lint clean, tsc clean.
    Progress: 3/8 tasks done.
    Next available: T-04 (depends on T-03 — now unblocked).
    Next step: /l1dder-implement T-04
```

### All tasks done

```
User: /l1dder-implement

AI: ✓ All tasks in current iteration completed (8/8 done).
    Next workflow step:
    /l1dder-update-asis — As-Is Promotion (knowledge/as-is/* update)
    After that → /l1dder-complete to archive specs.
```

## Notes

- IMPLEMENT is the only phase with N tasks; phase transition (TASKS → IMPLEMENT)
  happens **once**, then N invocations run idempotently (no transition, only task tracking)
- Transition IMPLEMENT → AS_IS_KU blocked by guard: "all tasks done or skipped" (PM11)
- For urgent fixes within IMPLEMENT — use Quick Mode: `l1dder quick "..."` in a new terminal
