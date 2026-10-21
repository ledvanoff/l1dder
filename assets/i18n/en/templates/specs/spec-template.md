# FEAT-NNN: [Feature Title] — Specification

> **MODEL INSTRUCTION:** The spec folder must be named `docs/specs/FEAT-NNN-<slug>/` (starting with `FEAT-NNN-`). Inside, create 3 files: `requirements.md`, `design.md`, and `tasks.md`, each beginning with the Spec Passport table.

---

# FILE 1: `docs/specs/FEAT-NNN-<slug>/requirements.md`

# FEAT-NNN: [Feature Title] — Requirements

| Passport Field | Value |
|----------------|-------|
| **Feature / Spec ID** | `FEAT-NNN` |
| **Parent Idea (`IDEA-NNN`)** | [`IDEA-NNN`](../../ideas.md#idea-nnn) |
| **Backlog Entry** | [`docs/backlog.md#feat-nnn`](../../backlog.md#feat-nnn) |
| **Priority** | `P0` / `P1` / `P2` / `P3` |
| **Feature Status** | `📝 drafting` \| `📋 in-backlog` \| `🗓 scheduled` \| `🚧 in-progress` \| `✅ realized` |
| **Assigned Sprints** | `SPRINT-NN` (or `—` before `/l1-planning`) |

## 1. Context & Link to `IDEA-NNN`
[2–3 sentences describing the user value.]

## 2. User Stories & Acceptance Criteria

### US-1: [Scenario Title]
**As a** [role] **I want** [action] **So that** [value]
```
GIVEN [precondition]
WHEN  [action]
THEN  [expected observable outcome]
```

## 3. Out of Scope (`ponytail` / YAGNI)
- [Explicitly excluded items]

---

# FILE 2: `docs/specs/FEAT-NNN-<slug>/design.md`

# FEAT-NNN: [Feature Title] — Technical Design

| Passport Field | Value |
|----------------|-------|
| **Feature / Spec ID** | `FEAT-NNN` |
| **Parent Idea (`IDEA-NNN`)** | [`IDEA-NNN`](../../ideas.md#idea-nnn) |
| **Requirements** | [`requirements.md`](./requirements.md) |
| **Task Breakdown** | [`tasks.md`](./tasks.md) |

## 1. Architecture & Data Flow
```mermaid
flowchart LR
    User --> UI
    UI --> CoreModule
    CoreModule --> DataOrStore
```

## 2. Deep Modules & Pre-agreed Test Seams (`codebase-design` & `tdd`)

| Module | Public Interface (`Seam`) | Hidden Depth | Pre-agreed Test Seam |
|--------|---------------------------|--------------|----------------------|
| `[path]` | `[public functions/props]` | `[internal logic]` | `[what behavior is tested here]` |

## 3. Data Model / Contracts
```ts
interface FeatureConfig {
  id: string;
}
```

---

# FILE 3: `docs/specs/FEAT-NNN-<slug>/tasks.md`

# FEAT-NNN: [Feature Title] — Step Breakdown (`FEAT-NNN.MM`)

| Passport Field | Value |
|----------------|-------|
| **Feature / Spec ID** | `FEAT-NNN` |
| **Parent Idea (`IDEA-NNN`)** | [`IDEA-NNN`](../../ideas.md#idea-nnn) |
| **Backlog Entry** | [`docs/backlog.md#feat-nnn`](../../backlog.md#feat-nnn) |

## Sprint (or Sprint Candidate): `SPRINT-NN` — [Sprint Title]

| Done | Spec Step ID | Sprint Task ID (`SPRINT-NN`) | Type | Task Title | Key Artifacts |
|:----:|:------------:|:----------------------------:|:----:|------------|---------------|
| [ ] | `FEAT-NNN.01` | `TASK-NN.01` *(or `—`)* | `feat` | [Atomic Task 1] | `path/to/file` |
| [ ] | `FEAT-NNN.02` | `TASK-NN.02` *(or `—`)* | `feat` | [Atomic Task 2] | `path/to/file` |
| [ ] | `FEAT-NNN.99` | `TASK-NN.99` *(or `—`)* | `chore` | **Sprint Hygiene & Doctor Checklist (E2E + UAT + Docs Sync)** *(Mandatory)* | `docs/`, tests |
