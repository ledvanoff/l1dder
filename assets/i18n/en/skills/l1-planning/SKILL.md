---
name: l1-planning
description: Updates the L1DDER Roadmap (docs/roadmap.md — Single Source of Truth), assigns SPRINT-NN and TASK-NN.01..99 IDs to feature steps FEAT-NNN.01..99, updates docs/backlog.md and docs/specs/FEAT-NNN/tasks.md, and creates docs/sprints/SPRINT-NN-<slug>/README.md. Use when the user invokes /l1-planning.
---

# L1DDER — Flow 3: Roadmap Planning (`/l1-planning`)

> **MODEL INSTRUCTION:** Execute strictly step by step (1 → 2 → 3 → 4 → 5). `docs/roadmap.md` is the Single Source of Truth. Never modify files before receiving `"ok"` at Step 3.

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
