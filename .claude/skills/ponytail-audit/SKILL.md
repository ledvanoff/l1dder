---
name: ponytail-audit
description: "Whole-repo audit for over-engineering and bloat. Scans the codebase for dead code, single-implementation abstractions, pass-through wrappers, and dependencies replaceable with stdlib/native features. Use for /ponytail-audit or during Sprint Doctor Checklist (TASK-NN.99)."
---

# Ponytail Audit

Repo-wide scan for over-engineering and bloat. Rank findings biggest cut first.

## Tags

- `delete:` dead code, unused flexibility, speculative feature. Replacement: nothing.
- `stdlib:` hand-rolled thing the standard library ships. Name the function.
- `native:` dependency or code doing what the platform already does. Name the feature.
- `yagni:` abstraction with one implementation, config nobody sets, layer with one caller.
- `shrink:` same logic, fewer lines. Show the shorter form.

## Hunt

Deps the stdlib or platform already ships, single-implementation interfaces, factories with one product, wrappers that only delegate, files exporting one tiny helper used once, dead flags and config, hand-rolled stdlib.

## Output

One line per finding, ranked: `<tag>: <what to cut/replace> [path] (-N lines)`.
End with `net: -N lines, -M deps possible.` Nothing to cut: `Lean already. Ship.`
