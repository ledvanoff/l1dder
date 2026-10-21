# Roadmap (Single Source of Truth) — [Project Name]

> **Methodology:** L1DDER
> **Control Skills:** `/l1-planning` (scheduling queues) and `/l1-task` (updating progress and closing sprints).
> **Document Status:** 🔒 **Single Source of Truth** for work ordering.
> **`Roadmap Gate` Rule:** It is forbidden to run `/l1-task` for any feature or sprint that is not at row **`1 (CURRENT)`** in `Delivery Queue` below. Reordering must happen **first** here via `/l1-planning`. The only exception is `/l1-hotfix`.
> **Linked Registries:** [Idea Bank (`docs/ideas.md`)](./ideas.md) | [Backlog & Task Tracker (`docs/backlog.md`)](./backlog.md)
> **Last Updated:** YYYY-MM-DD

---

## 1. Active Pointer

| Stream | Active ID | Title | Status | Next Command |
|--------|:---------:|-------|--------|--------------|
| **Delivery (Implementation)** | `SPRINT-01` (`FEAT-001` ← `IDEA-001`) | [Sprint Title] | `🚧 in-progress` | `/l1-task` |
| **Discovery (Spec Grooming)** | `IDEA-002` | [Idea Title] | `📋 unrealized` | `/l1-feature IDEA-002` |

---

## 2. Delivery Queue (Sprints & Features)

> Defines strict execution order for `/l1-task`. Every `SPRINT-NN` ends with mandatory task `TASK-NN.99` (`Doctor Checklist`).

| Queue | Sprint ID | Feature ID (`FEAT-NNN`) | Idea ID (`IDEA-NNN`) | Priority | Sprint Goal | Task Progress | Sprint Status | Sprint Doc |
|:-----:|:---------:|:-----------------------:|:--------------------:|:--------:|-------------|:-------------:|---------------|------------|
| **1 (CURRENT)** | `SPRINT-01` | [`FEAT-001`](./backlog.md#feat-001) | [`IDEA-001`](./ideas.md#idea-001) | P0 | [One-line sprint goal] | `0/2` (+ `TASK-01.99`) | 🚧 in-progress | [`SPRINT-01`](./sprints/SPRINT-01-<slug>/README.md) |
| **2 (NEXT)** | `SPRINT-02` | [`FEAT-002`](./backlog.md#feat-002) | [`IDEA-002`](./ideas.md#idea-002) | P1 | [One-line sprint goal] | `0/2` (+ `TASK-02.99`) | 📋 planned | [`SPRINT-02`](./sprints/SPRINT-02-<slug>/README.md) |

---

## 3. Discovery Queue (`IDEA-NNN` → `/l1-feature`)

| Queue | Idea ID (`IDEA-NNN`) | Idea Title | Priority | Idea Status | Notes |
|:-----:|:--------------------:|------------|:--------:|-------------|-------|
| **1** | [`IDEA-002`](./ideas.md#idea-002) | [Idea Title] | P1 | 📋 unrealized | Next for `/l1-feature IDEA-002` |
| **2** | [`IDEA-003`](./ideas.md#idea-003) | [Idea Title] | P2 | 📋 unrealized | After `IDEA-002` |

---

## 4. Completed Sprints (Delivery Archive)

| Sprint ID | Feature ID (`FEAT-NNN`) | Idea ID (`IDEA-NNN`) | Delivered Value | Final `TASK-NN.99` (Doctor) | Closed Date |
|:---------:|:-----------------------:|:--------------------:|-----------------|:---------------------------:|:-----------:|
| — | — | — | — | — | — |

---

## 5. Roadmap Changelog

| Date | Changes (Sprint / Feature / Idea IDs) | Reason |
|------|---------------------------------------|--------|
| YYYY-MM-DD | Roadmap initialized (`SPRINT-01` for `FEAT-001` ← `IDEA-001`) | Project start |
