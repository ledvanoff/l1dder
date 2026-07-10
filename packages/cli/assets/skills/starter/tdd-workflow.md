---
id: tdd-workflow
name: "TDD Workflow"
format_version: 1
phase: implement
roles: [developer, qa]
trigger: manual
priority: 5
context_profile: null
tags: [engineering, testing]
builtin: false
---

# TDD Workflow

## Summary

Test-driven development discipline: write a failing test first (RED), make it
pass with the smallest change (GREEN), then refactor. Stack-agnostic — applies
to any language or test runner.

## When to Use

- Adding a new feature or behavior
- Fixing a bug (start with a reproducer test)
- Refactoring code that lacks test coverage
- Any change to domain logic where correctness matters

## RED → GREEN → Refactor

### RED — write a failing test first

1. Express the desired behavior as a test: `given X → expect Y`.
2. Run the test and confirm it fails **for the intended reason** (missing
   behavior or the bug), not because of a typo, broken setup, or a missing
   import. A test that was written but never executed does not count as RED.
3. For a bug fix, the failing test is the reproducer — it pins down the defect.

### GREEN — make it pass minimally

1. Write the smallest amount of code that makes the test pass.
2. Re-run the test target and confirm it is now green.
3. Resist adding behavior the tests do not yet demand (YAGNI).

### Refactor — improve without changing behavior

1. With tests green, clean up: remove duplication, improve names, simplify.
2. Keep tests green throughout; run them after each change.
3. Stop when the code is clear — do not gold-plate.

### Optional Git checkpoints

If the repo is under Git, a checkpoint commit after RED and after GREEN keeps
the history honest (`test: add reproducer for X`, then `fix: X`). Only count
commits on the current branch for the current task as valid evidence.

## Test Quality

- **Test behavior, not implementation.** Assert observable outputs and effects,
  not internal state or private call order.
- **One behavior per test.** A clear `given → expect` per case; descriptive
  names that read as a specification.
- **Cover edge cases and error paths**, not just the happy path: empty, null,
  boundary values, failure modes.
- **Keep tests isolated and fast.** Each test sets up its own data; no ordering
  dependencies between tests.

## Anti-Patterns

| Anti-pattern | Fix |
|---|---|
| Writing code first, tests later (or never) | Start from a failing test |
| Asserting on internal/private state | Assert on observable behavior |
| Brittle selectors / over-mocking | Use stable seams; mock only boundaries |
| Tests that depend on each other | Make each test self-contained |
| Claiming RED without running the test | Execute the test and see it fail first |

## Validation

- [ ] A failing test existed before the implementation
- [ ] The implementation is the minimal change to pass
- [ ] Refactor step left all tests green
- [ ] Tests assert behavior and cover error/edge cases

---

<!-- Adapted from Everything Claude Code (ECC, skills/tdd-workflow) by Affaan Mustafa.
     MIT License. Rewritten for L1DDER: neutral, cross-stack, no framework specifics. -->
