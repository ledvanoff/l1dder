---
name: l1-fast
description: Builds a small product feature in fast mode when no sprint is active - clarifies the feature, waits for one "ok", then autonomously implements it and runs every L1DDER check (tdd, make ci, ponytail-review, two-axis code-review, ponytail-audit, ponytail-debt, E2E, docs sync, retro) before a second "ok" after manual testing, and only then fills every registry (IDEA, FEAT, SPRINT, TASK, TASK-NN.99) marked "mode: /l1-fast". Refuses while a sprint sits at 1 (CURRENT). Use when the user invokes /l1-fast or asks to quickly build a small feature.
---

# L1DDER — Fast Mode for a Small Feature (`/l1-fast`)

## What this command is for

`/l1-fast` is for quickly building **a small product feature** when no sprint is in progress. You describe what you want, the agent asks clarifying questions and suggests a solution. After your "ok" it writes the code itself, checks it with every check the usual path uses, and comes back with the result and a list of what to test by hand. Once you accept the work, the agent fills in all the documents: the idea, the feature, the sprint and the tasks, marked as written after the code.

Only the order and the number of stops differ from the usual path: you answer "ok" twice, not at every step of the idea, spec, planning and tasks. The checks and tests are the same, none is skipped.

A large feature, a bug or a change to the project itself has its own command: the agent will tell you which one fits.

> **MODEL INSTRUCTION:** When the user invokes the command or asks what it is for, retell this section in your own words, without terms like "Roadmap Gate".

---

## STEP 1: Check the roadmap

1. Read `docs/roadmap.md` and look at row `1 (CURRENT)` in the `Delivery Queue` table.
2. **If position `1 (CURRENT)` is taken by a regular sprint**, refuse outright. Stop, **do not change any file**, and say that fast mode only works when no sprint is in progress. Name the two ways out, the user picks:
   - finish the current sprint with `/l1-task`;
   - reject the current sprint and roll back all its changes with `/l1-planning`.
3. **If `1 (CURRENT)` holds a reservation marked (mode: `/l1-fast`)**, it is an interrupted fast feature. Do not reserve or build a second fast feature on top of it, and do not change any file. Ask the user which to choose:
   - continue this feature from Step 5: reread the reservation, the card in the roadmap history, the code and the commits since the reservation;
   - reject it and roll back its changes with `/l1-planning`.
4. Work out what exactly the user wants. `/l1-fast` is for a new capability or a change in product behaviour. If it is something else, do not change any file and suggest the right command:
   - a product bug → `/l1-hotfix`;
   - a change to the project itself that product users will not notice (git, CI, libraries, `Makefile`, agent rules) → `/l1-chore`.
5. If position `1 (CURRENT)` is empty and this is a product feature, go to Step 2.

The refusal covers building only, that is a second `/l1-fast` and `/l1-task`. Preparing other features is not blocked: `/l1-idea`, `/l1-feature` and `/l1-planning` queueing at `2 (NEXT)` work in parallel, for example in another tab.

---

## STEP 2: Clarify the feature and assess its size

1. Read `docs/concept/` (if present), `l1dder/rules/30-tech-stack.mdc` and the code the feature touches.
2. Close the open forks in short rounds using the `grilling` skill: ask only what changes the solution, give a recommendation with each question. The step is done when no open forks remain.
3. Check the **signs of a large feature**. One is enough:
   - more than 3 tasks or it will not fit in one sprint;
   - a new data model, an external integration or a decision that needs an ADR;
   - breaking changes;
   - it needs a separate requirements review, one discussion will not cover it.
4. If a sign fires, name it and suggest the usual path: `/l1-idea` → `/l1-feature` → `/l1-planning` → `/l1-task`. The user decides. If they insist on `/l1-fast`, carry on and record that in the task summary (`summary.md`).

---

## STEP 3: Suggest a solution and STOP (`⛔ STOP #1`)

1. Pick a solution using `ponytail` (the simplest thing that fully solves the task) and `codebase-design` (deep modules, public seams for tests).
2. Slice the work into 1–3 tasks. One is usually enough.
3. Work out the IDs you will reserve. Count the next number from both the registries and the rows of `docs/roadmap.md`: it may hold reservations not yet in the registries.
   - `IDEA-NNN` from `docs/ideas.md`;
   - `FEAT-NNN` from `docs/backlog.md`;
   - `SPRINT-NN` from `docs/roadmap.md`, completed sprints included;
   - `TASK-NN.01 .. TASK-NN.0K` and `TASK-NN.99`.
4. Print this card in chat:

```markdown
### Fast feature `FEAT-NNN` (mode: `/l1-fast`)

| Field | Value |
|-------|-------|
| **What we build** | [The feature in plain words — 1–2 sentences] |
| **Solution (`ponytail`)** | [Which files change and how] |
| **Public seams and tests** | [What we test and what it catches] |
| **Tasks** | `TASK-NN.01` [title], `TASK-NN.99` (Doctor Checklist) |
| **IDs to reserve** | `IDEA-NNN` → `FEAT-NNN` → `SPRINT-NN` |
| **Size signs** | ["none fired" or which one fired and what the user decided] |
| **Checks before the second stop** | The full list of Step 6 |
```

5. Ask: *"Shall we build fast feature `FEAT-NNN` (ok / changes)?"* and wait for the answer. Do not change project files before the word "ok".

---

## STEP 4: Reserve the IDs in the roadmap (right after "ok", before any code)

1. Right after "ok", before the first line of code, write the reservation to `docs/roadmap.md`:
   - a row at position `1 (CURRENT)` in the `Delivery Queue` table:

```markdown
| **1 (CURRENT)** | `SPRINT-NN` | `FEAT-NNN` | `IDEA-NNN` | P2 | [Goal] (mode: `/l1-fast`) | 0/K (+ TASK-NN.99) | 🚧 in-progress | — *(after the build)* |
```

   - in the "Current focus" table, `SPRINT-NN` with status `🚧 in-progress`;
   - in the "Roadmap change history", a row: `SPRINT-NN` (`FEAT-NNN` ← `IDEA-NNN`) put at `1 (CURRENT)` in `/l1-fast` mode.
2. The other registries are filled in Step 7. The reservation lets an interrupted session and other commands see the work in progress and keeps them from taking the same numbers.

---

## STEP 5: Build the feature

1. Read the skills you need from `l1dder/rules/40-skills-router.mdc`: `ponytail`, `codebase-design`, `tdd` and the stack skills.
2. Write the code in vertical slices using `tdd`: one public seam → one failing test (`RED`) → minimal code (`GREEN`) → the next slice. For every changed file run the `Edit → Sanitize → Verify` loop from `l1dder/rules/10-conventions.mdc`.
3. Work autonomously: settle any question the code, the rules or the spec can answer. Stop for two reasons only:
   - the work grew and a size sign from Step 2 fired — stop and assess the size again together with the user;
   - a decision only a human can make is needed (product behaviour the card did not cover).

---

## STEP 6: Check everything and STOP (`⛔ STOP #2`)

The checks are the same as for a usual task and for `TASK-NN.99` (`l1dder/templates/tasks/doctor-checklist-template.md`), none is skipped. Go through the whole list in order:

1. `make ci` — 0 errors.
2. Review your own diff with `ponytail-review`: every caller checked, no extra code, deliberate shortcuts marked `// shortcut:`.
3. Two-axis `code-review`: the `Standards` axis (`10-conventions.mdc`, `30-tech-stack.mdc`, module depth) and the `Spec` axis (every item of the Step 3 card is done).
4. `ponytail-audit` on the touched code and `ponytail-debt`: every `shortcut:` marker is fixed or logged in `docs/backlog.md`.
5. E2E: `make test-e2e` (if present) and a live run of the feature scenarios in the environment or browser with no errors.
6. For every bug found, `diagnosing-bugs`: a failing test first (`RED`), then the fix.
7. Living Docs Sync: check and update `docs/concept/`, the rules `l1dder/rules/*.mdc` and `docs/adrs/` if the feature changes them.
8. `retro`: where the agent stumbled in this work and what to fix in the rules or the `Makefile`.

Fix review and audit findings yourself and run the list again from item 1, without stopping. The step is done when the whole list passes with no findings in a row.

Then print in chat:
- a results table for items 1–8;
- a step-by-step manual test script for the human: how to start it, what to do, what should happen;
- the 2-line `ponytail` footer: **Ponytail skipped** (what was deliberately not done or not checked) and **Risk** (which limit the user must know).

Ask: *"Please test feature `FEAT-NNN` with the steps above and reply "ok" (or with remarks)"* and wait for the answer.

If the human sent remarks: fix them as in Step 5 (a bug through `diagnosing-bugs`), go through the whole Step 6 list again and stop again with a new report. Until "ok", do not fill the registries or make the final commit.

---

## STEP 7: Fill every registry and commit (ONLY after the second "ok")

1. Recheck the `IDEA-NNN`, `FEAT-NNN` and `SPRINT-NN` numbers against the registries. If a number has been taken meanwhile, take the next free one and fix the reservation in `docs/roadmap.md`.
2. Fill the documents from the templates in `l1dder/templates/`. Add the mode row to the passport of every document and use the real dates:

```markdown
| **Mode** | `/l1-fast` |
```

   - `docs/ideas.md` — the `IDEA-NNN` row and card with status `✅ realized` and a link to `FEAT-NNN`;
   - `docs/backlog.md` — `FEAT-NNN` in Table 1 and in Section 2 with sprint `SPRINT-NN` and its tasks, every status `✅ realized`;
   - `docs/specs/FEAT-NNN-<slug>/` — `requirements.md`, `design.md`, `tasks.md`, short and matching what was built;
   - `docs/sprints/SPRINT-NN-<slug>/README.md` — the passport, the task table and the "Sprint summary";
   - for every `TASK-NN.MM` and for `TASK-NN.99` — `plan.md` and `summary.md` in `docs/sprints/SPRINT-NN-<slug>/tasks/`. In `plan.md`, the solution from the Step 3 card and in the passport `` `/l1-fast`, written after the build <date> ``. In `summary.md`, the Step 6 results, the manual test remarks and the user's decision on size signs, if there was one;
   - `docs/roadmap.md` — move the `SPRINT-NN` row from `Delivery Queue` to "4. Completed Sprints", free position `1 (CURRENT)`, update "Current focus" and the "Roadmap change history".
3. Run `make ci` and `npx l1dder doctor`: 0 errors.
4. Commit the code and the documents in one commit following the project Git rules (`l1dder/rules/10-conventions.mdc`), for example `feat(<scope>): <what was done>`. Stage only your own files, by path (`git add <path>`): this feature's code and the documents with its IDs. Leave other changes as they are, such as a spec from another tab, and name them to the user. Push only if the user asked or the project does so (`l1dder/rules/30-tech-stack.mdc`).
5. Tell the user the outcome: what was done and the list of created documents with their IDs.

---

## STEP 8: Self-Check Before Replying (Exit Gate)

- [ ] 1. Position `1 (CURRENT)` was empty before the work started (or the user chose to continue their own `/l1-fast` reservation), and this is a product feature?
- [ ] 2. The "ok" on the Step 3 card came before any edit, and the roadmap reservation was written before any code?
- [ ] 3. The whole Step 6 list passed with no findings, and the human said "ok" after manual testing?
- [ ] 4. Every registry is filled with the `/l1-fast` mode row, the sprint is moved to completed, `make ci` and `doctor` are green, the commit is made?
