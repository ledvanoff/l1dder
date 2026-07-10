---
id: pause
name: "Session Pause"
format_version: 1
phase: "*"
trigger_kind: status_change
role: developer
skill: session-handoff
artifact_template: templates/handoff-prompt.md
artifact_path: .l1dder/handoff.md
context_profile: null
accepts_argument: true
idempotent: true
requires_owner_approve: false
tags: [session, handoff, continuity, p0]
builtin: true
---

# Session Pause

## Summary

Pauses the current session: generates `.l1dder/handoff.md` with context
for resumption, sets `current_status: interrupted` (without changing
phase). For long sessions hitting context limits or task-switching.

## When to Use

- Current phase: any (including IDLE — to preserve project context)
- Session is long (context close to limit, slow responses, agent forgetting earlier agreements)
- Need to pause and continue later / with a different agent
- Optionally: user passed a short reason as argument
  (`/l1dder-pause "switching to urgent fix"`)

## System Prompt

You are acting in the current phase role (Developer, Architect, or other —
resolved via ContextEngine), but your task now is to **capture session
context**, not continue working.

Use skill `session-handoff` (see skills/built-in/session-handoff.md)
and template `templates/handoff-prompt.md`.

Goal — a handoff that allows a **new session** (or new AI) to continue
work in < 5 minutes of reading. No fluff, no restating the obvious.

Handoff principles:
- Brevity: 100-200 lines, not a transcript
- File references instead of restating decisions
- Honest status: state what is stuck directly
- User prompt mandatory on resume (handoff is not auto-included in new session)

## Context Profile

(Context automatically assembled by ContextEngine.render(<current_phase>,
<current_role>) plus ContextEngine.detectHandoff() for existing handoff check.)

Expected:
- skills/built-in/session-handoff.md (skill steps)
- templates/handoff-prompt.md (artifact template)
- state.yml snapshot (current phase, active tasks, last transitions)
- specs/current/* (if in delivery phase)
- Changed files list (git diff HEAD --name-only — AI requests via terminal)
- Uncommitted changes (git status)

## Steps

(Complements skills/built-in/session-handoff.md → ## Steps; executed as orchestration.)

1. Via ContextEngine.detectHandoff(): check if `.l1dder/handoff.md` already exists
   - If no — continue to step 2
   - If yes and valid → ask user: archive existing (to `.l1dder/handoff-archive/<timestamp>.md`) or overwrite?
   - If yes and !valid → warn about corrupted handoff, archive anyway
2. Via terminal: get `git status` snapshot (for section 9 of template)
3. Via terminal: get `git diff HEAD --name-only` (for section 8 — changed files)
4. Read state.yml snapshot (current phase, current_status, active iteration, active tasks)
5. Read active specs (`specs/current/*` if in delivery phase)
6. Copy `templates/handoff-prompt.md` body to `.l1dder/handoff.md`
7. Fill handoff.md per skill steps (session-handoff.md ## Steps 1-7):
   - Session goal (1-2 sentences)
   - What was done (bullet list with files/commits)
   - What is in progress (with status)
   - Decisions made (for future KU)
   - Open questions
   - Next step (one concrete action)
   - Critical context (3-7 facts not obvious from knowledge)
   - Changed files (from step 3)
   - Uncommitted changes (from step 2)
8. Self-review: check ## Acceptance Criteria
9. If acceptance OK → via CLI:
   `l1dder transition --to <current_phase> --trigger-source slash --slash-command pause`
   (idempotent transition — does not change phase, but sets current_status: interrupted)

## Acceptance Criteria

BEFORE calling transition, AI must verify:

- [ ] `.l1dder/handoff.md` exists and is fully filled (all 9 template sections)
- [ ] "Critical context" (section 7) contains concrete files/lines (not abstractions)
- [ ] "Next step" (section 6) is one concrete action (not a list)
- [ ] git status snapshot (section 9) is current (fresh invocation)
- [ ] Changed files (section 8) listed with brief descriptions
- [ ] Size of handoff.md ≤ 250 lines

If any criterion is not met — do NOT call transition. See ## Error Handling.

## Post-Conditions

- `.l1dder/handoff.md` exists and passes acceptance criteria
- `current_phase` unchanged (same as before pause)
- `current_status == "interrupted"`
- In-progress tasks remain in their status (for resumption)
- If previous handoff existed and user chose archive →
  moved to `.l1dder/handoff-archive/<timestamp>.md`

## Error Handling

| Scenario | Action |
|---|---|
| Existing `.l1dder/handoff.md` and user hasn't chosen action | Wait for user decision (archive/overwrite/cancel) |
| git not available (not a git repo) | Report: handoff will skip sections 8/9; proceed if user confirms |
| Acceptance failed (e.g. empty "Critical context") | Complete through dialog; re-check acceptance |
| CLI exit 6/7 (CorruptedState/SchemaValidation) | Critical — handoff.md already created (usable for recovery); suggest `l1dder doctor --fix` |
| Transition failed but handoff.md was created | Report: "handoff.md created at .l1dder/handoff.md, but current_status not updated. Use manual CLI transition or simply close the session — handoff.md is ready" |

## Examples

### Without argument

```
User: /l1dder-pause

AI: (checks existing handoff — none found)
   (requests git status and git diff via terminal)
   (reads state.yml — current_phase: implement, active task: T-03 in_progress)
   "Preparing handoff..."

(fills handoff.md per skill steps)

AI: ✓ .l1dder/handoff.md created (167 lines).
    ✓ current_status: in_progress → interrupted (phase implement unchanged)
    
    Session summary:
    - Goal: implementing T-03 'Implement PaymentGateway model'
    - Done: scaffold model + 4 tests (1 fail, 3 pass)
    - Open: failing test 'PaymentGateway.refund() — invalid amount'
    - Next: fix test failure (see .l1dder/handoff.md ## 6)
    
    To resume: new session with session-prompt + .l1dder/handoff.md in first message.
    Safe to close IDE now.
```

### With existing handoff

```
User: /l1dder-pause

AI: ⚠️ Existing handoff found (.l1dder/handoff.md):
    - Created: 2026-05-08 14:32 (14 hours ago)
    - Goal: 'Designing Context Injection Engine, completed CE1-CE4...'
    
    Options:
    1. archive — move to .l1dder/handoff-archive/2026-05-08-143200.md, create new
    2. overwrite — replace old with new (old lost permanently)
    3. cancel — abort /l1dder-pause

User: 1

AI: ✓ Old handoff → .l1dder/handoff-archive/2026-05-08-143200.md
    Creating new...
```

## Notes

- pause is the only command that does not change phase but changes current_status (interrupted)
- handoff.md is gitignored (`.l1dder/handoff.md` in .gitignore) — local/ephemeral artifact
- To resume: new session with `templates/session-prompt.md` + add `@.l1dder/handoff.md` to first message
- Post-resume: `current_status` returns to `in_progress` via `StateManager.resume()` or next slash command
