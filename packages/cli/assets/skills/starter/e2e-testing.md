---
id: e2e-testing
name: "End-to-End Testing"
format_version: 1
phase: implement
roles: [developer, qa]
trigger: manual
priority: 5
context_profile: null
tags: [engineering, testing]
builtin: false
---

# End-to-End Testing

## Summary

Patterns for stable, fast, maintainable end-to-end (E2E) tests that exercise a
critical user flow through the real system. Stack-agnostic — the principles
apply to any browser, API, or CLI E2E runner.

## When to Use

- Covering a critical user journey (sign-in, checkout, core workflow)
- Guarding against regressions in flows that span multiple components
- Validating integration of UI, API, and persistence together

## Principles

1. **Test journeys, not pages.** An E2E test follows a complete user goal from
   start to a verifiable outcome.
2. **Cover the few flows that matter.** E2E is expensive; reserve it for
   critical paths. Push detail down to unit/integration tests.
3. **Wait on conditions, not time.** Wait for an element, response, or state —
   never a fixed sleep. Arbitrary timeouts are the main source of flakiness.
4. **Use stable selectors.** Prefer semantic roles or explicit test ids over
   brittle CSS/structure-based selectors.
5. **Isolate test data.** Each test sets up and tears down its own data so runs
   are independent and repeatable.

## Structure

- **Encapsulate interaction** behind a small object/helper per screen or flow
  (a "page object"): selectors and actions live in one place, tests read as
  intent. This keeps tests resilient when the UI changes.
- **Arrange–Act–Assert**: set up state, perform the user actions, assert the
  observable outcome.
- **Name tests as behavior**: `user can search and see matching results`.

## Stability

| Cause of flakiness | Fix |
|---|---|
| Race conditions | Use auto-waiting locators; wait for the element to be actionable |
| Network timing | Wait for the specific request/response, not a fixed delay |
| Animation timing | Wait for the element to reach a stable/visible state |
| Shared state between tests | Give each test its own isolated data |

Quarantine a genuinely flaky test explicitly (skip with a tracked reason)
rather than leaving it to fail intermittently and erode trust in the suite.

## Artifacts & CI

- Capture screenshots, traces, or video **on failure** to make debugging
  possible without re-running locally.
- In CI, enable retries for transient failures but treat a test that only
  passes on retry as flaky and worth fixing.
- Upload reports/artifacts from CI so failures are inspectable after the run.

## Validation

- [ ] Each E2E test covers one complete, critical user journey
- [ ] No fixed-time sleeps — waits are on conditions
- [ ] Selectors are semantic/stable, not structure-coupled
- [ ] Test data is isolated; tests pass in any order
- [ ] Failure artifacts (screenshot/trace) are captured

---

<!-- Adapted from Everything Claude Code (ECC, skills/e2e-testing) by Affaan Mustafa.
     MIT License. Rewritten for L1DDER: neutral, cross-stack, no framework specifics. -->
