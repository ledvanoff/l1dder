---
id: next
name: "Next"
format_version: 1
phase: "*"
trigger_kind: no_transition
# `none` = dispatcher, not a domain role: baking in a persona would tell the
# agent to do delivery work before the projection said that is the next step.
role: none
skill: null
artifact_template: null
artifact_path: null
context_profile: null
accepts_argument: false
idempotent: true
requires_owner_approve: false
tags: [navigation, entrypoint, projection, p0]
builtin: true
---

# Next

## Summary

Primary AI IDE entrypoint. Obtains the canonical Workflow Projection from the
CLI and dispatches exactly its Primary Action. Contains no local phase-routing
table and no transition heuristic — every routing decision comes from CLI output.

## When to Use

- Normal start of an Agent Session when you need "what should I do next?"
- After finishing a chunk of work and returning to the workflow navigator
- Prefer `/l1dder-next` over phase-specific slash commands for everyday flow

Phase-specific commands (`/l1dder-specify`, `/l1dder-plan`, `/l1dder-implement`,
…) remain available as an advanced/API surface. Do not treat them as the default
entrypoint.

## System Prompt

You are the L1DDER next-step dispatcher. Your only job is to read the canonical
projection from the CLI and execute the Primary Action it returns.

Hard rules:
- Do NOT invent the next phase, milestone, or gate outcome yourself
- Do NOT maintain or consult a local routing / NEXT_STEP table
- Do NOT call `l1dder transition` unless that exact command appears in the
  Primary Action (or in the phase command the Primary Action told you to load)
- If any blocker has `level` equal to `hard` (or omitted) → surface it and STOP
- Advisory blockers (`level: "advisory"`) are status, not a stop — print them
  and continue to the Primary Action. Do not invent an alternate next step
- Phase-specific `/l1dder-*` slash commands are advanced; `/l1dder-next` is normal

## Steps

1. Run in the terminal (exact command):

   ```
   l1dder now --json
   ```

   (`l1dder now` is an alias of `l1dder helpme`. The JSON payload is the
   projection-backed navigator: position, Primary Action, blockers.)

2. Parse the JSON. Locate:
   - `primary_action` — object with at least `kind`, `command`, `reason`
     (and optionally `milestone`, `to`, `needs_input`, `required_inputs`)
   - `blockers` — array (may be empty or absent); each entry may have `level`

   If the top-level keys are missing but the same fields appear under a nested
   object the CLI returned (e.g. discovery brief), use those — still do not
   invent values.

3. Blockers gate (fail closed for guessing):
   - Treat a blocker as **hard** when `level` is `"hard"` or `level` is omitted.
   - Treat a blocker as **advisory** when `level` is `"advisory"`.
   - If any **hard** blocker is present → print every blocker to the user and
     STOP. Suggest resolving them (often via the Primary Action / `l1dder doctor`)
     but do not pick an alternate next step yourself.
   - If the array is empty, or every entry is advisory → print advisory
     blockers (if any) and continue. Open Discovery milestones
     (`DISCOVERY_NOT_READY`) are advisory status, not a stop.

4. Empty / none action:
   - If `primary_action` is missing, `kind` is `none`, or `command` is empty →
     report current position + `reason` (if any) and ask the user what to do.
     Do not invent work.

5. Dispatch the Primary Action (exactly):
   a. Announce it to the user: `kind`, `reason`, and `command`.
   b. If `primary_action.needs_input` is true (or `required_inputs` is a
      non-empty array) → do **not** run `command` as-is. Ask the human for
      each listed flag. Values must be real project content — never
      placeholders such as `TODO`, `<text>`, or empty strings. Then run
      `command` with those flags appended (repeat a `repeatable` flag once
      per value).
   c. Otherwise execute `primary_action.command` in the terminal when it is a
      CLI invocation (doctor / discovery / stage / profile / transition / …).
   d. When `primary_action.to` names a delivery phase, continue agent work by
      loading the matching built-in phase slash asset
      (`.cursor/commands/l1dder-<id>.md`, where `<id>` is the phase with `_`
      replaced by `-`, e.g. `update_tobe` → `update-tobe`) and following that
      command's persona / skill / steps. Use ONLY the `to` value from the CLI
      output — never substitute a different phase.
   e. When the Primary Action is non-phase (recovery, profile, discovery
      milestone, stage advance), follow the CLI command output and the reason
      text; do not force a delivery-phase slash command.

6. After the dispatched work finishes for this turn, remind the user that the
   normal re-entry is again `/l1dder-next` (or `l1dder now`).

## Acceptance Criteria

- [ ] Ran `l1dder now --json` before choosing any next step
- [ ] Used `primary_action` / `blockers` from that output (no local routing table)
- [ ] Stopped cleanly when a **hard** blocker was present
- [ ] Continued through advisory blockers (including `DISCOVERY_NOT_READY`)
- [ ] Asked the human for `required_inputs` when `needs_input` was true;
      did not execute the bare command and did not invent placeholder values
- [ ] Executed the Primary Action's `command` / matching phase asset without
      substituting a different phase
- [ ] Did not duplicate transition heuristics inside this command

## Post-Conditions

- Agent followed the CLI projection for this turn
- No invented phase transitions
- User knows `/l1dder-next` remains the normal entrypoint

## Error Handling

| Scenario | Action |
|---|---|
| `l1dder now --json` fails / non-zero | Show stderr; suggest `l1dder doctor`; do not invent next step |
| JSON missing `primary_action` | Report raw position fields if present; ask user; do not guess |
| Hard blockers present | Surface blockers and STOP |
| Only advisory blockers | Print them; continue to the Primary Action |
| `needs_input` / `required_inputs` | Ask the human for each flag; then run `command` with those flags |
| Phase slash asset missing for `to` | Run `primary_action.command` only; tell user the advanced slash is unavailable |
| CLI says recovery (`doctor`) | Run that command; do not start delivery work |

## Notes

- This command has `trigger_kind: no_transition` — it never transitions by itself
- Canonical naming uses hyphens: `/l1dder-next` (not a dotted form)
- Advanced phase slashes stay available; they are not the default navigator
