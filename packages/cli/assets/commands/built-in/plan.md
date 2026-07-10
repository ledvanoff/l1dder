---
id: plan
name: "Plan Implementation"
format_version: 1
phase: plan
trigger_kind: transition
role: architect
skill: plan-implementation
artifact_template: templates/specs/plan-template.md
artifact_path: specs/current/plan.md
context_profile: null
accepts_argument: false
idempotent: true
requires_owner_approve: false
tags: [discovery, planning, architecture, p0]
builtin: true
---

# Plan Implementation

## Summary

Launches the PLAN phase: designs the technical approach for the specified
feature, fills `specs/current/plan.md` using the template, and initiates
transition `SPECIFY → PLAN`.

## When to Use

- Current phase: `SPECIFY` (spec.md exists and passes acceptance)
- User reviewed spec.md and is ready to proceed to planning
- Previous phase acceptance criteria are met

## System Prompt

You are an Architect (see agents/architect.md, injected into context).
Your goal is to design the **technical approach** for implementing
the feature from spec.md.

Key PLAN phase rules:
- Read spec.md FULL — you are designing HOW to implement WHAT is specified
- Technical Approach must include justification for key decisions
- File Changes must be a concrete list (not "various files")
- Architecture Impact must identify which knowledge files need updating
- Risks section is mandatory (at minimum: "No significant risks identified")
- Do NOT implement code (that is IMPLEMENT). Do NOT decompose tasks (that is TASKS)

## Steps

1. Read `specs/current/spec.md` (FULL) — understand what to implement
2. Read `knowledge/to-be/architecture.md` (FULL) — understand current design
3. Read relevant design specs from `design/` if referenced in spec.md
4. Design technical approach:
   - Which packages/modules are affected?
   - What new files/types are needed?
   - What existing code needs modification?
   - What are the key technical decisions?
5. Fill `specs/current/plan.md` sections:
   - Technical Approach (with alternatives considered)
   - File Changes (concrete list with action: create/modify)
   - Architecture Impact → Knowledge Files Affected
   - Dependencies (new packages, internal deps)
   - Risks (with mitigation)
6. Self-review: check ## Acceptance Criteria
7. If acceptance OK → initiate transition

## Acceptance Criteria

- [ ] `specs/current/plan.md` exists and contains no unfilled `{{...}}` markers
- [ ] `## Technical Approach` present with justification for key decisions
- [ ] `## File Changes` present with concrete file list
- [ ] `## Architecture Impact` → `Knowledge Files Affected` filled
      (needed for subsequent `/l1dder-update-tobe`)
- [ ] `## Risks` section present (at least one entry or explicit "none")
- [ ] No `<!-- TODO -->` without owner

## Post-Conditions

- `current_phase == "plan"`, `current_status == "in_progress"`
- `phase_history[-1]` contains transition from specify to plan with
  `trigger: { kind: slash, command: plan }`
- spec-gate passed (config.yml.gates.spec-gate: solo → auto self-approve)
- `specs/current/plan.md` exists and passes acceptance

## Error Handling

| Scenario | Action |
|---|---|
| Acceptance failed (e.g. missing File Changes) | Report criterion; offer to complete plan.md in dialog |
| `current_phase != specify` | Report current phase; suggest completing current flow first |
| spec.md does not exist or is incomplete | Suggest: "spec.md is missing/incomplete. Run `/l1dder-specify` first" |
| CLI exit 3 (ForbiddenTransitionError) | Forward stderr; suggest `l1dder status` |
| CLI exit 6/7 (CorruptedState/SchemaValidation) | Suggest `l1dder doctor --fix` |

## Notes

- After `/l1dder-plan`, the next step is `/l1dder-update-tobe` to apply knowledge updates identified in Architecture Impact
- Plan lives one iteration: archived after `/l1dder-complete`
