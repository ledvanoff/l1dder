# 🔍 2. Deep Dive into All `L1DDER` Flows

> ⬅️ Back to [Quickstart (01-QUICKSTART.md)](./01-QUICKSTART.md) | ➡️ Next: [One-Page Cheatsheet (03-CHEATSHEET.md)](./03-CHEATSHEET.md)

---

## 🧭 Button 0: `/l1-onboard` — Project Onboarding & Stack Setup
Run once after `npx l1dder init`. Detects `from-scratch` or `existing-code` mode, configures `l1dder/rules/30-tech-stack.mdc` and `Makefile`, syncs agent rules, and creates `docs/concept/`, `docs/ideas.md`, `docs/backlog.md`, and `docs/roadmap.md`.

---

## 💡 Button 1: `/l1-idea` — Idea Birth & Refinement

```mermaid
sequenceDiagram
    actor U as 👤 You
    participant A as 🤖 Agent (/l1-idea)
    participant F as 📁 docs/ideas.md

    U->>A: /l1-idea [raw thought]
    A->>F: Reads Idea Bank, checks duplicates, computes IDEA-NNN
    A-->>U: ❓ Grilling questions + ➡️ Recommendation + Draft IDEA-NNN (⛔ STOP)
    U->>A: "ok"
    A->>F: Writes IDEA-NNN with status "📋 unrealized"
```

---

## 📐 Button 2: `/l1-feature` — Feature Specification & Backlog Slicing

```mermaid
sequenceDiagram
    actor U as 👤 You
    participant A as 🤖 Agent (/l1-feature)
    participant S as 📁 docs/specs/FEAT-NNN/
    participant B as 📋 docs/backlog.md
    participant I as 📁 docs/ideas.md

    U->>A: /l1-feature IDEA-001
    A->>I: Reads IDEA-001
    A-->>U: Draft Spec FEAT-001 (Requirements + Deep Modules/Seams + Steps FEAT-001.01..99) (⛔ STOP)
    U->>A: "ok"
    A->>S: Creates requirements.md, design.md, tasks.md
    A->>B: Logs FEAT-001 ("📋 in-backlog")
    A->>I: Updates IDEA-001 to "🚧 in-progress"
```

---

## 🔒 Button 3: `/l1-planning` — Roadmap Scheduling (Source of Truth)

```mermaid
flowchart LR
    I[("💡 Idea Bank<br/>docs/ideas.md")] --> P["🤖 /l1-planning"]
    B[("📋 Backlog<br/>docs/backlog.md")] --> P
    P -->|"After your 'ok'"| R[("🔒 ROADMAP (docs/roadmap.md)<br/>1. Delivery Queue (SPRINT-NN)<br/>2. Discovery Queue (IDEA-NNN)")]
    P -->|"Creates sprint"| SP["📁 docs/sprints/SPRINT-NN-.../README.md<br/>with TASK-NN.01 .. TASK-NN.99"]
```

---

## ⚙️ Button 4: `/l1-task` — Task Execution & Mandatory `Doctor Checklist`

### Part A: Regular Task (`TASK-NN.01 .. TASK-NN.K`) — Two-Approval Rule

```mermaid
flowchart LR
    classDef stop fill:#FEE2E2,stroke:#DC2626,stroke-width:2px,color:#7F1D1D
    classDef work fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D

    S1["1. PLAN (plan.md)<br/>Goal, ponytail filter,<br/>DoD checks"]:::work
    STOP1(["⛔ STOP #1<br/>You reply 'ok'"]):::stop
    S2["2. CODE & TESTS<br/>Vertical TDD at seams,<br/>Edit → Sanitize → Verify"]:::work
    S3["3. SELF-CHECK<br/>Lint, typecheck, test, build,<br/>ponytail-review"]:::work
    STOP2(["⛔ STOP #2<br/>DoD report + Ponytail skipped/Risk<br/>You reply 'ok'"]):::stop
    S4["4. RECORD (summary.md)<br/>TASK-NN.MM → ✅<br/>across 4 tracker files"]:::work

    S1 --> STOP1 --> S2 --> S3 --> STOP2 --> S4
```

### Part B: 🩺 Mandatory Sprint Finale — `TASK-NN.99` (`Doctor Checklist`)

```mermaid
flowchart TB
    B1["🧹 BLOCK 1: Code & Repo Doctor<br/>• make ci (0 errors)<br/>• Two-axis review (Standards vs Spec)<br/>• ponytail-audit & ponytail-debt"]
    B2["🌐 BLOCK 2: Agent E2E Verification<br/>• Agent launches app & verifies all sprint scenarios"]
    B3["📚 BLOCK 3: Living Docs Sync & Retro<br/>• Updates docs/concept/ & docs/specs/<br/>• Updates l1dder/rules/ & syncs agents"]
    B4["👤 BLOCK 4: Human UAT<br/>• Step-by-step manual testing instructions<br/>• ⛔ STOP #2: waits for your 'ok'"]
    CLOSE["🎉 CASCADING CLOSURE<br/>TASK-NN.99 ✅ → SPRINT-NN ✅ → FEAT-NNN ✅ → IDEA-NNN ✅"]

    B1 --> B2 --> B3 --> B4 -->|"You test & reply 'ok'"| CLOSE
```

---

## 🚑 Button 5: `/l1-hotfix` — Emergency Bug Fix Bypassing Roadmap

```mermaid
flowchart LR
    H1["You type:<br/>/l1-hotfix [bug]"] --> H2["1. RED Gate (diagnosing-bugs)<br/>Reproduce with failing test first"]
    H2 --> H3["2. Brief plan in chat<br/>⛔ STOP: You reply 'ok'"]
    H3 --> H4["3. Minimal fix (ponytail)<br/>Test turns GREEN + make ci"]
    H4 --> H5["4. Log HOTFIX-001<br/>in docs/backlog.md"]
```
