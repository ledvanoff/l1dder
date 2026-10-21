# TASK-NN.MM: [Task Title] — Plan

> **MODEL INSTRUCTION:** The task folder must be named `docs/sprints/SPRINT-NN-<slug>/tasks/TASK-NN.MM-<slug>/`. Fill all rows of the Task Passport table. After creating this file, stop (`⛔ STOP #1`) and wait for `"ok"` from the user.

| Task Passport Field | Value |
|---------------------|-------|
| **Sprint Task ID** | `TASK-NN.MM` (e.g., `TASK-01.01`) |
| **Spec Step ID** | `FEAT-NNN.MM` ([`docs/specs/FEAT-NNN-<slug>/tasks.md`](../../../../specs/FEAT-NNN-<slug>/tasks.md)) |
| **Parent Sprint ID** | [`SPRINT-NN`](../../README.md) |
| **Parent Feature / Spec ID** | [`FEAT-NNN`](../../../../backlog.md#feat-nnn) ([`docs/specs/FEAT-NNN-<slug>/`](../../../../specs/FEAT-NNN-<slug>/)) |
| **Parent Idea ID** | [`IDEA-NNN`](../../../../ideas.md#idea-nnn) |
| **Task Type** | `feat` / `fix` / `chore` / `docs` / `refactor` |
| **Task Status** | `📋 planned` → `🚧 in-progress` → `✅ realized` |
| **Git Branch** | `<type>/<scope>-TASK-NN.MM-<short>` |
| **Skills Read (`40-skills-router.mdc`)** | `ponytail`, `[list of skills read via Read]` |

---

## 1. Goal & `ponytail` Filter (6-Step Decision Ladder)

**Goal:** [One sentence describing what is delivered by `TASK-NN.MM`.]

**`ponytail` Filter:**
- **Reused from repo / platform / installed packages:** `[modules, stdlib, or packages]`
- **Deliberately skipped (`Ponytail skipped` / YAGNI):** `[wrappers, options, or abstractions avoided]`
- **Pre-agreed Test Seams:** `[public interface under test]`

---

## 2. Step-by-Step Checklist

- [ ] Step 1: [Concrete change]
- [ ] Step 2: Write / update seam tests
- [ ] Step 3: Run DoD checks + `ponytail-review` diff audit
- [ ] ⛔ **STOP #2:** Present DoD report + mandatory 2-line `ponytail` footer (`Ponytail skipped` / `Risk`) and wait for `"ok"`
- [ ] Step 4 (after second `"ok"`): Create `summary.md` and update `TASK-NN.MM` (`FEAT-NNN.MM`) to `✅ realized` across 4 files (`SPRINT README.md`, `tasks.md`, `docs/backlog.md`, `docs/roadmap.md`)

---

## 3. Definition of Done (DoD)

| # | Criterion | Exact Verification Command |
|---|-----------|----------------------------|
| 1 | [Functional criterion 1] | `[command or check]` |
| 2 | Linter & typecheck pass with 0 errors | `make lint && make typecheck` |
| 3 | Tests & build pass with 0 errors | `make test && make build` |

---

## 4. Artifacts & Scope Boundaries

**In Scope (files created or modified):**
- `path/to/file` — [reason]

**Out of Scope (untouched):**
- [adjacent modules not touched in this task]
