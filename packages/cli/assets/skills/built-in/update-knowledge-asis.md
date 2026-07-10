---
id: update-knowledge-asis
name: "Update Knowledge (As-Is)"
format_version: 1
phase: update_asis
roles: [knowledge-updater]
trigger: auto
priority: 1
context_profile: null
tags: [knowledge, delivery, as-is, promotion]
builtin: true
---

# Update Knowledge (As-Is)

## Summary

Run the AS_IS_KNOWLEDGE_UPDATE phase: promote implemented decisions
from `to-be/*.md` into `as-is/*.md` (As-Is Promotion) after delivery is complete.

## When to Use

- The Phase Machine transitioned to AS_IS_KNOWLEDGE_UPDATE (trigger: auto)
- The user runs `/l1dder.update-asis` (slash command)
- After IMPLEMENT is complete with implemented code

## Steps

1. Read `specs/current/spec.md`, `plan.md`, `tasks.md` — what was implemented
2. Read all `knowledge/as-is/*.md` — the current implemented state
3. Read the corresponding `knowledge/to-be/*.md` — the target state (the reference)
4. Determine what from to-be is now implemented (As-Is Promotion):
   - Which decisions from to-be/architecture.md are implemented in code
   - Which entities from to-be/erd.md are implemented in schemas
   - Which scenarios from to-be/usecases.md are implemented
5. Update the as-is files: add the implemented sections with a version mark
6. Remove placeholders in as-is if they are replaced by real data
7. Propose the changes to the user for approval
8. Check the gap: the difference to-be vs as-is = what is still left to implement

## Validation

- [ ] All implemented features are reflected in `as-is/*.md`
- [ ] Placeholders are replaced (where applicable)
- [ ] The Summary of each updated file is self-sufficient
- [ ] The gap between to-be and as-is is consistent with the roadmap

## Output

- Updated `knowledge/as-is/*.md` files
