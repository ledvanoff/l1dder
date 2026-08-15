---
id: complete-iteration
name: "Complete Iteration"
format_version: 1
phase: complete
roles: [po]
trigger: auto
priority: 1
context_profile: null
tags: [delivery, completion, archive]
builtin: true
---

# Complete Iteration

## Summary

Run the COMPLETE phase: finalize the iteration — verify task completeness,
archive specs, update the roadmap and worklog, transition to IDLE.

## When to Use

- The Phase Machine transitioned to COMPLETE (trigger: auto)
- The user runs `/l1dder-complete` (slash command)
- After `update_asis` (AS_IS_KU) is complete

## Steps

1. Read `specs/current/` — all iteration artifacts (spec, plan, tasks)
2. Verify that all tasks from tasks.md are completed (statuses in state)
3. Verify that the Knowledge Update (as-is promotion) was performed
4. Archive the specs:
   - Move `specs/current/*` into `specs/archive/<iteration-id>/`
   - The iteration id comes from state.yml
5. Update `knowledge/roadmap.md`:
   - Mark completed tasks `[x]`
   - Add a line to "What's done"
6. Record the iteration in `archive/worklog.md` as a **structural retrospective** (M5),
   following `templates/specs/summary-template.md`: Implemented, Deviations from Plan,
   Decisions, Problems & Resolutions, DoD Result, Next. This is a "plan vs actual + lessons"
   record — not a free-form note. (Advisory: there is no CLI for it; the AI writes the entry.)
7. Final review: all artifacts are in place, knowledge is updated
8. Transition → IDLE

## Validation

- [ ] All tasks from tasks.md have status completed
- [ ] `specs/archive/<iteration-id>/` contains spec, plan, tasks
- [ ] `specs/current/` is empty (or contains only a placeholder)
- [ ] `roadmap.md` is updated
- [ ] `worklog.md` is updated with a structural retrospective (Implemented / Deviations / Decisions / Problems & Resolutions / DoD Result / Next)

## Output

- Archived specs in `specs/archive/<iteration-id>/`
- Updated `knowledge/roadmap.md` and `archive/worklog.md`
