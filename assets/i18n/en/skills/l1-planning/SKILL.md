---
name: l1-planning
description: Updates the L1DDER Roadmap (docs/roadmap.md — Single Source of Truth), assigns SPRINT-NN and TASK-NN.01..99 IDs to feature steps FEAT-NNN.01..99, updates docs/backlog.md and docs/specs/FEAT-NNN/tasks.md, and creates docs/sprints/SPRINT-NN-<slug>/README.md. Also rejects the current sprint: rolls back its code with git revert, keeps its documents and marks it rejected. Use when the user invokes /l1-planning or asks to reject the current sprint.
---

# L1DDER — Flow 3: Roadmap Planning (`/l1-planning`)

> **MODEL INSTRUCTION:** Execute strictly step by step (1 → 2 → 3 → 4 → 5). `docs/roadmap.md` is the Single Source of Truth. Never modify files before receiving `"ok"` at Step 3.
>
> **Rejecting a sprint:** if the user asks to reject the current sprint and roll back its changes, skip Steps 1–5 and go to the "BRANCH: Reject the current sprint" section at the end of this file.

---

## ID Assignment Rule During Planning

When a sprint candidate from `FEAT-NNN` (parent `IDEA-NNN`) is placed in the `Delivery Queue` of `docs/roadmap.md`:
1. The sprint receives a two-digit ID `SPRINT-NN` (`SPRINT-01`, `SPRINT-02`...).
2. The sprint folder is named `docs/sprints/SPRINT-NN-<slug>/`.
3. Every feature step `FEAT-NNN.MM` receives a paired sprint task ID `TASK-NN.MM`:
   - `FEAT-NNN.01` → `TASK-NN.01`
   - `FEAT-NNN.02` → `TASK-NN.02`
   - `FEAT-NNN.99` → `TASK-NN.99` *(mandatory final Doctor Checklist task)*
4. Feature status in `docs/backlog.md` changes from `📋 in-backlog` to `🗓 scheduled`.

---

## STEP 1: Read Input Files

Read `docs/ideas.md`, `docs/backlog.md`, `docs/roadmap.md` (or `l1dder/templates/roadmap/roadmap-template.md`), and `l1dder/templates/sprints/sprint-template.md`.

---

## STEP 2: Gather Candidates & Compute `SPRINT-NN` and `TASK-NN.MM`

Find all features with status `📋 in-backlog` (or `🗓 scheduled` / `🚧 in-progress`) in `docs/backlog.md` and all `📋 unrealized` ideas in `docs/ideas.md`. Compute the next sequential `SPRINT-NN`.

---

## STEP 3: Propose `docs/roadmap.md` Update & `⛔ STOP`

Show the proposed `1. Active Pointer`, `2. Delivery Queue` (`1 CURRENT`, `2 NEXT`...), and `3. Discovery Queue` in chat.
⛔ **STOP:** Ask: *"Approve this Roadmap queue in `docs/roadmap.md` and IDs `SPRINT-NN` / `TASK-NN.MM` (ok / reorder)?"* and wait.

---

## STEP 4: Write Changes to 4 Locations (ONLY after `"ok"`)

1. **Location 1 (`docs/roadmap.md`):** update `Active Pointer`, `Delivery Queue`, `Discovery Queue`, and `Changelog`.
2. **Location 2 (`docs/backlog.md`):** set `FEAT-NNN` status to `🗓 scheduled`, link `SPRINT-NN`, and populate `TASK-NN.01 .. TASK-NN.99`.
3. **Location 3 (`docs/specs/FEAT-NNN-<slug>/tasks.md` & `requirements.md`):** fill in `SPRINT-NN` and `TASK-NN.01 .. TASK-NN.99`.
4. **Location 4 (`docs/sprints/SPRINT-NN-<slug>/README.md`):** create the sprint README from `l1dder/templates/sprints/sprint-template.md` with full ID Passport and task table ending with `TASK-NN.99`.

---

## STEP 5: Self-Check Exit Gate

- [ ] 1. Exactly one sprint is marked `1 (CURRENT)` in `docs/roadmap.md`?
- [ ] 2. Every row in `Delivery Queue` lists all three IDs (`SPRINT-NN`, `FEAT-NNN`, `IDEA-NNN`)?
- [ ] 3. `docs/backlog.md` and `docs/specs/FEAT-NNN-<slug>/tasks.md` have `SPRINT-NN` and `TASK-NN.01..99` with status `🗓 scheduled`?
- [ ] 4. `docs/sprints/SPRINT-NN-<slug>/README.md` exists and ends with `TASK-NN.99` (`Doctor Checklist`)?

Reply:
- *"Roadmap (`docs/roadmap.md`) updated. Active sprint: `SPRINT-NN` (`FEAT-NNN` ← `IDEA-NNN`)."*
- *"Next step: run `/l1-task` to start `TASK-NN.01`."*

---

## BRANCH: Reject the current sprint

A rejection frees position `1 (CURRENT)` honestly: the sprint code is rolled back without rewriting history, and the sprint documents stay as a record with the reason.

### R1: Show what will be undone

1. Read `docs/roadmap.md`, `docs/backlog.md` and the README of the sprint at position `1 (CURRENT)` (a `/l1-fast` reservation has no README yet).
2. Find where the sprint starts — the commit that first added `SPRINT-NN` to the roadmap: `git log -S "SPRINT-NN" --format="%h %s" -- docs/roadmap.md` (the oldest one in the output). For a regular sprint it is the planning commit, for a fast one the reservation commit.
3. List the commits after it: `git log --format="%h %s" <start>..HEAD`. Leave hotfix and chore commits (`HOTFIX-NNN`, `CHORE-NNN` from `docs/backlog.md`) out of the rollback by default.
4. Show uncommitted changes: `git status`.

### R2: Show the card and STOP (`⛔ STOP`)

1. Print this card in chat:

```markdown
### Rejecting sprint `SPRINT-NN` (`FEAT-NNN` ← `IDEA-NNN`)

| Field | Value |
|-------|-------|
| **Reason** | [Why we reject it — in the user's words] |
| **Sprint start** | `<hash>` [commit message] |
| **Rolled back (`git revert`)** | `<hash>` [message], ... |
| **Kept** | `<hash>` `HOTFIX-NNN` / `CHORE-NNN`, ... or "—" |
| **Uncommitted changes** | [Files from `git status`] → keep / move to `git stash` / commit to the sprint and roll back with it |
| **Feature `FEAT-NNN`** | `❌ rejected` or back to `📋 in-backlog` for a new sprint |
| **Sprint documents** | Stay as a record with status `❌ rejected` |
```

2. Ask: *"Shall we reject `SPRINT-NN` and roll back its code (ok / changes)?"* and wait for the answer. Change nothing before the word "ok".

### R3: Roll back the sprint code (ONLY after "ok")

1. Handle uncommitted changes only the way the user chose on the card: keep them, move them to `git stash`, or commit them to the sprint and roll them back with it.
2. Revert the commits from the card, newest to oldest, as one set with no commit per revert: `git revert --no-commit <newest-hash> ... <oldest-hash>`. History is kept; do not use `reset --hard` or any history rewrite, they lose work without a trace.
3. Bring the documents the rollback touched back to their state before it: `git diff --cached --name-only -- docs/ | xargs git checkout HEAD --`. Only the paths from the rollback are taken, so uncommitted changes in `docs/` the user chose to keep (such as a spec from another tab) stay intact. The sprint code goes away, its documents stay as a record.
4. If git reports a conflict, stop: show the conflicting files and ask the user how to resolve it. Do not resolve the conflict yourself.
5. Run `make ci`: the code without the sprint must build and pass the tests, 0 errors.

### R4: Update the registries

Update only the documents that already exist (a `/l1-fast` reservation has none besides the roadmap row). Delete nothing and use the real dates.

1. `docs/sprints/SPRINT-NN-<slug>/README.md` — sprint status `❌ rejected`, and `❌ rejected` for every task `TASK-NN.MM`, closed ones included: their code is rolled back. In the "Sprint Outcome", the reason and the list of reverted commits.
2. `docs/backlog.md` — the same statuses for `SPRINT-NN` and its tasks; for `FEAT-NNN` in Table 1 and Section 2, the choice from the card: `❌ rejected` or `📋 in-backlog` (keep the `SPRINT-NN` link as history).
3. `docs/ideas.md` — if `FEAT-NNN` is rejected and `IDEA-NNN` has no other features in progress, set the idea back to `📋 unrealized` and add the reason to its card.
4. `docs/roadmap.md` — remove the `SPRINT-NN` row from `Delivery Queue` and put the next sprint at `1 (CURRENT)` (`—` if the queue is empty), update "Active Pointer" and add a row to "5. Roadmap Changelog": `SPRINT-NN` (`FEAT-NNN` ← `IDEA-NNN`) rejected, the reason, the reverted commits.

### R5: Commit the rejection and check yourself

1. Commit the rollback and the registries in one commit: `revert(<scope>): reject SPRINT-NN`, with the reason and the reverted commits in the body. Stage only your own files, by path (`git add <path>`): the rolled-back code and the updated registries. Leave other changes as they are, such as a spec from another tab.
2. Push only if the user asked or the project does so (`l1dder/rules/30-tech-stack.mdc`).
3. Go through the checklist and tell the user what was rolled back, which sprint is now at `1 (CURRENT)` and what happened to the feature and the idea:
   - [ ] The "ok" on the card came before the rollback?
   - [ ] Only the commits from the card were reverted, history was not rewritten, `make ci` is green?
   - [ ] The sprint documents are in place, with status `❌ rejected` and the reason?
   - [ ] `SPRINT-NN` is gone from `Delivery Queue`, the roadmap history has its row, the feature and idea statuses match?
