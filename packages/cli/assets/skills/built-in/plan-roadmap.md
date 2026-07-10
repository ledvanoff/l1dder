---
id: plan-roadmap
name: "Plan Roadmap"
format_version: 1
phase: specify
roles: [analyst, po]
trigger: manual
priority: 1
context_profile: null
tags: [discovery, roadmap, planning]
builtin: true
---

# Plan Roadmap

## Summary

Guide the user through defining MVP scope, discovery milestone coverage, and a discovery
session plan recorded in `knowledge/roadmap.md`. Estimates are AI-authored text, not code.

## When to Use

- Roadmap milestone is not met (`l1dder stage status` / `l1dder helpme` points to roadmap)
- Greenfield project after idea.md is drafted
- User asks to plan MVP or discovery sessions
- Keyword trigger: "plan roadmap", "discovery sessions", "MVP scope"

## Steps

1. Read `knowledge/idea.md` and current `knowledge/roadmap.md` (if any)
2. Run `l1dder helpme` — confirm current/next discovery milestone
3. Define **MVP scope**: what ships in first delivery vs later iterations
4. For each discovery artifact, estimate discovery sessions **per milestone**:
   - idea, roadmap, architecture, data model (erd), usecases
5. Document the discovery plan in `knowledge/roadmap.md` (iterations table or equivalent)
6. Confirm which milestones apply (M2): suggest disabling inapplicable flags in `config.yml` if needed
7. Stay in plan-mode; mark recommended scope/options explicitly

## Validation

- [ ] `knowledge/roadmap.md` is no longer skeleton (meaningful Summary + planned sessions)
- [ ] MVP scope is explicit
- [ ] Per-milestone session estimates are recorded as text in the roadmap
- [ ] User confirmed the plan before final write (protected dir — propose first)

## Output

- Updated `knowledge/roadmap.md` with discovery session plan and MVP scope
