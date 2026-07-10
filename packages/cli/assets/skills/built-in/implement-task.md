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
tests, documentation, conventions check.

## When to Use

- The Phase Machine transitioned to IMPLEMENT (trigger: auto)
- The user runs `/l1dder.implement` (slash command)
- After TASKS is complete with a ready `tasks.md`

## Steps

1. Read `specs/current/tasks.md` — find the current task (by `task_id` from state)
2. Read `specs/current/plan.md` for technical context
3. Read `standards/conventions.md` for code style and structure
4. Check `depends_on`: all dependency tasks are completed
5. Study the existing code in the affected modules (if any)
6. Implement the functionality:
   - Follow the conventions (TypeScript strict, ESM-only, JSDoc on the public API)
   - Hexagonal Lite: domain logic without side effects, I/O through ports
   - Named exports only, no `export default`
7. Write tests:
   - Unit tests for business logic (co-located `*.test.ts`)
   - Integration tests when needed (`tests/*.integration.test.ts`)
8. Run the tests, make sure they pass
9. Run the linter, fix the errors
10. Update the task status in state (via CLI or a manual mark)

## Validation

- [ ] The code compiles without errors (`tsc --noEmit`)
- [ ] All tests pass (`vitest run`)
- [ ] The linter is clean (`eslint`)
- [ ] Every exported function/class has a JSDoc
- [ ] No `any` in TypeScript
- [ ] The task's acceptance criteria are met

## Output

- Code + tests in the corresponding `packages/` directories
