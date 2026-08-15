---
id: specify
name: "Specify Feature"
format_version: 1
phase: specify
trigger_kind: transition
role: analyst
skill: specify-feature
artifact_template: templates/specs/spec-template.md
artifact_path: specs/current/spec.md
context_profile: null
accepts_argument: true
idempotent: true
requires_owner_approve: false
tags: [discovery, specification, p0]
builtin: true
---

# Specify Feature

## Summary

Launches the SPECIFY phase: collects feature requirements through dialog
with the user, fills `specs/current/spec.md` using the template
`templates/specs/spec-template.md` (including the mandatory
Implementation Preferences section), and initiates transition
`IDLE → SPECIFY`.

## When to Use

- Current phase: `IDLE` (PM3 whitelist: only from IDLE → SPECIFY)
- User wants to start a new iteration (new feature / change)
- Optionally, user passed a short feature description as argument

## System Prompt

You are an Analyst (see agents/analyst.md, injected into context).
Your goal is to collect **complete** functional and non-functional
requirements and capture them in `specs/current/spec.md` using the template.

Key SPECIFY phase rules:
- Mandatory section **Implementation Preferences** — without it PLAN
  cannot start (acceptance gate)
- Summary must be self-contained (an LLM reading only Summary
  understands the feature at 80%)
- Scope and Out of Scope explicitly delineated — bound expectations
- Every requirement must be testable (concrete acceptance criteria,
  not "works fast")

You do NOT make architectural decisions (that is PLAN, the next phase)
and do NOT decompose into tasks (that is TASKS). Only requirements.

## Discovery Discipline

When `project.stage === discovery`:

- Switch to **plan-mode** before EXPLORE; present options, confirm scope before final files.
- **Mark the recommended option** when presenting 2+ approaches.
- Follow **Guided Discovery**: sync with `l1dder helpme` each turn; work milestones in order
  (idea → roadmap → architecture → data model → usecases); use **`plan-roadmap`** skill for roadmap.
- **Spec-or-not:** trivial fix/text/config/rename → suggest `l1dder quick`/`fast`; feature with
  ≥2 scenarios or external deps → full SPECIFY (+ ADR for significant decisions via `adr-template.md`).
- Warn if user prefers quick/fast on a greenfield product — full cycle is recommended.

## Context Profile

(Context automatically assembled by ContextEngine.render(SPECIFY, analyst).)

Expected:
- knowledge/idea.md (FULL) — business context
- knowledge/to-be/architecture.md (FULL for analyst) — architectural background
- knowledge/to-be/usecases.md (FULL) — existing scenarios
- knowledge/to-be/erd.md (SUMMARY for analyst) — data model
- agents/analyst.md (persona system prompt — STATIC zone, priority 4)
- skills/built-in/specify-feature.md (procedural skill steps — STATIC zone, priority 4)
- standards/.base/* + standards/* (SUMMARY) — conventions
- state.yml snapshot (current phase, last iteration)

## Steps

(Complements skills/built-in/specify-feature.md → ## Steps;
executed AFTER skill steps as orchestration-level.)

1. Parse user argument (if provided): use as seed for feature description
2. If `specs/current/spec.md` already exists and is not empty:
   - If current_phase != "specify" — precondition error (see ## Error Handling)
   - If current_phase == "specify" — read existing spec, offer refinement (idempotent re-run)
3. Copy `templates/specs/spec-template.md` to `specs/current/spec.md` (if not exists)
4. Fill placeholders: `{{FEATURE_NAME}}`, `{{DATE}}` (today ISO), `{{AUTHOR}}` (from git config user.email)
5. Conduct dialog with user per skill steps (see specify-feature.md ## Steps 4-8)
6. Fill sections in order: Problem → Solution → Implementation Preferences → Scope / Out of Scope → Open Questions
7. Self-review: check ## Acceptance Criteria
8. If acceptance OK → initiate transition (see ## Post-Conditions)

## Acceptance Criteria

BEFORE calling transition, AI must verify:

- [ ] `specs/current/spec.md` exists and contains no unfilled `{{...}}` markers
- [ ] `## Summary` present and not empty; ≤ 30 lines
- [ ] `## Implementation Preferences` present and not empty
- [ ] `## Scope` and `## Out of Scope` explicitly filled (at least one item each)
- [ ] Every requirement is testable (has concrete acceptance criteria)
- [ ] No `<!-- TODO -->` without an owner in the final document

If any criterion is not met — do NOT call transition. See ## Error Handling.

## Post-Conditions

- `current_phase == "specify"`, `current_status == "in_progress"`
- `phase_history[-1] == { from: idle, to: specify, kind: forward, trigger: { kind: slash, command: specify } }`
- `iteration` set (if not already — generated from feature name slug + date)
- `specs/current/spec.md` exists and passes acceptance criteria
- No changes to `knowledge/`, `standards/`, `state.tasks`

## Error Handling

| Scenario | Exit code | Action |
|---|---|---|
| Acceptance failed (e.g. empty Implementation Preferences) | — | Report the specific criterion; offer to complete spec.md in dialog |
| `current_phase != idle` (precondition fail) | — | Report: "Current phase is `<phase>`. To start new SPECIFY, complete current iteration (`/l1dder-complete`) or do explicit rollback (`l1dder transition --to idle --force --reason '...'`)" |
| CLI exit 3 (ForbiddenTransitionError) | 3 | Forward stderr/JSON error; suggest `l1dder status` |
| CLI exit 6/7 (CorruptedState/SchemaValidation) | 6, 7 | Critical — suggest `l1dder doctor --fix`; do NOT retry transition |
| CLI exit 8 (NotInitialized) | 8 | Report: "Project not initialized — run `l1dder init`" |

## Examples

### Without argument

```
User: /l1dder-specify

AI: (reads context, starts dialog)
   "Ready to help specify a new feature. Tell me:
   - What problem are we solving?
   - Who is the target user?
   - What does success look like?"

User: "Need to add OAuth2 login..."

AI: (continues dialog per skill.Steps; asks clarifying questions
     about Implementation Preferences: which provider, which flow,
     how to store tokens)

(after dialog fills spec.md, checks acceptance, calls transition)

AI: ✓ specs/current/spec.md created (Summary 8 lines, Implementation
    Preferences 12 items, 5 acceptance criteria).
    ✓ Transition IDLE → SPECIFY recorded in state.yml.
    Next step: review spec.md, especially Implementation Preferences.
    When ready — invoke /l1dder-plan.
```

### With argument

```
User: /l1dder-specify "Add OAuth2 login via Google"

AI: (uses argument as seed; asks clarifying questions)
   "Got it — OAuth2 via Google. Clarifying Implementation Preferences:
   - Google only, or extensible to other providers?
   - PKCE flow or authorization code?
   - Where to store access_token: cookie, localStorage, server session?"
```

## Notes

- Idempotent: re-invocation in SPECIFY phase = refinement without new phase_history entry (PM5 idempotency)
- Clean start: `l1dder transition --to idle --force --reason "rewriting spec"` → delete spec.md → `/l1dder-specify`
- spec.md lives one iteration: after `/l1dder-complete` it is archived to `specs/archive/<iteration>/spec.md`
