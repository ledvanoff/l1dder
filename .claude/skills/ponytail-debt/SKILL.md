---
name: ponytail-debt
description: "Harvest every shortcut: or ponytail: comment in the codebase into a debt ledger so deliberate shortcuts get tracked in docs/ideas.md or docs/backlog.md. Use for /ponytail-debt or during Sprint Doctor Checklist (TASK-NN.99)."
---

# Ponytail Debt

Every deliberate ponytail shortcut is marked with a `// shortcut: <what we simplified>, <limit / trigger when to upgrade>` (or `ponytail:`) comment naming its ceiling and upgrade path. This skill collects them into a ledger so a deferral can't quietly become permanent.

## Scan

Search the codebase (excluding `node_modules/`, `dist/`, `build/`, `.git/`, `docs/`, `l1dder/`, `.cursor/`, `.claude/`, `.agents/`, `.windsurf/`, `.github/`) for comment markers:

```
(#|//) ?(shortcut|ponytail):
```

Each hit is one ledger row.

## Output

One row per marker, grouped by file:

`path:line — ceiling: <what was simplified>. upgrade trigger: <when to replace>.`

Flag the rot risk: any `shortcut:` or `ponytail:` comment that names no upgrade path or trigger gets a `[no-trigger]` tag — those are the ones that silently rot and must be fixed or clarified during `TASK-NN.99` (`Doctor Checklist`).

End with `<N> markers, <M> with no trigger.` Nothing found: `No shortcut/ponytail debt. Clean ledger.`
