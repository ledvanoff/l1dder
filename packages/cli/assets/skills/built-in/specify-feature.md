---
id: specify-feature
name: "Specify Feature"
format_version: 1
phase: specify
roles: [po, analyst, designer]
trigger: auto
priority: 1
context_profile: null
tags: [discovery, requirements]
builtin: true
---

# Specify Feature

## Summary

Run the SPECIFY phase: gather functional and non-functional requirements,
clarify implementation preferences, generate spec.md from the template.

## When to Use

- The Phase Machine transitioned to SPECIFY (trigger: auto)
- The user runs `/l1dder.specify` (slash command)
- The start of a new iteration after IDLE

**Not for trivial changes** — text edits, config tweaks, renames → use `l1dder quick`/`fast` instead.
Use full SPECIFY when the feature has ≥2 user scenarios or an external dependency.

## Discovery Discipline (Guided Discovery)

On discovery-stage projects:

1. Run `l1dder helpme` or `l1dder stage status` — name closed/current/next milestone.
2. Stay in **plan-mode**: present 2-3 options, mark the **recommended** one; confirm scope before writing files.
3. Work milestones in order: idea → roadmap (use **`plan-roadmap`** skill) → architecture → data model → usecases.
4. After each milestone pass, estimate discovery sessions per milestone and update `knowledge/roadmap.md`.
5. For significant decisions, record in `state.decisions[]` **and** create an ADR from `templates/specs/adr-template.md`.

## Steps

1. Read `knowledge/to-be/architecture.md` (FULL) for architectural context
2. Read `knowledge/to-be/usecases.md` for existing scenarios
3. Read `knowledge/idea.md` for business context
4. Start a dialog: ask the user about the feature goal (what they want, why)
5. Gather functional requirements (user stories / acceptance criteria)
6. Gather non-functional requirements (performance, security, scalability)
7. Ask clarifying questions about Implementation Preferences (stack, constraints, style)
8. Check scope: what is included, what is explicitly excluded
9. Produce `specs/current/spec.md` from the `templates/specs/spec-template.md` template
10. Run a self-review: Summary is self-sufficient, Scope is clear, Requirements are verifiable

## Validation

- [ ] `specs/current/spec.md` exists and contains all mandatory template sections
- [ ] `## Summary` ≤ 30 lines and self-sufficient
- [ ] `## Implementation Preferences` is non-empty
- [ ] `## Scope` and `## Out of Scope` are explicitly delineated
- [ ] Every requirement is verifiable (testable acceptance criteria)

## Output

- `specs/current/spec.md` — the feature specification
