# Backlog & Task Tracker — [Project Name]

> **Methodology:** L1DDER
> **Control Skills:** populated via `/l1-feature`, scheduled into sprints via `/l1-planning`, task statuses updated via `/l1-task` and `/l1-hotfix`.
> **Ordering Source of Truth:** [`docs/roadmap.md`](./roadmap.md)
> **Last Updated:** YYYY-MM-DD

---

## ID & Status Reference (Copy Character-for-Character)

**End-to-End ID Chain:**
`IDEA-NNN` (`docs/ideas.md`) → `FEAT-NNN` (`docs/backlog.md` + `docs/specs/FEAT-NNN-<slug>/`) → Spec Step `FEAT-NNN.MM` → Sprint `SPRINT-NN` (`docs/roadmap.md` + `docs/sprints/SPRINT-NN-<slug>/`) → Sprint Task `TASK-NN.MM`.

**Feature Statuses (`FEAT-NNN`):**
- `📝 drafting` | `📋 in-backlog` | `🗓 scheduled` | `🚧 in-progress` | `✅ realized` | `❌ rejected`

**Sprint (`SPRINT-NN`), Step (`FEAT-NNN.MM`), and Task (`TASK-NN.MM`) Statuses:**
- `📋 planned` | `🚧 in-progress` | `✅ realized` | `⏸ paused` | `❌ rejected`

---

## 1. Feature Registry (Feature Backlog)

| Feature / Spec ID | Feature Title | Idea ID (`IDEA-NNN`) | Priority | Status | Spec Folder | Sprints (`SPRINT-NN`) |
|-------------------|---------------|:--------------------:|:--------:|--------|-------------|-----------------------|
| [`FEAT-001`](#feat-001) | [Feature 1 Title] | [`IDEA-001`](./ideas.md#idea-001) | P0 | 🗓 scheduled | [`FEAT-001`](./specs/FEAT-001-<slug>/) | [`SPRINT-01`](./sprints/SPRINT-01-<slug>/README.md) |
| [`FEAT-002`](#feat-002) | [Unscheduled Feature Title] | [`IDEA-002`](./ideas.md#idea-002) | P1 | 📋 in-backlog | [`FEAT-002`](./specs/FEAT-002-<slug>/) | — *(unassigned)* |

---

## 2. Feature Decomposition, Sprints & Tasks (Task Tracker)

### FEAT-001: [Feature 1 Title] {#feat-001}

| Passport Field | Value |
|----------------|-------|
| **Feature / Spec ID** | `FEAT-001` |
| **Parent Idea** | [`IDEA-001`](./ideas.md#idea-001) |
| **Spec Folder** | [`docs/specs/FEAT-001-<slug>/`](./specs/FEAT-001-<slug>/) |
| **Priority** | `P0` |
| **Feature Status** | `🗓 scheduled` |
| **Assigned Sprints** | `SPRINT-01` |

#### Sprint: `SPRINT-01` — [Sprint Title] (`📋 planned`)
- **Sprint ID:** `SPRINT-01` (before `/l1-planning` write: `Sprint Candidate 1 (SPRINT-??)`)
- **Parent IDs:** `FEAT-001` → `IDEA-001`
- **Sprint Goal:** [One sentence describing delivered value]
- **Sprint Document:** [`docs/sprints/SPRINT-01-<slug>/README.md`](./sprints/SPRINT-01-<slug>/README.md)

| Spec Step ID | Sprint Task ID | Task Title | Type | Status | Plan | Summary |
|:------------:|:--------------:|------------|:----:|--------|------|---------|
| `FEAT-001.01` | `TASK-01.01` | [Task 1 Title] | `feat` | 📋 planned | [plan](./sprints/SPRINT-01-<slug>/tasks/TASK-01.01-<slug>/plan.md) | — |
| `FEAT-001.02` | `TASK-01.02` | [Task 2 Title] | `feat` | 📋 planned | — | — |
| `FEAT-001.99` | `TASK-01.99` | **Sprint Hygiene & Doctor Checklist (E2E + UAT + Docs Sync)** *(Mandatory)* | `chore` | 📋 planned | — | — |

---

## 3. Hotfix Log (`HOTFIX-NNN`)

> Emergency fixes bypassing the Roadmap executed via `/l1-hotfix`.

| Hotfix ID | Linked ID (`FEAT-NNN` / `TASK-NN.MM` or `—`) | Date | Symptom / Problem | Fix Summary | Status | Commit / PR |
|-----------|:--------------------------------------------:|------|-------------------|-------------|--------|:-----------:|
| `HOTFIX-001` | `FEAT-001` / `TASK-01.01` | 2026-10-21 | [Bug symptom] | [What was fixed] | ✅ realized | `fix(core): ...` |
