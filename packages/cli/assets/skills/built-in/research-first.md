---
id: research-first
name: "Research First"
format_version: 1
phase: specify
roles: [analyst, architect]
trigger: manual
priority: 2
context_profile: null
tags: [discovery, research, specify]
builtin: true
---

# Research First

## Summary

Before committing to a design or implementation approach, research existing solutions,
patterns, and prior art. Reduces reinventing the wheel and surfaces trade-offs early.

## When to Use

- Starting a new discovery milestone (architecture, integrations, data model)
- User asks "how do others solve this?" or "what libraries exist?"
- Before filling `## Options Considered + Recommended` in plan.md or an ADR
- Keyword trigger: "research first", "look for existing solutions"

## Steps

1. Clarify the research question (one sentence)
2. Search: official docs, mature open-source projects, patterns in `references/` (read-only)
3. Summarize 2-4 candidates with pros/cons (do not copy proprietary code)
4. Mark a **recommended** option with rationale
5. If the finding is a significant decision, record in `state.decisions[]` and create ADR from `templates/specs/adr-template.md`
6. Present results in plan-mode; confirm with user before writing final artifacts

## Validation

- [ ] At least two alternatives were considered (or explicit "no alternatives found")
- [ ] Recommended option is clearly marked
- [ ] Sources are cited (links or project names)

## Output

- Research summary (chat or inline in plan.md / ADR)
- Optional: ADR document for architectural decisions
