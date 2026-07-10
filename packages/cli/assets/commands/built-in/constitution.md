---
id: constitution
name: "Project Constitution"
format_version: 1
phase: idle
trigger_kind: no_transition
role: architect
skill: null
artifact_template: null
artifact_path: null
context_profile: null
accepts_argument: false
idempotent: true
requires_owner_approve: true
tags: [init, idea, standards, ground-rules, p0]
builtin: true
---

# Project Constitution

## Summary

Structured update of `knowledge/idea.md` (vision/motivation) and/or
`standards/conventions.md` overrides (project ground rules) through a
guided dialog. Does not change the current phase.

## When to Use

- After `l1dder init`, when `idea.md` is still a placeholder
- When you need to capture or revise project ground rules
- When project vision needs refinement or formalization

## System Prompt

You are an Architect (see agents/architect.md, injected into context).
Your focus is long-term project vision and foundational decisions.

Key rules:
- **Do NOT** update `idea.md` without explicit user approval
  (workflow.base.yml `idea.initiator: user_only`)
- Standards overrides must comply with base schema
  (conventions.base.yml / workflow.base.yml)
- Do NOT touch `knowledge/to-be/*` — constitution is about ground rules,
  not technical design

Guide the user through:
1. Problem statement and target users
2. Success criteria and non-goals
3. Key constraints (technical, business, timeline)
4. Project conventions and overrides

## Steps

1. Read `knowledge/idea.md` and `standards/conventions.md`
2. Initiate dialog with user on project vision:
   - What problem are we solving?
   - Who are the target users?
   - What does success look like?
   - What are the explicit non-goals?
3. Prepare a change proposal (was → becomes per file)
4. Request owner-approve:
   - PO for `idea.md` changes
   - Architect for `standards/` changes
5. Apply approved changes
6. Record audit via `StateManager.recordKnowledgeUpdate()`
   (constitution does not trigger a phase transition —
   only writes to `knowledge_updates[]`)

## Acceptance Criteria

- [ ] `idea.md` Summary is self-contained (an LLM reading only Summary
      understands the project at 80%)
- [ ] Standards overrides comply with base schema
      (workflow.base.yml / conventions.base.yml)
- [ ] No changes to `knowledge/to-be/*`
- [ ] No changes to `specs/`, `state.tasks`
- [ ] Owner-approve obtained for each modified file

## Post-Conditions

- `current_phase` remains `idle` (no transition)
- `knowledge_updates[]` contains a new entry with
  `type: to_be_update` (for idea) or audit record (for standards)
- Modified files are consistent and saved

## Error Handling

| Scenario | Action |
|---|---|
| User declines all proposals | End gracefully — no changes applied |
| `idea.md` does not exist | Suggest `l1dder init` first |
| Standards override conflicts with machine-enforced rule | Warn user; machine-enforced rules cannot be overridden |
| CLI exit 6/7 (CorruptedState/SchemaValidation) | Suggest `l1dder doctor --fix` |
| CLI exit 8 (NotInitialized) | Suggest `l1dder init` |
