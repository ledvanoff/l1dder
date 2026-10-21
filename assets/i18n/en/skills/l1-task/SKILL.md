---
name: l1-task
description: Executes the next scheduled task TASK-NN.MM from the active sprint in docs/roadmap.md following the L1DDER 4-phase workflow (Plan -> Implement with codebase-design & vertical TDD at seams -> Self-check -> Summary), including the mandatory final Sprint Hygiene & Doctor Checklist task (TASK-NN.99: two-axis code-review, Agent E2E, Living Docs Sync, retro, and Human UAT). Use when the user invokes /l1-task.
---

# L1DDER — Flow 4: Task Execution & Sprint Hygiene (`/l1-task`)

> **MODEL INSTRUCTION:** Execute strictly step by step. Every task has **TWO MANDATORY STOPS**:
> - `⛔ STOP #1` — after creating `plan.md` (before writing any code).
> - `⛔ STOP #2` — after running DoD self-check / preparing Human UAT (before creating `summary.md` and closing the task).

---

## STEP 0: Verify `Roadmap Gate` & Active ID Chain

1. Read `docs/roadmap.md` and `docs/backlog.md`.
2. Inspect row **`1 (CURRENT)`** in `2. Delivery Queue` of `docs/roadmap.md` and extract:
   - `SPRINT-NN` (e.g., `SPRINT-01`)
   - `FEAT-NNN` (e.g., `FEAT-001`)
   - `IDEA-NNN` (e.g., `IDEA-001`)
3. **`Roadmap Gate` check:** If the user asks to work on a task outside `1 (CURRENT)`, **STOP** and reply: *"By the Roadmap Gate rule, we only execute tasks from the `1 (CURRENT)` sprint in `docs/roadmap.md`. Run `/l1-planning` first to change the queue (or `/l1-hotfix` for an urgent bug)."*
4. Open `docs/sprints/SPRINT-NN-<slug>/README.md` and find the first task with status `📋 planned` (or `🚧 in-progress`). Extract `TASK-NN.MM` and `FEAT-NNN.MM`.
5. Choose the branch:
   - If `TASK-NN.MM` does NOT end with `.99` → follow **BRANCH A (Regular Task)**.
   - If `TASK-NN.MM` is `TASK-NN.99` → follow **BRANCH B (Mandatory Sprint Finale: `Doctor Checklist`)**.

---

## BRANCH A: Regular Task (`TASK-NN.01 .. TASK-NN.K`)

### Phase A.1 — Planning (`Plan`) + `⛔ STOP #1`
1. Read `docs/specs/FEAT-NNN-<slug>/{requirements,design,tasks}.md` (check `Pre-agreed Test Seams` in `design.md`).
2. Read `l1dder/rules/40-skills-router.mdc` and read the required skills (`l1dder/skills/ponytail/SKILL.md` + stack skills).
3. Create `docs/sprints/SPRINT-NN-<slug>/tasks/TASK-NN.MM-<slug>/plan.md` from `l1dder/templates/tasks/plan-template.md` with all 5 IDs in the Passport (`TASK-NN.MM`, `FEAT-NNN.MM`, `SPRINT-NN`, `FEAT-NNN`, `IDEA-NNN`).
4. ⛔ **STOP #1:** Show the plan in chat and ask: *"Plan for `TASK-NN.MM` is ready. Start implementation (ok / edits)?"* Do not write code before `"ok"`.

### Phase A.2 — Implementation (`Implement`: `ponytail` + `codebase-design` + `tdd`) *(ONLY after first `"ok"`)*
1. Set status of `TASK-NN.MM` to `🚧 in-progress` in `docs/sprints/SPRINT-NN-<slug>/README.md` and `docs/backlog.md` (and set `SPRINT-NN` / `FEAT-NNN` to `🚧 in-progress` if this is the first task).
2. Modify only files listed in `Artifacts / Scope` of `plan.md`:
   - Build Deep Modules (`codebase-design`) with minimal code (`ponytail`).
   - Follow vertical TDD slices at public seams (`1 seam → 1 RED test → minimal GREEN code`).
3. Run `Edit → Sanitize → Verify` (`make lint`, `make typecheck`, `make test`).

### Phase A.3 — Self-Check (`Self-check` + `ponytail-review`) + `⛔ STOP #2`
1. Run all DoD verification commands from `plan.md` (`make lint && make typecheck && make test && make build`).
2. Review your diff against `l1dder/skills/ponytail-review/SKILL.md`.
3. ⛔ **STOP #2:** Present the DoD results table in chat, ending with the **mandatory 2-line `ponytail` footer**:
   - **Ponytail skipped:** `[1 line]`
   - **Risk:** `[1 line]`
   Ask: *"Self-check for `TASK-NN.MM` passed. Record `summary.md` and close the task (ok / feedback)?"*

### Phase A.4 — Confirm & Record *(ONLY after second `"ok"`)*
1. Create `docs/sprints/SPRINT-NN-<slug>/tasks/TASK-NN.MM-<slug>/summary.md` from `l1dder/templates/tasks/summary-template.md`.
2. **Update task status to `✅ realized` across 4 files:**
   - **File 1 (`docs/sprints/SPRINT-NN-<slug>/README.md`):** set `TASK-NN.MM` to `✅ realized` with link to `summary.md`.
   - **File 2 (`docs/specs/FEAT-NNN-<slug>/tasks.md`):** mark `[x]` on `FEAT-NNN.MM`.
   - **File 3 (`docs/backlog.md`):** set `FEAT-NNN.MM` / `TASK-NN.MM` to `✅ realized` with link to `summary.md`.
   - **File 4 (`docs/roadmap.md`):** increment the task progress counter on `SPRINT-NN`.
3. Announce the next task ID in the sprint.

---

## BRANCH B: Mandatory Final Sprint Task `TASK-NN.99` (`Doctor Checklist`)

### Phase B.1 — Doctor Plan (`Plan`) + `⛔ STOP #1`
1. Create `docs/sprints/SPRINT-NN-<slug>/tasks/TASK-NN.99-doctor/plan.md` from `l1dder/templates/tasks/doctor-checklist-template.md` with all 5 IDs.
2. ⛔ **STOP #1:** Show the Doctor Checklist plan and wait for `"ok"`.

### Phase B.2 & B.3 — Execute All 4 `Doctor Checklist` Blocks + `⛔ STOP #2` *(after first `"ok"`)*
1. **Block 1 (Code & Repo Doctor + Two-Axis `code-review`):**
   - Run `make ci` (0 errors).
   - Perform **Two-Axis Review**: **Axis 1 (`Standards`):** `10-conventions.mdc`, `30-tech-stack.mdc`, `ponytail-audit`; **Axis 2 (`Spec`):** verify every acceptance criterion in `docs/specs/FEAT-NNN-<slug>/requirements.md`.
   - Harvest `shortcut:` markers via `l1dder/skills/ponytail-debt/SKILL.md`.
2. **Block 2 (Agent E2E Verification):**
   - Run `make test-e2e` and verify all user scenarios of `FEAT-NNN` in a live environment/browser.
3. **Block 3 (Mandatory Living Docs Sync + `retro`):**
   - Check and update `docs/concept/*` (`vision.md`, `architecture.md`, `data-model.md`, `integrations.md`, `api-contracts.md`) and `l1dder/GLOSSARY.md`.
   - Check and update `docs/specs/FEAT-NNN-<slug>/{requirements,design,tasks}.md` to match the actual implementation.
   - **Agent Environment Retro (`retro`):** update `l1dder/rules/*.mdc` (and run `npx l1dder sync`), `Makefile`, or `docs/adrs/`.
4. **Block 4 (Human UAT Guide):**
   - Write a step-by-step manual testing guide for the human.
5. ⛔ **STOP #2:** Show the Block 1–3 report + Human UAT guide and ask: *"Please test sprint `SPRINT-NN` using the steps above and reply 'ok' (or share feedback to fix)."*

### Phase B.4 — Cascading Closure Across 6 Files *(ONLY after human `"ok"` on Human UAT)*
1. **File 1 (`summary.md`):** Create `docs/sprints/SPRINT-NN-<slug>/tasks/TASK-NN.99-doctor/summary.md`.
2. **File 2 (`docs/sprints/SPRINT-NN-<slug>/README.md`):** Mark `TASK-NN.99` and `SPRINT-NN` as `✅ realized` and fill in Sprint Summary.
3. **File 3 (`docs/specs/FEAT-NNN-<slug>/tasks.md` & `requirements.md`):** Mark `[x]` on `FEAT-NNN.99`; if all sprints of `FEAT-NNN` are done, set `requirements.md` status to `✅ realized`.
4. **File 4 (`docs/backlog.md`):** Mark `TASK-NN.99` and `SPRINT-NN` (and `FEAT-NNN` if complete) as `✅ realized`.
5. **File 5 (`docs/roadmap.md`):** Move `SPRINT-NN` from `Delivery Queue` to `4. Completed Sprints` and promote the next sprint to `1 (CURRENT)`.
6. **File 6 (`docs/ideas.md`):** If all features linked to parent `IDEA-NNN` are `✅ realized`, set `IDEA-NNN` status to `✅ realized`.
