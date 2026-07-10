---
id: quick-implement
name: "Quick Implement"
format_version: 1
phase: quick_plan
roles: [developer]
trigger: auto
priority: 1
context_profile: quick_minimal
tags: [quick, fast, implementation]
builtin: true
---

# Quick Implement

## Summary

An accelerated implementation cycle for Quick/Fast Mode: mini-plan → code → tests → commit
with a knowledge drift assessment. For tasks ≤ 30 min and ≤ 3 files.

## When to Use

- The Phase Machine transitioned to QUICK_PLAN (trigger: auto)
- The user ran `l1dder quick "task description"` or `l1dder fast "description"`
- A small change that does not require the full SPECIFY → PLAN → TASKS cycle

## Steps

1. Get the task description from the user (what needs to be done)
2. Read `standards/conventions.md` (SUMMARY) for code style
3. Assess the scope: is the task really quick (≤ 30 min, ≤ 3 files)?
   - If not → recommend the full cycle (Main Mode: SPECIFY → PLAN → ...)
4. Compose a mini-plan:
   - Which files to create/modify
   - Which approach (pattern, API)
   - What to test
5. Implement:
   - Code per the conventions (strict TS, JSDoc, named exports)
   - Unit tests for the new logic
6. Run the tests and the linter
7. `knowledge_drift_warning`: assess whether the change touches knowledge:
   - A new data schema → drift warning (a Knowledge Update is needed)
   - A bugfix only → no drift
   - The flag goes into the `quick_tasks[]` state section (SM4)
8. Prepare the commit

## Validation

- [ ] Scope ≤ 3 files (soft limit; warning if more)
- [ ] Tests pass
- [ ] The linter is clean
- [ ] `knowledge_drift_warning` is set correctly
- [ ] The commit message conforms to Conventional Commits

## Output

- Code + tests in the corresponding directories
- A commit (Conventional Commits)
- (optional) A knowledge drift warning in state
