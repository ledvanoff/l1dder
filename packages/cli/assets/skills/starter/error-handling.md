---
id: error-handling
name: "Error Handling"
format_version: 1
phase: implement
roles: [developer]
trigger: manual
priority: 5
context_profile: null
tags: [engineering, error-handling]
builtin: false
---

# Error Handling

## Summary

Patterns for robust, consistent error handling: typed errors, the no-throw
Result style, retries for transient failures, and clear separation of
user-facing messages from developer logs. Stack-agnostic principles with
language-neutral guidance.

## When to Use

- Designing error/exception types for a new module or service
- Adding retry or backoff logic for an unreliable dependency
- Reviewing endpoints or boundaries for missing error handling
- Designing user-facing error messages
- Debugging cascading failures or silently swallowed errors

## Core Principles

1. **Fail fast and loudly.** Surface errors at the boundary where they occur;
   do not bury them.
2. **Typed errors over raw strings.** Model errors as structured values with a
   stable `code`, so callers can branch on type, not message text.
3. **User messages ≠ developer messages.** Show friendly, generic text to
   users; log full context (cause, inputs, stack) server-side.
4. **Never swallow errors silently.** Every catch/recover must handle,
   re-raise, or log — never an empty block.
5. **Errors are part of the contract.** Document the error codes a caller can
   receive, just like the success shape.

## Patterns

### Typed error hierarchy

Define a base application error carrying a stable `code` (and a status where
relevant); derive specific errors (`NotFound`, `Validation`, `Unauthorized`,
`RateLimited`). Callers branch on the type/code, never on the message string.

### Result (no-throw) style

For operations where failure is expected and common (parsing, external calls),
return an explicit success-or-error value instead of throwing. This makes the
failure path part of the type signature and impossible to forget.

> L1DDER itself uses a `Result<T, E>` in domain logic and reserves exceptions
> for the infrastructure boundary — the same split applies here.

### Boundary error handler

Centralize translation of errors into the transport response at the edge
(HTTP/RPC/CLI): map known error codes to their status and a safe message; map
everything else to a generic internal error and log the detail.

### Retry with backoff

Retry **only transient** failures (network blips, 5xx, timeouts) — never client
errors (4xx) or logic errors. Use exponential backoff with jitter and a
bounded attempt count to avoid retry storms.

## User-Facing Messages

Map error codes to short, human-readable messages. Keep technical detail,
stack traces, and internal identifiers out of anything a user sees.

## Checklist

- [ ] Every catch/recover handles, re-raises, or logs — no silent swallowing
- [ ] Errors follow a consistent envelope `{ code, message }`
- [ ] User-facing text has no stack traces or internal details
- [ ] Full error context is logged at the boundary
- [ ] Custom errors carry a stable `code`
- [ ] Retries apply only to transient errors, with bounded backoff

---

<!-- Adapted from Everything Claude Code (ECC, skills/error-handling) by Affaan Mustafa.
     MIT License. Rewritten for L1DDER: neutral, cross-stack, no framework specifics. -->
