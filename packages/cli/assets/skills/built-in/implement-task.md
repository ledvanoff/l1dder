---
id: implement-task
name: "Implement Task"
format_version: 1
phase: implement
roles: [developer, qa]
trigger: auto
priority: 1
context_profile: null
tags: [delivery, implementation, code]
builtin: true
---

# Implement Task

## Summary

Run the IMPLEMENT phase: implement a single task from `tasks.md` — code,
tests, documentation, conventions check — using the **project's** stack and
verify commands from its own standards (not a hard-coded framework toolchain).

## When to Use

- The Phase Machine transitioned to IMPLEMENT (trigger: auto)
- The user runs `/l1dder-implement` (slash command)
- After TASKS is complete with a ready `tasks.md`

## Steps

1. Read `specs/current/tasks.md` — find the current task (by `task_id` from state)
2. Read `specs/current/plan.md` for technical context
3. Read `standards/conventions.md` (and `standards/.base/*` if present) for:
   - code style / language rules
   - public-API documentation rules
   - the project's **test**, **lint**, and **typecheck** (or equivalent) commands
4. Read `knowledge/to-be/architecture.md` for stack, source layout, and dependency rules
5. Check `depends_on`: all dependency tasks are completed
6. Study the existing code in the modules the task names
7. Implement the functionality:
   - Follow conventions from step 3 (language, typing, exports, docs)
   - Follow the architecture pattern named in conventions / architecture
     (e.g. Hexagonal Lite: domain without direct I/O, ports for side effects)
   - Prefer the project's export/module rules (named exports, packages, modules, …)
8. Write tests using the project's test layout and naming from conventions
9. Run the project's test command from step 3; make sure it passes
10. Run the project's lint command from step 3 when documented; fix errors
11. Run the project's typecheck / static-analysis command from step 3 when
    documented; fix errors. If undocumented, skip and note the gap
12. Update the task status in state (via CLI or a manual mark)

## Validation

- [ ] Project test command exits 0
- [ ] Project lint command exits 0 when documented
- [ ] Project typecheck / static check exits 0 when documented
- [ ] Public API docs match `standards/conventions.md`
- [ ] Typing / language rules from conventions are respected
- [ ] The task's acceptance criteria are met

## Output

- Code + tests in the source locations described by the project's architecture
  and the task's file list (never assume a framework-default tree)
