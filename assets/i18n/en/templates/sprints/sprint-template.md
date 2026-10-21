# SPRINT-NN: [Sprint Title]

> **MODEL INSTRUCTION:** The sprint folder must be named `docs/sprints/SPRINT-NN-<slug>/`. All fields in the Sprint Passport table are mandatory.

| Sprint Passport Field | Value |
|-----------------------|-------|
| **Sprint ID** | `SPRINT-NN` (e.g., `SPRINT-01`) |
| **Parent Feature / Spec ID** | [`FEAT-NNN`](../../backlog.md#feat-nnn) ([`docs/specs/FEAT-NNN-<slug>/`](../../specs/FEAT-NNN-<slug>/)) |
| **Parent Idea ID** | [`IDEA-NNN`](../../ideas.md#idea-nnn) |
| **Roadmap Pointer** | [`docs/roadmap.md`](../../roadmap.md) |
| **Sprint Status** | `📋 planned` \| `🚧 in-progress` \| `✅ realized` |
| **Opened / Closed Date** | YYYY-MM-DD / YYYY-MM-DD |

---

## 1. Sprint Goal

[One sentence describing the complete user value delivered by this sprint.]

---

## 2. Sprint Definition of Done (Sprint DoD)

| # | Criterion | Verification Method |
|---|-----------|---------------------|
| 1 | [Functional criterion 1 from `FEAT-NNN`] | [Command / scenario] |
| 2 | **Doctor Checklist & E2E (`TASK-NN.99`):** `make ci` + full Agent E2E pass | `make ci` + E2E verification |
| 3 | **Living Docs Sync (`TASK-NN.99`):** `docs/concept/`, `docs/specs/`, `l1dder/rules/` updated | `git diff` review |
| 4 | **Human UAT (`TASK-NN.99`):** manual testing passed and approved by human (`"ok"`) | Human approval in `TASK-NN.99` |

---

## 3. Sprint Tasks Table (`TASK-NN.MM` ↔ `FEAT-NNN.MM`)

| Sprint Task ID | Spec Step ID | Task Title | Type | Status | Plan | Summary |
|:--------------:|:------------:|------------|:----:|--------|------|---------|
| `TASK-NN.01` | `FEAT-NNN.01` | [Task 1 Title] | `feat` | 📋 planned | [plan](tasks/TASK-NN.01-<slug>/plan.md) | [summary](tasks/TASK-NN.01-<slug>/summary.md) |
| `TASK-NN.02` | `FEAT-NNN.02` | [Task 2 Title] | `feat` | 📋 planned | [plan](tasks/TASK-NN.02-<slug>/plan.md) | — |
| `TASK-NN.99` | `FEAT-NNN.99` | **Sprint Hygiene & Doctor Checklist (E2E + UAT + Docs Sync)** | `chore` | 📋 planned | [plan](tasks/TASK-NN.99-doctor/plan.md) | — |

---

## 4. Sprint Outcome (Filled after closing `TASK-NN.99`)

- **Delivered for `FEAT-NNN` (`IDEA-NNN`):** [summary]
- **Living Docs Updated (`concept` / `rules` / `specs`):** [files]
