---
id: update-knowledge-tobe
name: "Update Knowledge (To-Be)"
format_version: 1
phase: update_tobe
roles: [knowledge-updater]
trigger: auto
priority: 1
context_profile: null
tags: [knowledge, discovery, to-be]
builtin: true
---

# Update Knowledge (To-Be)

## Summary

Run the `update_tobe` phase (TO_BE_KU / Knowledge Update): update the target
knowledge documents (`knowledge/to-be/*.md`) based on the results of the
discovery phases (SPECIFY + PLAN).

## When to Use

- The Phase Machine transitioned to `update_tobe` (trigger: auto)
- The user runs `/l1dder-update-tobe` (slash command)
- After PLAN is complete with a ready `spec.md` and `plan.md`

## Steps

1. Read `specs/current/spec.md` and `specs/current/plan.md` — what was decided
2. Read all `knowledge/to-be/*.md` files (FULL) — the current target state
3. Determine the delta: which decisions from spec+plan affect the target state
4. For each affected to-be file:
   - Prepare concrete changes (add/modify/remove sections)
   - Check that the Summary stays self-sufficient after the edits
   - Ensure there is no duplication with other to-be files
5. Propose all changes to the user for approval
6. Apply the approved changes
7. Check cross-references between to-be files (whether links are broken)

## Validation

- [ ] All affected `to-be/*.md` are updated and do not contradict each other
- [ ] The Summary of each updated file is self-sufficient
- [ ] No duplication of information between knowledge files
- [ ] Cross-references are correct

## Output

- Updated `knowledge/to-be/*.md` files
