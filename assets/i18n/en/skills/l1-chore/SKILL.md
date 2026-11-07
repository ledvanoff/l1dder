---
name: l1-chore
description: Makes maintenance changes to the project repository itself, not to what its users see (git rules and hooks, CI, dependency updates, build scripts, Makefile, tests, AI agent rules), outside the L1DDER roadmap with a single "ok" stop, runs make ci, and logs CHORE-NNN in docs/backlog.md. Refuses product changes and points to /l1-task or /l1-hotfix. Use when the user invokes /l1-chore or asks for a chore or maintenance change.
---

# L1DDER — Project Maintenance Change (`/l1-chore`)

## What this command is for

`/l1-chore` is for changes to **the project itself**, not to what your users see and use. For example:

- change how you work with git: how branches and commits are named, what is checked before a push;
- set up automatic checks in CI;
- update libraries and dependencies;
- fix the `Makefile`, build scripts or tests;
- change the rules for your AI agent.

These changes need no idea, spec or sprint. The agent suggests how to do it, you answer "ok", and the change is logged as one line in `docs/backlog.md`.

If a change alters what people see or use (a new capability, different behaviour of a screen, command or API, a fix for a product bug), it is not `/l1-chore`: the agent will suggest `/l1-task` or `/l1-hotfix`.

> **MODEL INSTRUCTION:** When the user invokes the command or asks what it is for, retell this section in your own words, without terms like "Roadmap Gate" or "outside the roadmap".

---

## STEP 1: Check that this is a change to the project itself

1. Work out what exactly the user wants to change and ask yourself: **will the product's users notice it** — a new capability, different behaviour of a screen, command, API or CLI, a fix for a product bug?
2. **If yes**, it is not a maintenance change. Stop, **do not change any file**, and explain why in the plain words of the section above: the change alters the product, so it needs its own path. Suggest:
   - a new capability or a behaviour change → `/l1-idea` and `/l1-feature`, then `/l1-planning` and `/l1-task`;
   - an urgent product bug → `/l1-hotfix`.
3. **If no** (an internal change: git, CI, dependencies, scripts, tests, `Makefile`, environment or agent settings), go to Step 2.
4. If unsure, do not decide alone: ask the user one question — will their users notice the change?

---

## STEP 2: Read `docs/backlog.md` and work out `CHORE-NNN`

1. Read `docs/backlog.md` and find the section `` ## 4. Chore Log (`CHORE-NNN`) ``.
2. Find the highest `CHORE-NNN` number and add `+1` (three digits: `CHORE-001`, `CHORE-002`...). If there is no section or no entries yet, the next number is `CHORE-001`.
3. Read the files the change touches and everything that depends on them (scripts, configs, calling code, tests).

---

## STEP 3: Suggest options, show the `CHORE-NNN` card and STOP (`⛔ STOP`)

1. Suggest 1–3 ways to do it and recommend the simplest reliable one per `ponytail`.
2. Print the card in chat:

```markdown
### Maintenance change `CHORE-NNN`

| Field | Value |
|-------|-------|
| **Chore ID** | `CHORE-NNN` |
| **What and why** | [What changes in the project itself and which problem it solves — 1–2 plain sentences] |
| **Recommended option (`ponytail`)** | [Which files change and how] |
| **Tests** | [Which logic gets tests, or "no logic, configuration only"] |
| **Check** | `make ci` |
| **Commit message** | `chore(<scope>): <what was done>` |
```

Ask: *"Shall we make maintenance change `CHORE-NNN` (ok / edits)?"* — and wait for the answer. Do not change project files before the "ok".

---

## STEP 4: Make the change and run `make ci` (ONLY after "ok")

1. Make the minimal change strictly within the card (`ponytail`): no drive-by refactoring and no change to product behaviour.
2. Cover non-trivial logic (a script, a condition, data parsing) with tests slice by slice (`tdd`): one test → see it fail → minimal code.
3. Run `make ci`: 0 errors. If the project has no `make ci`, run the checks from `l1dder/rules/30-tech-stack.mdc`.

---

## STEP 5: Log `CHORE-NNN` in `docs/backlog.md` and commit

1. If `docs/backlog.md` has no section 4 yet (the project was created on an older `L1DDER` version), add it to the end of `docs/backlog.md` character for character:

```markdown
## 4. Chore Log (`CHORE-NNN`)

> Internal repository maintenance changes that do not alter product behavior, executed via `/l1-chore`.

| Chore ID | Date | What and why | Commit message |
|:--------:|------|--------------|:--------------:|
```

2. Add a row to the section 4 table following this example:

```markdown
| `CHORE-001` | 2026-10-21 | Branch name check in the `pre-push` hook: branches without a `feat/`, `fix/`, `chore/` type are no longer pushed | `chore(git): check branch names before push` |
```

3. Commit the change together with the log row, using the message from the card and the project's Git rules (`l1dder/rules/10-conventions.mdc`). Push only if the user asked or the project does so (`l1dder/rules/30-tech-stack.mdc`).

---

## STEP 6: Self-check before replying (Exit Gate)

- [ ] 1. The change does not alter product behaviour for its users?
- [ ] 2. The user said "ok" to the `CHORE-NNN` card before any file was changed?
- [ ] 3. Non-trivial logic is covered by tests and `make ci` finished with 0 errors?
- [ ] 4. The `CHORE-NNN` row is in section 4 of `docs/backlog.md` (the section was created if it was missing)?
