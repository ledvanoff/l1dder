---
id: debugging-systematic
name: "Systematic Debugging"
format_version: 1
phase: implement
roles: [developer, qa]
trigger: manual
priority: 5
context_profile: null
tags: [engineering, debugging]
builtin: false
---

# Systematic Debugging

## Summary

A disciplined loop for debugging: capture the failure precisely, diagnose the
root cause against known patterns, apply the smallest reversible fix, and verify
with evidence. Stops the "retry blindly" loop and trades speculation for direct
observation. Stack-agnostic.

## When to Use

- A test or build fails and the cause is not obvious
- A change produced unexpected behavior or a regression
- Repeated attempts to fix something are not making progress
- A failure is intermittent and hard to reproduce

## Four-Phase Loop

### 1. Capture

Before changing anything, record the failure precisely:

- The exact error type, message, and stack/trace
- What you were trying to do and the last step that worked
- The last command/action that failed
- Any repeated pattern (same failure on each retry)
- Environment assumptions to verify: working directory, branch, service/port,
  expected files

### 2. Diagnose

Match the failure to a likely cause before editing code:

| Symptom | Likely cause | Check |
|---|---|---|
| Repeating the same failed action | Looping / no exit condition | Inspect the last few actions for repetition |
| Connection refused / timeout | Service down or wrong host/port | Verify service health, URL, port |
| Quota / rate-limit errors | Retry storm or missing backoff | Count calls; inspect retry spacing |
| File missing after write / stale diff | Wrong cwd or branch drift | Re-check path, cwd, VCS status, real file |
| Tests still fail after the "fix" | Wrong hypothesis | Isolate the exact failing test; re-derive the bug |

Ask: is this a logic, state, environment, or configuration failure? Is it
deterministic or transient? What is the smallest reversible action that would
confirm the diagnosis?

### 3. Contained Recovery

Take the smallest action that tests the diagnosis:

- Stop retrying; restate the hypothesis in one sentence
- Verify world state (filesystem, branch, process) instead of trusting memory
- Narrow scope to one failing test, file, or command
- Switch from speculation to one direct, discriminating check
- Escalate when the failure is high-risk or externally blocked

### 4. Report

Make the outcome legible:

- Failure pattern → root-cause hypothesis → recovery action → evidence it is
  now fixed (or still blocked) → preventive change to consider

## Heuristics (in order)

1. Restate the real objective in one sentence.
2. Verify the world state instead of trusting memory.
3. Shrink the failing scope.
4. Run one discriminating check.
5. Only then retry.

**Bad pattern:** retrying the same action three times with slightly different
wording. **Good pattern:** capture → classify → one direct check → change the
plan only if the check supports it.

## Validation

- [ ] The failure was captured before any fix attempt
- [ ] The root cause was identified, not just the symptom
- [ ] The fix was the smallest reversible change
- [ ] A re-run provides evidence the issue is resolved

---

<!-- Synthesized for L1DDER from Everything Claude Code (ECC,
     skills/agent-introspection-debugging + error-handling discipline) by
     Affaan Mustafa. MIT License. Neutral, cross-stack; no agent-runtime or
     framework specifics. -->
