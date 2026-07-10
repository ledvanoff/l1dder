---
id: session-handoff
name: "Session Handoff"
format_version: 1
phase: "*"
roles: []
trigger: manual
priority: 1
context_profile: null
tags: [session, handoff, continuity]
builtin: true
---

# Session Handoff

## Summary

Generate `.l1dder/handoff.md` when a session is interrupted: capture the current
state, decisions made, open questions, and the next step.

## When to Use

- A session is interrupted midway (context window exhausted, a break)
- The user runs `/l1dder.pause` (slash command)
- An explicit user request to preserve context for a new session

## Steps

1. Determine the current session state:
   - Which task was in progress
   - What is already done (completed steps)
   - What is in progress (unfinished steps)
2. Collect the decisions made (that must be preserved for the new session)
3. List the open questions and unresolved problems
4. Determine the next step (what to do first in the new session)
5. List the critical context:
   - Which files/specs must be read
   - Which architectural constraints to account for
   - Dependencies on other tasks
6. List the files changed in the current session
7. Capture uncommitted changes (a git status snapshot)
8. Produce `.l1dder/handoff.md` from the `templates/handoff-prompt.md` template

## Validation

- [ ] `.l1dder/handoff.md` is fully filled (all mandatory sections)
- [ ] "Critical context" contains concrete files and lines (not abstract descriptions)
- [ ] "Next step" is one concrete action (not a list)
- [ ] The git status snapshot is current

## Output

- `.l1dder/handoff.md` — the context for resuming the session
