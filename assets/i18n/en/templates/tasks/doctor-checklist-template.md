# TASK-NN.99: Sprint Hygiene & Doctor Checklist — Plan

> **MODEL INSTRUCTION:** Mandatory final task of every sprint `SPRINT-NN` (`docs/sprints/SPRINT-NN-<slug>/tasks/TASK-NN.99-doctor/`). Closing `SPRINT-NN` is forbidden until all 4 blocks are completed and the human replies `"ok"` on Human UAT.

| Task Passport Field | Value |
|---------------------|-------|
| **Sprint Task ID** | `TASK-NN.99` (e.g., `TASK-01.99`) |
| **Spec Step ID** | `FEAT-NNN.99` ([`docs/specs/FEAT-NNN-<slug>/tasks.md`](../../../../specs/FEAT-NNN-<slug>/tasks.md)) |
| **Parent Sprint ID** | [`SPRINT-NN`](../../README.md) |
| **Parent Feature / Spec ID** | [`FEAT-NNN`](../../../../backlog.md#feat-nnn) ([`docs/specs/FEAT-NNN-<slug>/`](../../../../specs/FEAT-NNN-<slug>/)) |
| **Parent Idea ID** | [`IDEA-NNN`](../../../../ideas.md#idea-nnn) |
| **Task Type** | `chore` (Mandatory Sprint Hygiene & Doctor Checklist) |
| **Task Status** | `📋 planned` → `🚧 in-progress` → `✅ realized` |
| **Git Branch** | `chore/sprint-NN-TASK-NN.99-doctor` |

---

## 1. Goal

Perform a complete technical audit of `SPRINT-NN` (`FEAT-NNN` ← `IDEA-NNN`), run full automated & E2E verification, **mandatorily synchronize long-term documentation (`docs/concept/`, `docs/specs/`, `docs/adrs/`, `l1dder/rules/`)**, and hand over a clear Human UAT checklist.

---

## 2. 4 Mandatory Blocks of the Doctor Checklist

### Block 1. Code & Repo Doctor + Two-Axis `code-review`
- [ ] 1.1. Run `make ci` (`lint` + `typecheck` + `test` + `build`) with 0 errors.
- [ ] 1.2. Perform **Two-Axis Review**:
  - [ ] **Axis 1 (`Standards`):** compliance with `10-conventions.mdc`, `30-tech-stack.mdc`, Deep Modules (`codebase-design`), and `ponytail-audit` (0 leftover debug logs, dead files, or memory leaks).
  - [ ] **Axis 2 (`Spec`):** verify every Acceptance Criterion in `docs/specs/FEAT-NNN-<slug>/requirements.md`.
- [ ] 1.3. Harvest technical debt via **`ponytail-debt`** (`(#|//) ?(shortcut|ponytail):`) and ensure 0 `[no-trigger]` markers remain.

### Block 2. Agent E2E Verification
- [ ] 2.1. Run `make test-e2e` (if present).
- [ ] 2.2. Walk through all user scenarios of `FEAT-NNN` in a live environment/browser with 0 console/runtime errors.

### Block 3. Mandatory Living Docs Sync & `retro`
- [ ] 3.1. Update `docs/concept/{idea,vision,architecture,data-model,integrations,api-contracts}.md` and `l1dder/GLOSSARY.md`.
- [ ] 3.2. Update `docs/specs/FEAT-NNN-<slug>/{requirements,design,tasks}.md` to match the actual implementation.
- [ ] 3.3. Update `docs/adrs/` and `l1dder/rules/*.mdc` (and run `npx l1dder sync`) based on sprint lessons (`retro`).

### Block 4. Human UAT & Cascading Closure
- [ ] 4.1. Present the Block 1–3 report and step-by-step Human UAT instructions at `⛔ STOP #2`.
- [ ] 4.2. After human `"ok"`, cascade `✅ realized` across all 6 files (`summary.md`, `SPRINT README.md`, `tasks.md`, `docs/backlog.md`, `docs/roadmap.md`, `docs/ideas.md`).
