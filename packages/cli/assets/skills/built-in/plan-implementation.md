---
id: plan-implementation
name: "Plan Implementation"
format_version: 1
phase: plan
roles: [architect]
trigger: auto
priority: 1
context_profile: null
tags: [discovery, planning, architecture]
builtin: true
---

# Plan Implementation

## Summary

Run the PLAN phase: a technical implementation plan for the feature based on the
specification, an assessment of architecture impact, identification of files and risks,
generation of plan.md.

## When to Use

- The Phase Machine transitioned to PLAN (trigger: auto)
- The user runs `/l1dder.plan` (slash command)
- After SPECIFY is complete with a ready `spec.md`

## Steps

1. Read `specs/current/spec.md` (FULL) — the feature requirements
2. Read `knowledge/to-be/architecture.md` (FULL) for architectural context
3. Read `knowledge/to-be/erd.md` for the data model
4. Read `standards/conventions.md` for conventions (stack, style, testing)
5. Define the Technical Approach: which modules/packages are affected, which patterns to use
6. Assess Architecture Impact: do existing contracts, APIs, schemas change
7. Compile File Changes: a list of files to create/modify with a brief description
8. Define Dependencies: external packages, links between modules
9. Identify Risks: technical risks, trade-offs, points of uncertainty
10. Fill **Options Considered + Recommended** in plan.md; for significant decisions also create ADR from `templates/specs/adr-template.md` and append to `state.decisions[]`
11. Produce `specs/current/plan.md` from the `templates/specs/plan-template.md` template
12. Self-review: the plan is feasible within the current architecture without overengineering

## Validation

- [ ] `specs/current/plan.md` exists and contains all mandatory sections
- [ ] `## Technical Approach` describes concrete modules and patterns
- [ ] `## File Changes` contains a concrete file list (not abstract descriptions)
- [ ] `## Architecture Impact` explicitly answers: does the plan break existing contracts
- [ ] `## Risks` is non-empty (if there are no risks — write "No significant risks identified")

## Output

- `specs/current/plan.md` — the technical implementation plan
