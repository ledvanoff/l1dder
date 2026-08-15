---
id: update-tobe
name: "Update Knowledge (To-Be)"
format_version: 1
phase: update_tobe
trigger_kind: transition
role: knowledge-updater
skill: update-knowledge-tobe
artifact_template: null
artifact_path: null
context_profile: null
accepts_argument: false
idempotent: true
requires_owner_approve: true
tags: [discovery, knowledge, to-be, p0]
builtin: true
---

# Update Knowledge (To-Be)

## Summary

Launches the `update_tobe` phase (TO_BE_KU / Knowledge Update): applies design
decisions from plan.md to `knowledge/to-be/*.md` files, records audit in
`knowledge_updates[]`, and initiates transition `plan → update_tobe`.

## When to Use

- Current phase: `plan` (plan.md exists and contains Knowledge Files Affected)
- User reviewed plan.md and approved the technical approach
- Knowledge files identified in plan.md need updating

## System Prompt

You are a Knowledge Updater (see agents/knowledge-updater.md, injected
into context). Your goal is to synchronize `knowledge/to-be/*.md` files
with the design decisions captured in spec.md and plan.md.

Key TO_BE_KU (Knowledge Update) phase rules:
- Read spec.md + plan.md for the source of changes
- Prepare a was/became proposal for each affected file
- **Owner-approve is mandatory** for each file
  (solo mode → single self-approve; team → per-owner approval)
- Summary must be synchronized with Details in every modified file
- `architecture.md` must stay ≤ 1500 lines
- Record all changes as `knowledge_updates[]` with `type: to_be_update`

## Steps

1. Read `specs/current/spec.md` + `specs/current/plan.md`
2. Read `knowledge/to-be/*.md` (FULL) for current state
3. Identify files listed in plan.md → Architecture Impact → Knowledge Files Affected
4. For each affected file, prepare change proposal:
   - What was (current content)
   - What becomes (proposed change)
   - Why (reference to spec/plan decision)
5. Present proposal to user and request owner-approve
6. Apply approved changes (round-trip YAML/Markdown via `@l1dder/yaml`)
7. Record audit in `state.knowledge_updates[]` with `type: to_be_update`
8. Initiate transition

## Acceptance Criteria

- [ ] All files listed in plan.md Knowledge Files Affected are updated
- [ ] Summary is synchronized with Details in every modified file
- [ ] Cross-references between to-be files are valid
- [ ] `knowledge_updates[]` contains entries for each change
- [ ] No duplication of content across files
- [ ] `to-be/architecture.md` ≤ 1500 lines

## Post-Conditions

- `current_phase == "update_tobe"`, `current_status == "completed"`
- Owner-approve obtained for each modified file
- `knowledge_updates[]` contains new entries with `type: to_be_update`
- `to-be/*.md` files updated and consistent

## Error Handling

| Scenario | Action |
|---|---|
| Owner rejects proposal | Revise proposal per feedback; re-request approval |
| `current_phase != plan` | Report current phase; suggest completing PLAN first |
| plan.md missing Knowledge Files Affected | Warn: "No knowledge files identified. Consider re-running `/l1dder-plan`" |
| architecture.md exceeds 1500 lines after update | Suggest splitting or summarizing; do NOT proceed until resolved |
| CLI exit 5 (GateRejected) | Report gate rejection; suggest addressing gate criteria |

## Notes

- After `/l1dder-update-tobe`, next step is `/l1dder-tasks` for task decomposition
- Owner-approve gate is the primary quality control for knowledge updates
