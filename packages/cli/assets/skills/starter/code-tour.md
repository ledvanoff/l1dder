---
id: code-tour
name: "Code Tour"
format_version: 1
phase: init
roles: [architect, developer]
trigger: manual
priority: 5
context_profile: null
tags: [engineering, onboarding]
builtin: false
---

# Code Tour

## Summary

Produce a guided, step-by-step walkthrough of a codebase or a specific flow,
anchored to real files and line ranges. A tour is a narrative for a specific
reader — what they are looking at, why it matters, and where to go next.
Stack-agnostic and read-only.

## When to Use

- Onboarding a new contributor to a project or package
- Explaining the architecture of one service or module
- Walking a reviewer through the changed files of a PR
- Tracing a failure path during a root-cause investigation
- Any "explain how X works" request that benefits from a reusable guided path

## When NOT to Use

| Instead of a code tour | Do this |
|---|---|
| A one-off answer is enough | Answer directly in chat |
| The user wants prose docs | Write/update the docs |
| The task is implementation or refactoring | Do the work |
| Broad onboarding of an existing project | Use the `brownfield-scan` skill |

## Workflow

1. **Discover.** Explore before writing: entry points, folder structure,
   relevant config, and (for a PR tour) the changed files. Understand the shape
   of the code first.
2. **Infer the reader.** Choose a persona and depth from the request — a new
   joiner needs orientation (more steps); a reviewer needs the changed paths; an
   architect needs the module map and core execution path.
3. **Verify anchors.** Every file path and line must be real — confirm the file
   exists and the lines are in range. Never guess line numbers; for volatile
   files, anchor to a stable pattern or symbol instead.
4. **Write the tour** as an ordered sequence of steps. Keep step count
   proportional to repo size and reader depth.
5. **Validate.** Every referenced path/line is valid, the first step is anchored
   to a real file or directory (not prose-only), and the steps tell a coherent
   story rather than listing files.

## Step Anatomy

Each step points at something concrete (a directory for orientation, a file +
line or selection for substance) and explains it. A good description answers:

- **Situation** — what the reader is looking at
- **Mechanism** — how it works
- **Implication** — why it matters for this reader
- **Gotcha** — what a careful reader might miss

## Narrative Shape

Unless the task needs otherwise, follow this arc:

1. Orientation (where we are, what this is)
2. Module map (the main pieces)
3. Core execution path (follow one real flow end to end)
4. Edge case or gotcha
5. Closing — what the reader can now do

## Anti-Patterns

| Anti-pattern | Fix |
|---|---|
| Flat file listing | Tell a story; connect each step to the next |
| Generic descriptions | Name the concrete code path or pattern |
| Guessed anchors | Verify every file and line first |
| Too many steps for a quick tour | Cut aggressively |
| First step is prose-only | Anchor it to a real file or directory |
| Persona mismatch | Write for the actual reader |

---

<!-- Adapted from Everything Claude Code (ECC, skills/code-tour) by Affaan Mustafa.
     MIT License. Rewritten for L1DDER: neutral, tool-agnostic (no .tour format
     lock-in), no framework specifics. -->
