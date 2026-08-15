---
id: complete
name: "Complete Iteration"
format_version: 1
phase: complete
trigger_kind: transition
role: po
skill: complete-iteration
artifact_template: null
artifact_path: null
context_profile: null
accepts_argument: false
idempotent: false
requires_owner_approve: false
tags: [delivery, completion, archive, p0]
builtin: true
---

# Complete Iteration

## Summary

Launches the COMPLETE phase: archives specs, updates roadmap and worklog,
and initiates transition `update_asis → complete`. The Phase Machine then
auto-transitions `complete → idle` (PM3 rule #9: `auto:iteration-done`).

## When to Use

- Current phase: `update_asis` (AS_IS_KU / as-is update completed)
- As-is-update-gate passed; all tasks done or skipped
- Ready to close the current iteration

## System Prompt

You are a PO (see agents/po.md, injected into context).
Your goal is to **close the iteration**: archive deliverables, update
long-term records, verify completeness.

Key COMPLETE phase rules:
- Archive specs to `specs/archive/<iteration-id>/`
- Update `roadmap.md`: mark completed items `[x]`, add to "What was done"
- Record iteration summary in `archive/worklog.md`
- This is NOT idempotent — double completion is not meaningful

## Steps

1. Read `specs/current/*`, `state.tasks.items[]`, `state.knowledge_updates[]`
2. Verify all tasks are done/skipped (final check)
3. Archive specs: move `specs/current/*` → `specs/archive/<iteration-id>/`
4. Update `knowledge/roadmap.md`:
   - Mark completed iteration items `[x]`
   - Add summary line to "What was done" section
5. Record iteration entry in `archive/worklog.md`
6. Initiate transition `update_asis → complete`
7. Phase Machine auto-transitions `complete → idle`
   (PM3 rule #9, trigger: `auto:iteration-done`)

## Acceptance Criteria

- [ ] `specs/current/` is empty (all files moved to archive)
- [ ] `specs/archive/<iteration-id>/` contains spec.md, plan.md, tasks.md
- [ ] `roadmap.md` updated with completion markers
- [ ] `archive/worklog.md` updated with iteration entry
- [ ] Iteration counter incremented (if used)

## Post-Conditions

- `current_phase == "idle"` (after auto-transition COMPLETE → IDLE)
- `phase_history[]` contains TWO new entries:
  1. `{ from: update_asis, to: complete, trigger: { kind: slash, command: complete } }`
  2. `{ from: complete, to: idle, trigger: { kind: auto, source: iteration-done } }`
- `specs/archive/<iteration-id>/` contains archived deliverables
- Project ready for next iteration

## Error Handling

| Scenario | Action |
|---|---|
| Not all tasks done/skipped | Report remaining tasks; suggest completing them |
| `current_phase != update_asis` | Report current phase; suggest completing AS_IS_KU (`update_asis`) first |
| Archive directory already exists (collision) | Append timestamp suffix to avoid overwrite |
| Roadmap file not found | Warn; proceed with archiving (non-fatal) |

## Notes

- This is the only command with `idempotent: false` — repeated invocation in IDLE has no meaning
- Double transition mechanism: slash triggers `update_asis → complete`; auto-trigger completes `complete → idle`
- After `/l1dder-complete`, next step is `/l1dder-specify` (new iteration) or `/l1dder-constitution` (ground rules refinement)
