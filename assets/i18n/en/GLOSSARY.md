# Glossary (L1DDER)

Core terms and status models of the **L1DDER** framework in workflow order.

---

## Concept (`docs/concept/`)

Long-term project foundation: what is being built, for whom, and how it is architected (`idea.md`, `vision.md`, `architecture.md`, `data-model.md`, `integrations.md`, `api-contracts.md`).
Created during `/l1-onboard` and **mandatorily synchronized at the end of every sprint** during `TASK-NN.99` (`Doctor Checklist`).

---

## Idea Bank (`docs/ideas.md`) & `IDEA-NNN`

Single registry of all product and technical ideas, managed via **`/l1-idea`**.
Statuses:
- `📋 unrealized` — recorded in the Idea Bank, waiting for `/l1-feature`.
- `🚧 in-progress` — linked to a feature (`FEAT-NNN`) in `docs/backlog.md` and/or active sprints.
- `✅ realized` — all linked features (`FEAT-NNN`) are `✅ realized`.
- `❌ rejected` — rejected (reason recorded in card).

---

## Feature (`FEAT-NNN`) & Specification (`docs/specs/FEAT-NNN-<slug>/`)

A functional unit grown from an `IDEA-NNN` via **`/l1-feature`**:
1. Spec folder `docs/specs/FEAT-NNN-<slug>/` (`requirements.md`, `design.md`, `tasks.md`).
2. Backlog entry in `docs/backlog.md` with statuses:
   - `📝 drafting` → `📋 in-backlog` → `🗓 scheduled` → `🚧 in-progress` → `✅ realized` (or `❌ rejected`).

---

## Backlog & Task Tracker (`docs/backlog.md`)

Operational tracker containing:
1. **Feature Registry (`FEAT-NNN`)**
2. **Feature Decomposition, Sprints & Tasks (`SPRINT-NN` & `TASK-NN.MM`)**
3. **Hotfix Log (`HOTFIX-NNN`)**

---

## Roadmap (`docs/roadmap.md`) & `Roadmap Gate`

**Single Source of Truth** for work ordering, managed via **`/l1-planning`**:
1. **Delivery Queue:** strict execution order for sprints (`SPRINT-NN`).
2. **Discovery Queue:** strict grooming order for ideas (`IDEA-NNN`).

**Roadmap Gate:** no feature or task may be executed in `/l1-task` unless it sits at position `1 (CURRENT)` in `docs/roadmap.md`. The only exception is `/l1-hotfix`.

---

## Sprint (`SPRINT-NN`) & `Doctor Checklist` (`TASK-NN.99`)

An iterative delivery unit stored in `docs/sprints/SPRINT-NN-<slug>/README.md`.
Every sprint **must** end with task **`TASK-NN.99: Sprint Hygiene & Doctor Checklist`** (`tasks/TASK-NN.99-doctor/`) covering 4 blocks:
1. **Code & Repo Doctor** (`make ci` + 2-axis `code-review` + `ponytail-audit` + `ponytail-debt`).
2. **Agent E2E Verification** (`make test-e2e` + live verification).
3. **Living Docs Sync & Retro** (updating `docs/concept/*`, `docs/specs/*`, `l1dder/rules/*.mdc`).
4. **Human UAT** (manual acceptance testing by the human before cascading closure).

---

## Task (`TASK-NN.MM` ↔ `FEAT-NNN.MM`) & Two-Approval Rule

An atomic unit of work inside a sprint executed via **`/l1-task`** with two mandatory stops:
- **STOP #1:** after creating `plan.md` (before writing code).
- **STOP #2:** after running DoD self-check (before writing `summary.md` and closing).

---

## Entity ID Passport (`ID Passport`)

Mandatory header table in every document (`requirements.md`, `design.md`, `tasks.md`, `SPRINT README.md`, `plan.md`, `summary.md`, `ADR`) storing all parent IDs up to `IDEA-NNN` (`TASK-NN.MM → FEAT-NNN.MM → SPRINT-NN → FEAT-NNN → IDEA-NNN`).

---

## Ponytail (`shortcut:`, `Skipped / Risk`) & Deep Modules (`Seams`)

- **Ponytail ([DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)):** 6-Step Decision Ladder, `// shortcut: <what>, <limit>` markers, and mandatory 2-line `Ponytail skipped / Risk` footer.
- **Deep Modules (`codebase-design`) & Pre-agreed Test Seams (`tdd`) ([mattpocock/skills](https://github.com/mattpocock/skills)):** modules hiding complex logic behind simple interfaces, tested via vertical `RED → GREEN` slices at public seams.
