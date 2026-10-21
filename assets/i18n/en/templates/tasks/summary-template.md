# Summary: TASK-NN.MM — [Task Title]

> **MODEL INSTRUCTION:** Create this file only after receiving the second `"ok"` from the user. Complete all rows in the Task Passport and verify every item in Section 5.

| Task Passport Field | Value |
|---------------------|-------|
| **Sprint Task ID** | `TASK-NN.MM` (e.g., `TASK-01.01` or `TASK-01.99`) |
| **Spec Step ID** | `FEAT-NNN.MM` ([`docs/specs/FEAT-NNN-<slug>/tasks.md`](../../../../specs/FEAT-NNN-<slug>/tasks.md)) |
| **Parent Sprint ID** | [`SPRINT-NN`](../../README.md) |
| **Parent Feature / Spec ID** | [`FEAT-NNN`](../../../../backlog.md#feat-nnn) ([`docs/specs/FEAT-NNN-<slug>/`](../../../../specs/FEAT-NNN-<slug>/)) |
| **Parent Idea ID** | [`IDEA-NNN`](../../../../ideas.md#idea-nnn) |
| **Task Plan** | [`plan.md`](./plan.md) |
| **Task Status** | `✅ realized` |
| **Closed Date** | YYYY-MM-DD |

---

## 1. What Was Implemented

- `path/to/artifact` — [description of changes]

---

## 2. Deviations from Plan & Decisions

[Any changes from `plan.md` and whether they affect `docs/concept/` or `docs/specs/`.]

---

## 3. DoD Verification Results

| # | Criterion from `plan.md` | Result |
|---|--------------------------|:------:|
| 1 | [Criterion 1] | ✅ |
| 2 | Linter & typecheck (`make lint && make typecheck`) | ✅ |
| 3 | Tests & build (`make test && make build`) | ✅ |

---

## 4. Mandatory ID Chain Tracker Sync Checklist (Exit Gate)

- [ ] **1. `docs/sprints/SPRINT-NN-<slug>/README.md`:** `TASK-NN.MM` (`FEAT-NNN.MM`) set to `✅ realized` with link to `summary.md`.
- [ ] **2. `docs/specs/FEAT-NNN-<slug>/tasks.md`:** `[x]` checked on `FEAT-NNN.MM`.
- [ ] **3. `docs/backlog.md`:** `FEAT-NNN.MM` / `TASK-NN.MM` set to `✅ realized` with link to `summary.md`.
- [ ] **4. `docs/roadmap.md`:** task progress counter updated on `SPRINT-NN`.
- [ ] **5. (Only when closing final task `TASK-NN.99`):** cascaded `✅ realized` to `SPRINT-NN`, `FEAT-NNN`, and `IDEA-NNN`.
