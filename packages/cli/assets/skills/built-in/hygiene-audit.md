---
id: hygiene-audit
name: "Hygiene Audit"
format_version: 1
phase: hygiene
roles: [architect, po]
trigger: manual
priority: 1
context_profile: null
tags: [hygiene, audit, drift]
builtin: true
---

# Hygiene Audit

## Summary

Run a Hygiene session: reconcile `knowledge/to-be/*` and `knowledge/as-is/*` with
the actual code and with each other, catch outdated or false statements, and pull
in anything from previous sessions that never made it into the knowledge base.
`l1dder doctor --deep` gives you the mechanical FACTS (missing sections, stale
timestamps, size gaps, broken cross-refs, orphan git-diff); this skill does the
SEMANTIC interpretation doctor cannot do on its own (DEC-6-1).

## When to Use

- The user explicitly starts a Hygiene session (`l1dder transition --to hygiene`)
- `l1dder doctor --deep` surfaces a hybrid-trigger advisory (drift count ≥
  `config.hygiene.drift_threshold`) recommending a Hygiene session
- Periodic maintenance cadence advisory fires in the `maintenance` stage
- Before closing an iteration, when a full knowledge sweep is warranted

## Steps

1. Run `l1dder doctor --deep --json` and read the full output — this is your
   mechanical baseline (structural drift, orphan git-diff, skill/adapter
   compliance where available).
2. For each finding, decide whether it is real drift or a false positive
   (e.g. a discovery-stage placeholder is expected, not drift).
3. Read every `knowledge/as-is/*.md` file in full and compare it against the
   actual code — not just the current iteration's scope. Flag statements that
   are outdated, false, or missing (e.g. "not implemented" for something that
   already shipped).
4. Read every `knowledge/to-be/*.md` file in full and confirm it reflects the
   latest accepted architectural decisions — no stale sections contradicting
   recent decisions.
5. Look for changes from previous sessions that were decided in chat but never
   written into `to-be/*` or `as-is/*` — bring them in now.
6. Verify cross-references between as-is/to-be/design files resolve correctly.
7. Produce a concrete fix plan: which files change, what exactly moves from
   "drift" to "reconciled".
8. Apply the fixes (with user confirmation for protected directories:
   `knowledge/`, `standards/`, `templates/`, `archive/`).
9. Re-run `l1dder doctor --deep` to confirm the drift count has dropped, and
   walk through the manual `standards/doctor-checklist.md` blocks not yet
   covered by automated checks (documentation hygiene, specs consistency).

## Validation

- [ ] `l1dder doctor --deep --json` findings have all been triaged (fixed or
      explicitly justified as false positives)
- [ ] Every `as-is/*.md` and `to-be/*.md` file was read in full, not just the
      files related to the current iteration
- [ ] No outdated or false statements remain in as-is/to-be
- [ ] Any decision made in a previous session but not yet documented has been
      added
- [ ] `doctor-checklist.md` blocks 1, 3, 4, 6 (and 2, 5, 7 where applicable)
      have been walked through

## Output

- Updated `knowledge/as-is/*.md` / `knowledge/to-be/*.md` (with user
  confirmation)
- A short summary of what changed and why, suitable for the worklog
- `l1dder transition --to idle` once the audit is complete
