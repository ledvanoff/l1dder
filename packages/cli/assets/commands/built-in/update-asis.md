---
id: update-asis
name: "Update Knowledge (As-Is)"
format_version: 1
phase: as_is_knowledge_update
trigger_kind: transition
role: knowledge-updater
skill: update-knowledge-asis
artifact_template: null
artifact_path: null
context_profile: null
accepts_argument: false
idempotent: true
requires_owner_approve: true
tags: [delivery, knowledge, as-is, promotion, p0]
builtin: true
---

# Update Knowledge (As-Is)

## Summary

Launches the AS_IS_KNOWLEDGE_UPDATE phase: performs As-Is Promotion —
synchronizes `knowledge/as-is/*.md` with what was actually implemented,
records audit in `knowledge_updates[]`, and initiates transition
`IMPLEMENT → AS_IS_KU`.

## When to Use

- Current phase: `IMPLEMENT` with all tasks done or skipped (PM11 guard)
- Implementation is complete; ready to update documentation
- Implementation-gate passed

## System Prompt

You are a Knowledge Updater (see agents/knowledge-updater.md, injected
into context). Your goal is to perform **As-Is Promotion**: synchronize
`knowledge/as-is/*.md` with the actual implementation.

Key AS_IS_KU phase rules:
- Compare what was implemented (code + git diff) against to-be design
- Move/copy realized to-be decisions into as-is
- If implementation drifted from to-be — create a separate drift proposal
  for Architect/PO (via Open Questions or new design file)
- **Owner-approve mandatory** for each modified file
- Record all changes with `type: promotion` in `knowledge_updates[]`

## Steps

1. Read `specs/current/spec.md`, `plan.md`, `tasks.md` + `git diff`
   (understand what was actually implemented)
2. Read `knowledge/as-is/*.md` (FULL) and `knowledge/to-be/*.md` (FULL)
3. Determine As-Is Promotion: which to-be decisions are now implemented
   → copy/move to as-is
4. Check for drift: if actual implementation diverged from to-be — prepare
   separate proposal for Architect/PO
5. Request owner-approve for each affected file
6. Apply approved changes
7. Record audit in `state.knowledge_updates[]` with `type: promotion`
8. Initiate transition

## Acceptance Criteria

- [ ] All implemented features are reflected in `as-is/*.md`
- [ ] Placeholder content replaced where applicable
- [ ] Cross-references between as-is files are valid
- [ ] `knowledge_updates[]` contains entries with `type: promotion`
- [ ] Gap between to-be and as-is aligns with roadmap (unrealized items noted)
- [ ] Any drift between implementation and to-be is documented

## Post-Conditions

- `current_phase == "as_is_knowledge_update"`, `current_status == "completed"`
- Owner-approve obtained for each modified file
- `as-is/*.md` files updated to reflect current implementation
- As-is-update-gate passed (config.yml.gates.as-is-update-gate)

## Error Handling

| Scenario | Action |
|---|---|
| Owner rejects as-is update proposal | Revise per feedback; re-request approval |
| Not all tasks done/skipped (PM11 guard) | Report remaining tasks; suggest completing them first |
| Significant drift from to-be detected | Document drift; suggest creating design revision task for next iteration |
| CLI exit 5 (GateRejected) | Report gate rejection; address gate criteria |

## Notes

- After `/l1dder-update-asis`, next step is `/l1dder-complete` to archive specs and close the iteration
- Owner-approve ensures documentation accuracy
